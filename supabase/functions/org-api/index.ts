import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrgNode {
  id: string
  title: string
  person_title: string | null
  person_name: string | null
  description: string | null
  category: string
  language: string
  status: string
  parent_id: string | null
  order: number
  is_collapsed: boolean
  color_index: number
  created_at: string
  updated_at: string
}

interface TreeNode {
  id: string
  title: string
  personTitle: string | null
  personName: string | null
  category: string
  language: string
  status: string
  order: number
  children: TreeNode[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cacheHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300',
}

function jsonResponse(data: unknown, meta: Record<string, unknown> = {}, status = 200) {
  return new Response(JSON.stringify({ data, meta }), {
    status,
    headers: cacheHeaders,
  })
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: cacheHeaders,
  })
}

function parseContact(description: string | null): {
  phone: string | null
  email: string | null
  notes: string | null
} {
  if (!description) return { phone: null, email: null, notes: null }
  const parts = description.split('|').map((p) => p.trim()).filter(Boolean)
  const phone =
    parts.find(
      (p) => /^\(?[\d\s\u200e\u200f)‭‬-]+$/.test(p) || /^\(?\d{3}/.test(p),
    ) || null
  const emails = parts.filter((p) => /@/.test(p))
  const email = emails[0] || null
  const notes =
    parts.filter((p) => p !== phone && !emails.includes(p)).join(' | ') || null
  return { phone, email, notes }
}

// ---------------------------------------------------------------------------
// Data fetching (single query, compute in memory)
// ---------------------------------------------------------------------------

async function fetchAllNodes(): Promise<OrgNode[]> {
  const { data, error } = await supabase
    .from('org_nodes')
    .select('*')
    .order('order', { ascending: true })

  if (error) throw new Error(`Database error: ${error.message}`)
  return data as OrgNode[]
}

function buildMaps(nodes: OrgNode[]) {
  const byId = new Map<string, OrgNode>()
  const childrenOf = new Map<string, OrgNode[]>()

  for (const n of nodes) {
    byId.set(n.id, n)
    const parentKey = n.parent_id ?? '__root__'
    if (!childrenOf.has(parentKey)) childrenOf.set(parentKey, [])
    childrenOf.get(parentKey)!.push(n)
  }

  // Sort children by order
  for (const children of childrenOf.values()) {
    children.sort((a, b) => a.order - b.order)
  }

  return { byId, childrenOf }
}

function getBreadcrumb(node: OrgNode, byId: Map<string, OrgNode>): string[] {
  const crumbs: string[] = []
  let current = node.parent_id ? byId.get(node.parent_id) : undefined
  while (current) {
    crumbs.unshift(current.title)
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }
  return crumbs
}

function findAncestorByCategory(
  node: OrgNode,
  category: string,
  byId: Map<string, OrgNode>,
): string | null {
  let current = node.parent_id ? byId.get(node.parent_id) : undefined
  while (current) {
    if (current.category === category) return current.title
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }
  return null
}

// ---------------------------------------------------------------------------
// Tree builder
// ---------------------------------------------------------------------------

function buildTree(
  parentId: string | null,
  childrenOf: Map<string, OrgNode[]>,
  depth: number,
  maxDepth: number,
  includeVacant: boolean,
): TreeNode[] {
  if (maxDepth > 0 && depth >= maxDepth) return []

  const key = parentId ?? '__root__'
  const children = childrenOf.get(key) || []

  return children
    .filter((n) => includeVacant || n.status !== 'vacant')
    .map((n) => ({
      id: n.id,
      title: n.title,
      personTitle: n.person_title,
      personName: n.person_name,
      category: n.category,
      language: n.language,
      status: n.status,
      order: n.order,
      children: buildTree(n.id, childrenOf, depth + 1, maxDepth, includeVacant),
    }))
}

// ---------------------------------------------------------------------------
// Person transform
// ---------------------------------------------------------------------------

function transformPerson(
  node: OrgNode,
  byId: Map<string, OrgNode>,
  childrenOf: Map<string, OrgNode[]>,
  includeDirectReports = false,
) {
  const contact = parseContact(node.description)
  const breadcrumb = getBreadcrumb(node, byId)
  const department = findAncestorByCategory(node, 'department', byId)
  const ministry = findAncestorByCategory(node, 'ministry-system', byId)

  const person: Record<string, unknown> = {
    id: node.id,
    title: node.title,
    personTitle: node.person_title,
    personName: node.person_name,
    category: node.category,
    language: node.language,
    status: node.status,
    parentId: node.parent_id,
    order: node.order,
    phone: contact.phone,
    email: contact.email,
    notes: contact.notes,
    department,
    ministry,
    breadcrumb,
    createdAt: node.created_at,
    updatedAt: node.updated_at,
  }

  if (includeDirectReports) {
    const directChildren = childrenOf.get(node.id) || []
    person.directReports = directChildren
      .filter((c) => c.person_name)
      .map((c) => ({
        id: c.id,
        title: c.title,
        personTitle: c.person_title,
        personName: c.person_name,
        category: c.category,
        status: c.status,
      }))
  }

  return person
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handlePeople(url: URL) {
  const nodes = await fetchAllNodes()
  const { byId, childrenOf } = buildMaps(nodes)

  const language = url.searchParams.get('language')
  const category = url.searchParams.get('category')
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')?.toLowerCase()

  let people = nodes.filter((n) => n.person_name && n.person_name.trim() !== '')

  if (language) people = people.filter((n) => n.language === language)
  if (category) people = people.filter((n) => n.category === category)
  if (status) people = people.filter((n) => n.status === status)
  if (search) {
    people = people.filter(
      (n) =>
        n.person_name?.toLowerCase().includes(search) ||
        n.title?.toLowerCase().includes(search) ||
        n.description?.toLowerCase().includes(search),
    )
  }

  const data = people.map((n) => transformPerson(n, byId, childrenOf))

  return jsonResponse(data, { total: data.length })
}

async function handlePersonById(id: string) {
  const nodes = await fetchAllNodes()
  const { byId, childrenOf } = buildMaps(nodes)

  const node = byId.get(id)
  if (!node) return errorResponse('Person not found', 404)
  if (!node.person_name || node.person_name.trim() === '') {
    return errorResponse('Node is not a person', 404)
  }

  const person = transformPerson(node, byId, childrenOf, true)
  return jsonResponse(person)
}

async function handleTree(url: URL) {
  const nodes = await fetchAllNodes()
  const { byId, childrenOf } = buildMaps(nodes)

  const rootId = url.searchParams.get('root')
  const depth = parseInt(url.searchParams.get('depth') || '0', 10)
  const includeVacant = url.searchParams.get('includeVacant') !== 'false'

  // If a root ID is specified, verify it exists
  if (rootId && !byId.has(rootId)) {
    return errorResponse('Root node not found', 404)
  }

  const tree = buildTree(rootId ?? null, childrenOf, 0, depth, includeVacant)

  return jsonResponse(tree, {
    totalNodes: nodes.length,
    rootId: rootId ?? null,
    depth: depth || 'unlimited',
    includeVacant,
  })
}

async function handleMinistries() {
  const nodes = await fetchAllNodes()
  const { childrenOf } = buildMaps(nodes)

  const ministries = nodes.filter((n) => n.category === 'ministry-system')

  const data = ministries.map((m) => {
    const departments = (childrenOf.get(m.id) || []).filter(
      (c) => c.category === 'department',
    )

    // Count people in this ministry (recursively)
    function countPeople(nodeId: string): number {
      const children = childrenOf.get(nodeId) || []
      let count = 0
      for (const c of children) {
        if (c.person_name && c.person_name.trim() !== '') count++
        count += countPeople(c.id)
      }
      return count
    }

    return {
      id: m.id,
      title: m.title,
      language: m.language,
      status: m.status,
      departmentCount: departments.length,
      peopleCount: countPeople(m.id),
      departments: departments.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        peopleCount: countPeople(d.id),
      })),
    }
  })

  return jsonResponse(data, { total: data.length })
}

async function handleDepartments() {
  const nodes = await fetchAllNodes()
  const { byId, childrenOf } = buildMaps(nodes)

  const departments = nodes.filter((n) => n.category === 'department')

  const data = departments.map((d) => {
    const ministry = findAncestorByCategory(d, 'ministry-system', byId)

    // Collect people recursively under this department
    function collectPeople(nodeId: string): Array<{
      id: string
      title: string
      personTitle: string | null
      personName: string | null
      status: string
    }> {
      const children = childrenOf.get(nodeId) || []
      const people: Array<{
        id: string
        title: string
        personTitle: string | null
        personName: string | null
        status: string
      }> = []
      for (const c of children) {
        if (c.person_name && c.person_name.trim() !== '') {
          people.push({
            id: c.id,
            title: c.title,
            personTitle: c.person_title,
            personName: c.person_name,
            status: c.status,
          })
        }
        people.push(...collectPeople(c.id))
      }
      return people
    }

    return {
      id: d.id,
      title: d.title,
      language: d.language,
      status: d.status,
      ministry,
      people: collectPeople(d.id),
    }
  })

  return jsonResponse(data, { total: data.length })
}

async function handleStats() {
  const nodes = await fetchAllNodes()

  const byCat: Record<string, number> = {}
  const byLang: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  let totalPeople = 0
  let vacantPositions = 0
  let lastUpdated: string | null = null

  for (const n of nodes) {
    byCat[n.category] = (byCat[n.category] || 0) + 1
    byLang[n.language] = (byLang[n.language] || 0) + 1
    byStatus[n.status] = (byStatus[n.status] || 0) + 1

    if (n.person_name && n.person_name.trim() !== '') totalPeople++
    if (n.status === 'vacant') vacantPositions++

    if (!lastUpdated || n.updated_at > lastUpdated) lastUpdated = n.updated_at
  }

  return jsonResponse({
    totalNodes: nodes.length,
    totalPeople,
    vacantPositions,
    byCategory: byCat,
    byLanguage: byLang,
    byStatus: byStatus,
    lastUpdated,
  })
}

async function handleSearch(url: URL) {
  const q = url.searchParams.get('q')?.toLowerCase()
  if (!q || q.trim() === '') {
    return errorResponse('Query parameter "q" is required')
  }

  const nodes = await fetchAllNodes()
  const { byId, childrenOf } = buildMaps(nodes)

  const matches = nodes.filter(
    (n) =>
      n.person_name?.toLowerCase().includes(q) ||
      n.title?.toLowerCase().includes(q) ||
      n.description?.toLowerCase().includes(q),
  )

  const data = matches.map((n) => {
    const contact = parseContact(n.description)
    const breadcrumb = getBreadcrumb(n, byId)
    const department = findAncestorByCategory(n, 'department', byId)
    const ministry = findAncestorByCategory(n, 'ministry-system', byId)

    return {
      id: n.id,
      title: n.title,
      personTitle: n.person_title,
      personName: n.person_name,
      category: n.category,
      language: n.language,
      status: n.status,
      phone: contact.phone,
      email: contact.email,
      notes: contact.notes,
      department,
      ministry,
      breadcrumb,
    }
  })

  return jsonResponse(data, { total: data.length, query: q })
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    // The function is mounted at /org-api, so the path is relative to that.
    // Supabase Edge Functions receive the full path; we strip the function name prefix.
    const pathname = url.pathname.replace(/^\/org-api/, '') || '/'

    // GET /org-api/people/:id
    const personMatch = pathname.match(/^\/people\/([^/]+)$/)
    if (personMatch && req.method === 'GET') {
      return await handlePersonById(personMatch[1])
    }

    // GET /org-api/people
    if (pathname === '/people' && req.method === 'GET') {
      return await handlePeople(url)
    }

    // GET /org-api/tree
    if (pathname === '/tree' && req.method === 'GET') {
      return await handleTree(url)
    }

    // GET /org-api/ministries
    if (pathname === '/ministries' && req.method === 'GET') {
      return await handleMinistries()
    }

    // GET /org-api/departments
    if (pathname === '/departments' && req.method === 'GET') {
      return await handleDepartments()
    }

    // GET /org-api/stats
    if (pathname === '/stats' && req.method === 'GET') {
      return await handleStats()
    }

    // GET /org-api/search?q=...
    if (pathname === '/search' && req.method === 'GET') {
      return await handleSearch(url)
    }

    // Root info
    if (pathname === '/' && req.method === 'GET') {
      return jsonResponse({
        name: 'Mont Carmel Org Chart API',
        version: '1.0.0',
        endpoints: [
          'GET /org-api/people',
          'GET /org-api/people/:id',
          'GET /org-api/tree',
          'GET /org-api/ministries',
          'GET /org-api/departments',
          'GET /org-api/stats',
          'GET /org-api/search?q=<term>',
        ],
      })
    }

    return errorResponse('Not found', 404)
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: cacheHeaders,
      },
    )
  }
})

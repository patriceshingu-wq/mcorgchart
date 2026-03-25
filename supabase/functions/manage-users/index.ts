import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Admin client with service role (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Regular client for verifying the caller's JWT
function getCallerClient(authHeader: string) {
  return createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify caller is authenticated and is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const callerClient = getCallerClient(authHeader)
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser()

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if caller is admin
    if (caller.app_metadata?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, ...params } = await req.json()

    let result
    switch (action) {
      case 'list':
        result = await listUsers()
        break
      case 'setRole':
        result = await setUserRole(params.userId, params.role)
        break
      case 'invite':
        result = await inviteUser(params.email, params.role)
        break
      case 'delete':
        result = await deleteUser(params.userId, caller.id)
        break
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function listUsers() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) throw error

  return {
    users: data.users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.app_metadata?.role || 'viewer',
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at,
    }))
  }
}

async function setUserRole(userId: string, role: 'admin' | 'viewer') {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { role }
  })
  if (error) throw error
  return { success: true, user: { id: data.user.id, role } }
}

async function inviteUser(email: string, role: 'admin' | 'viewer' = 'viewer') {
  // Create user with a random password - they'll need to reset it
  const tempPassword = crypto.randomUUID()

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // Auto-confirm email
    app_metadata: { role }
  })
  if (error) throw error

  // Generate password reset link
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email
  })

  return {
    success: true,
    user: { id: data.user.id, email, role },
    resetLink: linkError ? null : linkData.properties?.action_link
  }
}

async function deleteUser(userId: string, callerId: string) {
  if (userId === callerId) {
    throw new Error('Cannot delete yourself')
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) throw error
  return { success: true }
}

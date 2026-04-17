/**
 * Sync seed data to Supabase
 *
 * This script:
 * 1. Reads all nodes from seed data (seedData.ts)
 * 2. Reads all nodes from Supabase
 * 3. Upserts seed nodes (updates existing by ID, inserts new)
 * 4. Updates DB-only nodes that match by title+person to fix spellings/placements
 * 5. Preserves DB-only nodes that were added via the UI
 *
 * Usage: npx tsx scripts/sync-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import { SEED_NODES } from '../src/data/seedData';
import type { OrgNode } from '../src/types';
import { readFileSync } from 'fs';

// Parse .env manually
const envContent = readFileSync('.env', 'utf8');
const envVars: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
}

const SUPABASE_URL = envVars.VITE_SUPABASE_URL!;
const SUPABASE_KEY = envVars.VITE_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface DbRow {
  id: string;
  title: string;
  person_title: string;
  person_name: string;
  description: string;
  category: string;
  language: string;
  status: string;
  parent_id: string | null;
  order: number;
  is_collapsed: boolean;
  color_index?: number;
}

function toSnakeCase(node: OrgNode): DbRow {
  return {
    id: node.id,
    title: node.title,
    person_title: node.personTitle,
    person_name: node.personName,
    description: node.description,
    category: node.category,
    language: node.language,
    status: node.status,
    parent_id: node.parentId,
    order: node.order,
    is_collapsed: node.isCollapsed,
    color_index: node.colorIndex,
  };
}

async function main() {
  console.log('Connecting to Supabase...');
  console.log(`URL: ${SUPABASE_URL}`);

  // 1. Fetch existing DB nodes
  const { data: dbNodes, error: fetchError } = await supabase
    .from('org_nodes')
    .select('*')
    .order('id');

  if (fetchError) {
    console.error('Error fetching nodes:', fetchError);
    process.exit(1);
  }

  console.log(`\nExisting DB nodes: ${dbNodes.length}`);
  console.log(`Seed data nodes: ${SEED_NODES.length}`);

  // 2. Build lookup maps
  const dbById = new Map(dbNodes.map((n: DbRow) => [n.id, n]));
  const seedById = new Map(SEED_NODES.map(n => [n.id, n]));

  // 3. Categorize
  const toUpdate: OrgNode[] = []; // seed nodes that exist in DB (update)
  const toInsert: OrgNode[] = []; // seed nodes not in DB (insert)
  const dbOnly: DbRow[] = [];     // DB nodes not in seed (preserve)

  for (const node of SEED_NODES) {
    if (dbById.has(node.id)) {
      toUpdate.push(node);
    } else {
      toInsert.push(node);
    }
  }

  for (const [id, node] of dbById) {
    if (!seedById.has(id)) {
      dbOnly.push(node);
    }
  }

  console.log(`\nNodes to update (exist in both): ${toUpdate.length}`);
  console.log(`Nodes to insert (new from seed): ${toInsert.length}`);
  console.log(`DB-only nodes (preserve): ${dbOnly.length}`);

  // 4. Check if any DB-only nodes can be matched to seed nodes by person name
  // (these are nodes that were created in the UI with UUIDs instead of seed IDs)
  const unmatchedDbOnly: DbRow[] = [];
  const remapUpdates: { dbNode: DbRow; seedNode: OrgNode }[] = [];

  for (const dbNode of dbOnly) {
    if (!dbNode.person_name) {
      unmatchedDbOnly.push(dbNode);
      continue;
    }

    // Try to find a matching seed node by person name that ISN'T already in the DB by its seed ID
    const matchingSeed = SEED_NODES.find(s =>
      s.personName === dbNode.person_name &&
      s.title === dbNode.title &&
      !dbById.has(s.id) // Don't match if the seed ID already exists in DB
    );

    if (matchingSeed) {
      remapUpdates.push({ dbNode, seedNode: matchingSeed });
    } else {
      unmatchedDbOnly.push(dbNode);
    }
  }

  if (remapUpdates.length > 0) {
    console.log(`\nDB nodes matched to seed nodes by name (will update parent/fields):`);
    for (const { dbNode, seedNode } of remapUpdates) {
      console.log(`  ${dbNode.person_name} (${dbNode.title}) → parent: ${dbNode.parent_id} → ${seedNode.parentId}`);
    }
  }

  if (unmatchedDbOnly.length > 0) {
    console.log(`\nDB-only nodes that will be preserved:`);
    for (const n of unmatchedDbOnly) {
      console.log(`  ${n.id}: ${n.title}${n.person_name ? ` (${n.person_name})` : ''}`);
    }
  }

  // 5. Show what will change for updated nodes
  console.log(`\nSignificant updates:`);
  let changeCount = 0;
  for (const node of toUpdate) {
    const db = dbById.get(node.id)!;
    const changes: string[] = [];
    if (db.title !== node.title) changes.push(`title: "${db.title}" → "${node.title}"`);
    if (db.person_name !== node.personName) changes.push(`person: "${db.person_name}" → "${node.personName}"`);
    if (db.parent_id !== node.parentId) changes.push(`parent: ${db.parent_id} → ${node.parentId}`);
    if (db.person_title !== node.personTitle) changes.push(`personTitle: "${db.person_title}" → "${node.personTitle}"`);
    if (changes.length > 0) {
      console.log(`  ${node.id} (${node.title}): ${changes.join(', ')}`);
      changeCount++;
    }
  }
  if (changeCount === 0) console.log('  (none)');

  // 6. Perform upsert of all seed nodes
  console.log(`\nUpserting ${SEED_NODES.length} seed nodes...`);
  const seedRows = SEED_NODES.map(toSnakeCase);

  // Batch in chunks of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < seedRows.length; i += BATCH_SIZE) {
    const batch = seedRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('org_nodes')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Error upserting batch ${i / BATCH_SIZE + 1}:`, error);
      process.exit(1);
    }
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(seedRows.length / BATCH_SIZE)} done`);
  }

  // 7. Update DB-only nodes that were matched by name (fix their fields)
  for (const { dbNode, seedNode } of remapUpdates) {
    const { error } = await supabase
      .from('org_nodes')
      .update({
        title: seedNode.title,
        person_title: seedNode.personTitle,
        parent_id: seedNode.parentId,
        category: seedNode.category,
        language: seedNode.language,
        status: seedNode.status,
        order: seedNode.order,
      })
      .eq('id', dbNode.id);

    if (error) {
      console.error(`Error updating ${dbNode.id}:`, error);
    }
  }

  // 8. Verify final state
  const { data: finalNodes, error: verifyError } = await supabase
    .from('org_nodes')
    .select('id')
    .order('id');

  if (verifyError) {
    console.error('Error verifying:', verifyError);
  } else {
    console.log(`\nSync complete! Total nodes in DB: ${finalNodes.length}`);

    // Count people
    const { data: withPeople } = await supabase
      .from('org_nodes')
      .select('id')
      .neq('person_name', '');
    console.log(`Nodes with people assigned: ${withPeople?.length ?? '?'}`);
  }
}

main().catch(console.error);

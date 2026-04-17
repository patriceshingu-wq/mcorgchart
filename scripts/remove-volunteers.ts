/**
 * Remove volunteer nodes from Supabase, keeping only leadership nodes.
 * Also removes empty container nodes that only existed for volunteers.
 *
 * Usage: npx tsx scripts/remove-volunteers.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { SEED_NODES } from '../src/data/seedData';

const envContent = readFileSync('.env', 'utf8');
const envVars: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
}

const supabase = createClient(envVars.VITE_SUPABASE_URL!, envVars.VITE_SUPABASE_ANON_KEY!);

async function main() {
  // Get current DB nodes
  const { data: dbNodes, error } = await supabase
    .from('org_nodes')
    .select('id, title, person_name, person_title, category');

  if (error || !dbNodes) {
    console.error('Error fetching nodes:', error);
    process.exit(1);
  }

  console.log(`Current DB nodes: ${dbNodes.length}`);

  // Build set of seed node IDs (the ones we want to keep)
  const seedIds = new Set(SEED_NODES.map(n => n.id));

  // Find nodes to delete: vol-* IDs not in seed data
  const toDelete = dbNodes.filter(n =>
    n.id.startsWith('vol-') && !seedIds.has(n.id)
  );

  // Also delete container nodes that were removed from seed
  const removedContainers = ['hs-conn-001', 'hs-trans-001', 'tech-team-001', 'mws-001', 'pr-sound-001'];
  const containersToDelete = dbNodes.filter(n => removedContainers.includes(n.id));

  const allToDelete = [...toDelete, ...containersToDelete];

  console.log(`Nodes to delete: ${allToDelete.length}`);
  for (const n of allToDelete) {
    console.log(`  ${n.id}: ${n.title}${n.person_name ? ` (${n.person_name})` : ''}`);
  }

  if (allToDelete.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  // Delete in batches
  const idsToDelete = allToDelete.map(n => n.id);
  const BATCH = 50;
  for (let i = 0; i < idsToDelete.length; i += BATCH) {
    const batch = idsToDelete.slice(i, i + BATCH);
    const { error: delError } = await supabase
      .from('org_nodes')
      .delete()
      .in('id', batch);

    if (delError) {
      console.error(`Error deleting batch:`, delError);
    } else {
      console.log(`Deleted batch ${Math.floor(i / BATCH) + 1}`);
    }
  }

  // Also upsert the remaining seed nodes to ensure they're up to date
  console.log(`\nUpserting ${SEED_NODES.length} seed nodes...`);
  const seedRows = SEED_NODES.map(n => ({
    id: n.id,
    title: n.title,
    person_title: n.personTitle,
    person_name: n.personName,
    description: n.description,
    category: n.category,
    language: n.language,
    status: n.status,
    parent_id: n.parentId,
    order: n.order,
    is_collapsed: n.isCollapsed,
    color_index: n.colorIndex,
  }));

  for (let i = 0; i < seedRows.length; i += BATCH) {
    const batch = seedRows.slice(i, i + BATCH);
    const { error: upsertErr } = await supabase
      .from('org_nodes')
      .upsert(batch, { onConflict: 'id' });
    if (upsertErr) {
      console.error(`Upsert error:`, upsertErr);
    }
  }

  // Final count
  const { data: final } = await supabase.from('org_nodes').select('id');
  console.log(`\nFinal node count: ${final?.length}`);
}

main().catch(console.error);

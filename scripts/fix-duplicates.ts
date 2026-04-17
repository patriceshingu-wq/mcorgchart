/**
 * Fix duplicate nodes after sync.
 * Migrates children from UUID-based duplicates to seed-ID-based nodes, then deletes duplicates.
 *
 * Usage: npx tsx scripts/fix-duplicates.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf8');
const envVars: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
}

const supabase = createClient(envVars.VITE_SUPABASE_URL!, envVars.VITE_SUPABASE_ANON_KEY!);

// Duplicates to fix: keep the seed ID, delete the UUID
// For each: reparent children from UUID to seed ID, then delete UUID node
const duplicates = [
  { keepId: 'wt-eng-001', deleteId: 'e425f858-7353-43b3-b77c-bc0a64ce123e', name: 'MC Music English' },
  { keepId: 'wt-fr-001', deleteId: '6c25ebf9-f400-4573-bc18-3efedc95d685', name: 'MC Music French' },
  { keepId: 'interp-001', deleteId: 'cbd3e20b-e75d-4308-b4f8-5f0a01245189', name: 'Language Support' },
];

async function main() {
  for (const { keepId, deleteId, name } of duplicates) {
    console.log(`\nFixing: ${name}`);

    // Find children of the UUID node
    const { data: children } = await supabase
      .from('org_nodes')
      .select('id, title, person_name')
      .eq('parent_id', deleteId);

    if (children && children.length > 0) {
      console.log(`  Reparenting ${children.length} children from ${deleteId} to ${keepId}:`);
      for (const child of children) {
        console.log(`    ${child.person_name || child.title}`);
      }

      const { error: reparentError } = await supabase
        .from('org_nodes')
        .update({ parent_id: keepId })
        .eq('parent_id', deleteId);

      if (reparentError) {
        console.error(`  Error reparenting:`, reparentError);
        continue;
      }
    } else {
      console.log(`  No children to reparent`);
    }

    // Delete the duplicate
    const { error: deleteError } = await supabase
      .from('org_nodes')
      .delete()
      .eq('id', deleteId);

    if (deleteError) {
      console.error(`  Error deleting ${deleteId}:`, deleteError);
    } else {
      console.log(`  Deleted duplicate ${deleteId}`);
    }
  }

  // Verify final count
  const { data: finalNodes } = await supabase
    .from('org_nodes')
    .select('id');
  console.log(`\nFinal node count: ${finalNodes?.length}`);
}

main().catch(console.error);

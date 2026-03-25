import { supabase, isSupabaseConfigured } from './supabase';
import type { OrgNode, AppSettings } from '../types';
import { SEED_NODES, DEFAULT_SETTINGS } from '../data/seedData';

// Convert camelCase to snake_case for database
function toSnakeCase(obj: OrgNode): Record<string, unknown> {
  return {
    id: obj.id,
    title: obj.title,
    person_title: obj.personTitle,
    person_name: obj.personName,
    description: obj.description,
    category: obj.category,
    language: obj.language,
    status: obj.status,
    parent_id: obj.parentId,
    order: obj.order,
    is_collapsed: obj.isCollapsed,
    color_index: obj.colorIndex,
  };
}

// Convert snake_case from database to camelCase
function toCamelCase(row: Record<string, unknown>): OrgNode {
  return {
    id: row.id as string,
    title: row.title as string,
    personTitle: (row.person_title as string) ?? '',
    personName: (row.person_name as string) ?? '',
    description: (row.description as string) ?? '',
    category: row.category as OrgNode['category'],
    language: row.language as OrgNode['language'],
    status: row.status as OrgNode['status'],
    parentId: row.parent_id as string | null,
    order: row.order as number,
    isCollapsed: row.is_collapsed as boolean,
    colorIndex: row.color_index != null ? (row.color_index as number) : undefined,
  };
}

// Local storage keys
const STORAGE_KEYS = {
  nodes: 'mc-orgchart-nodes',
  settings: 'mc-orgchart-settings',
};

// ============ NODES ============

export async function loadNodes(): Promise<OrgNode[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('org_nodes')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      console.error('Error loading nodes from Supabase:', error);
      throw error;
    }

    if (data && data.length > 0) {
      return data.map(toCamelCase);
    }

    // No data in Supabase, seed it
    console.log('No data in Supabase, seeding...');
    await seedNodes();
    return SEED_NODES;
  }

  // Fallback to localStorage
  const stored = localStorage.getItem(STORAGE_KEYS.nodes);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      console.error('Error parsing stored nodes');
    }
  }
  return SEED_NODES;
}

export async function saveNodes(nodes: OrgNode[]): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    // Use upsert to handle both inserts and updates
    if (nodes.length > 0) {
      const { error: upsertError } = await supabase
        .from('org_nodes')
        .upsert(nodes.map(toSnakeCase), { onConflict: 'id' });

      if (upsertError) {
        console.error('Error upserting nodes:', upsertError);
        throw upsertError;
      }

      // Delete nodes that no longer exist (using parameterized query)
      const currentIds = nodes.map(n => n.id);
      if (currentIds.length > 0) {
        // Fetch all existing IDs from DB
        const { data: existingNodes } = await supabase
          .from('org_nodes')
          .select('id');

        if (existingNodes) {
          const idsToDelete = existingNodes
            .map(n => n.id as string)
            .filter(id => !currentIds.includes(id));

          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('org_nodes')
              .delete()
              .in('id', idsToDelete);

            if (deleteError) {
              console.error('Error deleting removed nodes:', deleteError);
            }
          }
        }
      }
    }
    return;
  }

  // Fallback to localStorage
  localStorage.setItem(STORAGE_KEYS.nodes, JSON.stringify(nodes));
}

export async function saveNode(node: OrgNode): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('org_nodes')
      .upsert(toSnakeCase(node));

    if (error) {
      console.error('Error saving node:', error);
      throw error;
    }
    return;
  }

  // Fallback: load all, update, save all
  const nodes = await loadNodes();
  const index = nodes.findIndex(n => n.id === node.id);
  if (index >= 0) {
    nodes[index] = node;
  } else {
    nodes.push(node);
  }
  localStorage.setItem(STORAGE_KEYS.nodes, JSON.stringify(nodes));
}

export async function deleteNode(nodeId: string): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('org_nodes')
      .delete()
      .eq('id', nodeId);

    if (error) {
      console.error('Error deleting node:', error);
      throw error;
    }
    return;
  }

  // Fallback: load all, filter, save all
  const nodes = await loadNodes();
  const filtered = nodes.filter(n => n.id !== nodeId);
  localStorage.setItem(STORAGE_KEYS.nodes, JSON.stringify(filtered));
}

async function seedNodes(): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('org_nodes')
      .insert(SEED_NODES.map(toSnakeCase));

    if (error) {
      console.error('Error seeding nodes:', error);
      throw error;
    }
  }
}

export async function resetToSeedData(): Promise<OrgNode[]> {
  await saveNodes(SEED_NODES);
  return SEED_NODES;
}

// ============ SETTINGS ============

export async function loadSettings(): Promise<AppSettings> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'app_settings')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error loading settings from Supabase:', error);
    }

    if (data?.value) {
      return data.value as AppSettings;
    }

    return DEFAULT_SETTINGS;
  }

  // Fallback to localStorage
  const stored = localStorage.getItem(STORAGE_KEYS.settings);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      console.error('Error parsing stored settings');
    }
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'app_settings',
        value: settings,
      }, { onConflict: 'key' });

    if (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
    return;
  }

  // Fallback to localStorage
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

// ============ CONNECTION STATUS ============

export function getStorageMode(): 'supabase' | 'local' {
  return isSupabaseConfigured() ? 'supabase' : 'local';
}

// ============ USER MANAGEMENT (via Edge Function) ============

export interface UserRecord {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
  createdAt: string;
  lastSignInAt: string | null;
}

async function callManageUsers(action: string, params: Record<string, unknown> = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/manage-users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export async function loadUsers(): Promise<UserRecord[]> {
  const { users } = await callManageUsers('list');
  return users;
}

export async function setUserRole(userId: string, role: 'admin' | 'viewer'): Promise<void> {
  await callManageUsers('setRole', { userId, role });
}

export async function inviteUser(email: string, role: 'admin' | 'viewer' = 'viewer'): Promise<{ resetLink: string | null }> {
  return await callManageUsers('invite', { email, role });
}

export async function deleteUser(userId: string): Promise<void> {
  await callManageUsers('delete', { userId });
}


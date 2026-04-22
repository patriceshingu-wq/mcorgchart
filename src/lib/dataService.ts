import { supabase, isSupabaseConfigured } from './supabase';
import type { OrgNode, AppSettings, AuditLogEntry } from '../types';
import { SEED_NODES, DEFAULT_SETTINGS } from '../data/seedData';

// ============ AUDIT LOGGING ============

interface AuditLogEntry {
  node_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  user_id?: string;
  user_email?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  change_summary: string;
}

/**
 * Log a change to the audit log table
 * This function is fail-safe - if logging fails, it won't throw an error
 */
async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  // Only log when Supabase is configured
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();

    const auditEntry = {
      node_id: entry.node_id,
      operation: entry.operation,
      user_id: session?.user?.id || entry.user_id,
      user_email: session?.user?.email || entry.user_email || 'system',
      old_values: entry.old_values || null,
      new_values: entry.new_values || null,
      change_summary: entry.change_summary,
    };

    const { error } = await supabase
      .from('org_nodes_audit_log')
      .insert(auditEntry);

    if (error) {
      console.warn('Failed to log audit entry:', error);
      // Don't throw - audit logging failure shouldn't break the application
    }
  } catch (error) {
    console.warn('Error in audit logging:', error);
    // Don't throw - audit logging failure shouldn't break the application
  }
}

/**
 * Generate a human-readable summary of changes between old and new node
 */
function generateChangeSummary(oldNode: OrgNode | null, newNode: OrgNode | null): string {
  if (!oldNode && newNode) {
    return `Created node: ${newNode.title}${newNode.personName ? ' - ' + newNode.personName : ''}`;
  }

  if (oldNode && !newNode) {
    return `Deleted node: ${oldNode.title}${oldNode.personName ? ' - ' + oldNode.personName : ''}`;
  }

  if (oldNode && newNode) {
    const changes: string[] = [];

    if (oldNode.title !== newNode.title) {
      changes.push(`title: "${oldNode.title}" → "${newNode.title}"`);
    }
    if (oldNode.personName !== newNode.personName) {
      changes.push(`person: "${oldNode.personName || '(none)'}" → "${newNode.personName || '(none)'}"`);
    }
    if (oldNode.personTitle !== newNode.personTitle) {
      changes.push(`person title: "${oldNode.personTitle || '(none)'}" → "${newNode.personTitle || '(none)'}"`);
    }
    if (oldNode.description !== newNode.description) {
      changes.push(`description updated`);
    }
    if (oldNode.category !== newNode.category) {
      changes.push(`category: "${oldNode.category}" → "${newNode.category}"`);
    }
    if (oldNode.parentId !== newNode.parentId) {
      changes.push(`parent: "${oldNode.parentId || '(none)'}" → "${newNode.parentId || '(none)'}"`);
    }
    if (oldNode.order !== newNode.order) {
      changes.push(`order: ${oldNode.order} → ${newNode.order}`);
    }
    if (oldNode.isCollapsed !== newNode.isCollapsed) {
      changes.push(`collapsed: ${oldNode.isCollapsed} → ${newNode.isCollapsed}`);
    }

    if (changes.length === 0) {
      return `No changes to ${newNode.title}`;
    }

    return `Updated ${newNode.title}: ${changes.join(', ')}`;
  }

  return 'Unknown change';
}

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
            } else if (idsToDelete.length > 0) {
              // Log bulk deletion
              await logAuditEntry({
                node_id: 'bulk-operation',
                operation: 'DELETE',
                change_summary: `Bulk delete: removed ${idsToDelete.length} node(s) [${idsToDelete.join(', ')}]`,
              });
            }
          }
        }
      }

      // Log bulk upsert operation (simplified to avoid noise)
      // Note: Individual saveNode calls will have detailed logging
      await logAuditEntry({
        node_id: 'bulk-operation',
        operation: 'UPDATE',
        change_summary: `Bulk update: saved ${nodes.length} node(s) (e.g., undo/redo operation)`,
      });
    }
    return;
  }

  // Fallback to localStorage
  localStorage.setItem(STORAGE_KEYS.nodes, JSON.stringify(nodes));
}

export async function saveNode(node: OrgNode): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    // Check if this is an insert or update by fetching existing node
    const { data: existingNode } = await supabase
      .from('org_nodes')
      .select('*')
      .eq('id', node.id)
      .single();

    const oldNode = existingNode ? toCamelCase(existingNode) : null;
    const operation = oldNode ? 'UPDATE' : 'INSERT';

    // Perform the upsert
    const { error } = await supabase
      .from('org_nodes')
      .upsert(toSnakeCase(node));

    if (error) {
      console.error('Error saving node:', error);
      throw error;
    }

    // Log the change to audit log
    await logAuditEntry({
      node_id: node.id,
      operation,
      old_values: oldNode ? toSnakeCase(oldNode) : undefined,
      new_values: toSnakeCase(node),
      change_summary: generateChangeSummary(oldNode, node),
    });

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
    // Fetch the node before deleting to log what was deleted
    const { data: existingNode } = await supabase
      .from('org_nodes')
      .select('*')
      .eq('id', nodeId)
      .single();

    const oldNode = existingNode ? toCamelCase(existingNode) : null;

    // Perform the delete
    const { error } = await supabase
      .from('org_nodes')
      .delete()
      .eq('id', nodeId);

    if (error) {
      console.error('Error deleting node:', error);
      throw error;
    }

    // Log the deletion to audit log
    if (oldNode) {
      await logAuditEntry({
        node_id: nodeId,
        operation: 'DELETE',
        old_values: toSnakeCase(oldNode),
        change_summary: generateChangeSummary(oldNode, null),
      });
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

// ============ AUDIT LOG QUERIES ============

export interface AuditLogFilters {
  nodeId?: string;
  userId?: string;
  operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export async function getAuditLogs(filters?: AuditLogFilters): Promise<AuditLogEntry[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    let query = supabase
      .from('org_nodes_audit_log')
      .select('*')
      .order('changed_at', { ascending: false });

    if (filters?.nodeId) {
      query = query.eq('node_id', filters.nodeId);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.operation) {
      query = query.eq('operation', filters.operation);
    }

    if (filters?.startDate) {
      query = query.gte('changed_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('changed_at', filters.endDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }

    // Map database snake_case to TypeScript camelCase
    return (data || []).map((row) => ({
      id: row.id,
      nodeId: row.node_id,
      operation: row.operation,
      userId: row.user_id,
      userEmail: row.user_email,
      changedAt: row.changed_at,
      oldValues: row.old_values,
      newValues: row.new_values,
      changeSummary: row.change_summary,
    }));
  } catch (error) {
    console.error('Error in getAuditLogs:', error);
    return [];
  }
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
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const response = await fetch(`${supabaseUrl}/functions/v1/manage-users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': supabaseAnonKey,
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


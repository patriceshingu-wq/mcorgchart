import { useState, useEffect, useCallback } from 'react';
import type { OrgNode, NodeCategory } from '../types';
import { SEED_NODES } from '../data/seedData';
import { generateId, getDescendantIds } from '../lib/utils';

const NODES_KEY = 'mont-carmel-orgchart-v2';
const OLD_KEY = 'mont-carmel-org-chart-builder';

function migrateOldData(oldData: unknown): OrgNode[] | null {
  try {
    const state = oldData as { nodes?: unknown[] };
    if (!state?.nodes || !Array.isArray(state.nodes)) return null;

    const categoryMap: Record<string, NodeCategory> = {
      'Senior Leadership': 'senior-leadership',
      'Executive Leadership': 'executive-leadership',
      'Ministry': 'ministry-system',
      'Ministry System': 'ministry-system',
      'Department': 'department',
      'Program / Initiative': 'program',
      'Program': 'program',
    };

    return state.nodes.map((n: unknown, i: number) => {
      const node = n as Record<string, unknown>;
      const lang = String(node.languageContext ?? 'both').toLowerCase() as OrgNode['language'];
      return {
        id: String(node.id ?? generateId()),
        title: String(node.title ?? ''),
        personName: String(node.personName ?? ''),
        description: String(node.description ?? ''),
        category: categoryMap[String(node.category ?? '')] ?? 'department',
        language: (['english', 'french', 'both'].includes(lang) ? lang : 'both') as OrgNode['language'],
        status: (['active', 'vacant', 'inactive'].includes(String(node.status)) ? node.status : 'active') as OrgNode['status'],
        parentId: node.parentId != null ? String(node.parentId) : null,
        order: typeof node.order === 'number' ? node.order : i,
        isCollapsed: Boolean(node.collapsed ?? node.isCollapsed ?? false),
      };
    });
  } catch {
    return null;
  }
}

function loadNodes(): OrgNode[] {
  try {
    // Try new key first
    const raw = localStorage.getItem(NODES_KEY);
    if (raw) return JSON.parse(raw) as OrgNode[];

    // Try migration from old key
    const oldRaw = localStorage.getItem(OLD_KEY);
    if (oldRaw) {
      const migrated = migrateOldData(JSON.parse(oldRaw));
      if (migrated) {
        localStorage.setItem(NODES_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {
    // ignore
  }
  return SEED_NODES;
}

export function useNodes() {
  const [nodes, setNodes] = useState<OrgNode[]>(loadNodes);

  useEffect(() => {
    localStorage.setItem(NODES_KEY, JSON.stringify(nodes));
  }, [nodes]);

  const addNode = useCallback((data: Omit<OrgNode, 'id' | 'order'>) => {
    setNodes(prev => {
      const siblings = prev.filter(n => n.parentId === data.parentId);
      const order = siblings.length;
      return [...prev, { ...data, id: generateId(), order }];
    });
  }, []);

  const updateNode = useCallback((id: string, patch: Partial<OrgNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => {
      const toDelete = new Set([id, ...getDescendantIds(prev, id)]);
      return prev.filter(n => !toDelete.has(n.id));
    });
  }, []);

  const reassignParent = useCallback((nodeId: string, newParentId: string | null) => {
    setNodes(prev => {
      const descendants = getDescendantIds(prev, nodeId);
      if (newParentId !== null && descendants.includes(newParentId)) return prev; // prevent cycles
      const siblings = prev.filter(n => n.parentId === newParentId && n.id !== nodeId);
      const order = siblings.length;
      return prev.map(n => n.id === nodeId ? { ...n, parentId: newParentId, order } : n);
    });
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, isCollapsed: !n.isCollapsed } : n));
  }, []);

  const collapseAll = useCallback(() => {
    setNodes(prev => prev.map(n => ({ ...n, isCollapsed: true })));
  }, []);

  const expandAll = useCallback(() => {
    setNodes(prev => prev.map(n => ({ ...n, isCollapsed: false })));
  }, []);

  const importNodes = useCallback((incoming: OrgNode[]) => {
    setNodes(incoming);
  }, []);

  const resetToSeed = useCallback(() => {
    setNodes(SEED_NODES);
  }, []);

  return {
    nodes,
    addNode,
    updateNode,
    deleteNode,
    reassignParent,
    toggleCollapse,
    collapseAll,
    expandAll,
    importNodes,
    resetToSeed,
  };
}

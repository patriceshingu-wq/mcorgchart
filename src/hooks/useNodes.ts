import { useState, useEffect, useCallback, useRef } from 'react';
import type { OrgNode } from '../types';
import { SEED_NODES } from '../data/seedData';
import { generateId, getDescendantIds } from '../lib/utils';
import {
  loadNodes as loadNodesFromService,
  saveNodes as saveNodesToService,
  saveNode as saveNodeToService,
  deleteNode as deleteNodeFromService,
  resetToSeedData,
  getStorageMode,
} from '../lib/dataService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Undo/redo history configuration
const MAX_HISTORY_SIZE = 50;
const DEBOUNCE_MS = 500;

export function useNodes(onSaveError?: () => void) {
  const [nodes, setNodes] = useState<OrgNode[]>(SEED_NODES);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<'supabase' | 'local'>('local');

  // Undo/redo history
  const [history, setHistory] = useState<OrgNode[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);
  // Track the last saved state so we can compute a diff instead of full-replacing
  const savedNodesRef = useRef<OrgNode[]>([]);
  // Flag to suppress saving when we're applying an incoming realtime update
  const skipNextSave = useRef(false);

  // Load nodes on mount
  useEffect(() => {
    async function load() {
      try {
        setStorageMode(getStorageMode());
        setLoadError(null);
        const loaded = await loadNodesFromService();
        setNodes(loaded);
        savedNodesRef.current = loaded;
        initialLoadDone.current = true;
      } catch (error: unknown) {
        console.error('Error loading nodes:', error);
        const message = error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : JSON.stringify(error);
        setLoadError(message || 'Failed to load data');
        setNodes(SEED_NODES);
        savedNodesRef.current = SEED_NODES;
        initialLoadDone.current = true;
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Realtime sync: merge changes from other users without overwriting local edits in progress
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const channel = supabase
      .channel('org_nodes_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'org_nodes' },
        (payload) => {
          skipNextSave.current = true;
          if (payload.event === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setNodes(prev => prev.filter(n => n.id !== deletedId));
            savedNodesRef.current = savedNodesRef.current.filter(n => n.id !== deletedId);
          } else {
            // INSERT or UPDATE — convert snake_case row to camelCase OrgNode
            const row = payload.new as Record<string, unknown>;
            const updated: OrgNode = {
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
            setNodes(prev => {
              const exists = prev.findIndex(n => n.id === updated.id);
              if (exists >= 0) {
                const next = [...prev];
                next[exists] = updated;
                return next;
              }
              return [...prev, updated];
            });
            savedNodesRef.current = (() => {
              const exists = savedNodesRef.current.findIndex(n => n.id === updated.id);
              if (exists >= 0) {
                const next = [...savedNodesRef.current];
                next[exists] = updated;
                return next;
              }
              return [...savedNodesRef.current, updated];
            })();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Debounced diff-based save: only persist nodes that actually changed locally
  useEffect(() => {
    if (!initialLoadDone.current) return;

    // If this state update came from a realtime event, don't save it back
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      const prev = savedNodesRef.current;
      const prevMap = new Map(prev.map(n => [n.id, n]));
      const currMap = new Map(nodes.map(n => [n.id, n]));

      // Upsert added or changed nodes
      const toSave = nodes.filter(n => {
        const old = prevMap.get(n.id);
        return !old || JSON.stringify(old) !== JSON.stringify(n);
      });

      // Delete removed nodes
      const toDelete = prev.filter(n => !currMap.has(n.id)).map(n => n.id);

      try {
        if (isSupabaseConfigured()) {
          await Promise.all([
            ...toSave.map(n => saveNodeToService(n)),
            ...toDelete.map(id => deleteNodeFromService(id)),
          ]);
        } else {
          // localStorage fallback: still full-replace (single user in local mode)
          await saveNodesToService(nodes);
        }
        savedNodesRef.current = nodes;
      } catch (err) {
        console.error('Error saving nodes:', err);
        onSaveError?.();
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [nodes]);

  // Track history for undo/redo (skip when undoing/redoing or during initial load)
  useEffect(() => {
    if (!initialLoadDone.current) return;

    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }

    setHistory(prev => {
      // Truncate any forward history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add current state
      newHistory.push(nodes);
      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
  }, [nodes]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    if (!canUndo) return;
    isUndoRedo.current = true;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setNodes(history[newIndex]);
  }, [canUndo, historyIndex, history]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    isUndoRedo.current = true;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setNodes(history[newIndex]);
  }, [canRedo, historyIndex, history]);

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

  const importNodes = useCallback(async (incoming: OrgNode[]) => {
    try {
      await saveNodesToService(incoming);
      savedNodesRef.current = incoming;
      setNodes(incoming);
    } catch (error) {
      console.error('Error importing nodes:', error);
    }
  }, []);

  const resetToSeed = useCallback(async () => {
    try {
      const seedNodes = await resetToSeedData();
      savedNodesRef.current = seedNodes;
      setNodes(seedNodes);
    } catch (error) {
      console.error('Error resetting to seed data:', error);
      savedNodesRef.current = SEED_NODES;
      setNodes(SEED_NODES);
    }
  }, []);

  return {
    nodes,
    isLoading,
    loadError,
    storageMode,
    addNode,
    updateNode,
    deleteNode,
    reassignParent,
    toggleCollapse,
    collapseAll,
    expandAll,
    importNodes,
    resetToSeed,
    // Undo/redo
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

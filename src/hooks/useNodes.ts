import { useState, useEffect, useCallback, useRef } from 'react';
import type { OrgNode } from '../types';
import { SEED_NODES } from '../data/seedData';
import { generateId, getDescendantIds } from '../lib/utils';
import {
  loadNodes as loadNodesFromService,
  saveNodes as saveNodesToService,
  resetToSeedData,
  getStorageMode,
} from '../lib/dataService';

// Undo/redo history configuration
const MAX_HISTORY_SIZE = 50;
const DEBOUNCE_MS = 500;

export function useNodes() {
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

  // Load nodes on mount
  useEffect(() => {
    async function load() {
      try {
        setStorageMode(getStorageMode());
        setLoadError(null);
        const loaded = await loadNodesFromService();
        setNodes(loaded);
        initialLoadDone.current = true;
      } catch (error) {
        console.error('Error loading nodes:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load data');
        setNodes(SEED_NODES);
        initialLoadDone.current = true;
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Debounced save
  useEffect(() => {
    // Don't save during initial load
    if (!initialLoadDone.current) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      saveNodesToService(nodes).catch(err => {
        console.error('Error saving nodes:', err);
      });
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

  const importNodes = useCallback((incoming: OrgNode[]) => {
    setNodes(incoming);
  }, []);

  const resetToSeed = useCallback(async () => {
    try {
      const seedNodes = await resetToSeedData();
      setNodes(seedNodes);
    } catch (error) {
      console.error('Error resetting to seed data:', error);
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

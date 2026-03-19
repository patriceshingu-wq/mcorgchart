import { useMemo } from 'react';
import type { OrgNode, NodePosition, FilterState } from '../types';

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 110;
export const H_GAP = 28;
export const V_GAP = 72;

// Compute which nodes are embedded inside their parent card (depts in ministry cards, execs in exec-team cards)
export function computeEmbeddedSets(nodes: OrgNode[]): { embeddedDeptIds: Set<string> } {
  const ministryIds = new Set(
    nodes.filter(n => n.category === 'ministry-system').map(n => n.id)
  );
  const execLeadershipIds = new Set(
    nodes.filter(n => n.category === 'executive-leadership').map(n => n.id)
  );
  const seniorLeadershipIds = new Set(
    nodes.filter(n => n.category === 'senior-leadership').map(n => n.id)
  );

  // Departments embedded in ministry cards
  const deptIds = nodes
    .filter(n => n.category === 'department' && n.parentId !== null && ministryIds.has(n.parentId!))
    .map(n => n.id);

  // Executive-leadership leaf nodes embedded in executive-leadership parent cards.
  // Only embed nodes with no children of their own (individual executives, not team/org nodes).
  const execIds = nodes
    .filter(n => {
      if (n.category !== 'executive-leadership') return false;
      if (!n.parentId || !execLeadershipIds.has(n.parentId)) return false;
      const hasChildren = nodes.some(child => child.parentId === n.id);
      return !hasChildren;
    })
    .map(n => n.id);

  // Senior-leadership leaf nodes embedded in the senior-leadership parent card.
  const seniorIds = nodes
    .filter(n => {
      if (n.category !== 'senior-leadership') return false;
      if (!n.parentId || !seniorLeadershipIds.has(n.parentId)) return false;
      const hasChildren = nodes.some(child => child.parentId === n.id);
      return !hasChildren;
    })
    .map(n => n.id);

  return {
    embeddedDeptIds: new Set([...deptIds, ...execIds, ...seniorIds]),
  };
}

// Get visible children (respects isCollapsed, skips embedded depts, hoists programs for ministries)
function getVisibleChildren(nodes: OrgNode[], nodeId: string, embeddedDeptIds: Set<string>): OrgNode[] {
  const node = nodes.find(n => n.id === nodeId);
  if (!node || node.isCollapsed) return [];

  // Normal children, minus embedded departments
  const directChildren = nodes
    .filter(n => n.parentId === nodeId && !embeddedDeptIds.has(n.id))
    .sort((a, b) => a.order - b.order);

  // For ministry-system: also hoist programs from embedded depts
  if (node.category === 'ministry-system') {
    const embeddedDeptChildIds = nodes
      .filter(n => n.parentId === nodeId && embeddedDeptIds.has(n.id))
      .map(n => n.id);
    const hoistedPrograms = nodes
      .filter(n => n.parentId !== null && embeddedDeptChildIds.includes(n.parentId!))
      .sort((a, b) => {
        const dA = nodes.find(d => d.id === a.parentId)?.order ?? 0;
        const dB = nodes.find(d => d.id === b.parentId)?.order ?? 0;
        return dA !== dB ? dA - dB : a.order - b.order;
      });
    return [...directChildren, ...hoistedPrograms];
  }

  return directChildren;
}

// Compute the total width a subtree needs
function subtreeWidth(nodes: OrgNode[], nodeId: string, embeddedDeptIds: Set<string>): number {
  const children = getVisibleChildren(nodes, nodeId, embeddedDeptIds);
  if (children.length === 0) return NODE_WIDTH;
  const total = children.reduce((sum, c) => sum + subtreeWidth(nodes, c.id, embeddedDeptIds), 0);
  return Math.max(NODE_WIDTH, total + H_GAP * (children.length - 1));
}

// Assign (x, y) positions recursively
function assignPositions(
  nodes: OrgNode[],
  nodeId: string,
  centerX: number,
  depth: number,
  positions: Map<string, NodePosition>,
  embeddedDeptIds: Set<string>,
) {
  const x = centerX - NODE_WIDTH / 2;
  const y = depth * (NODE_HEIGHT + V_GAP);
  positions.set(nodeId, { id: nodeId, x, y, width: NODE_WIDTH, height: NODE_HEIGHT });

  const children = getVisibleChildren(nodes, nodeId, embeddedDeptIds);
  if (children.length === 0) return;

  const totalW = children.reduce((s, c) => s + subtreeWidth(nodes, c.id, embeddedDeptIds), 0)
    + H_GAP * (children.length - 1);

  let cursor = centerX - totalW / 2;
  for (const child of children) {
    const cw = subtreeWidth(nodes, child.id, embeddedDeptIds);
    assignPositions(nodes, child.id, cursor + cw / 2, depth + 1, positions, embeddedDeptIds);
    cursor += cw + H_GAP;
  }
}

export function computeLayout(
  nodes: OrgNode[],
  rootNodes: OrgNode[],
  embeddedDeptIds: Set<string>,
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  if (rootNodes.length === 0) return positions;

  if (rootNodes.length === 1) {
    const root = rootNodes[0];
    const totalW = subtreeWidth(nodes, root.id, embeddedDeptIds);
    assignPositions(nodes, root.id, totalW / 2 + H_GAP, 0, positions, embeddedDeptIds);
  } else {
    // Multiple roots: space them like siblings
    const totalW = rootNodes.reduce((s, r) => s + subtreeWidth(nodes, r.id, embeddedDeptIds), 0)
      + H_GAP * (rootNodes.length - 1);
    let cursor = H_GAP;
    for (const root of rootNodes) {
      const rw = subtreeWidth(nodes, root.id, embeddedDeptIds);
      assignPositions(nodes, root.id, cursor + rw / 2, 0, positions, embeddedDeptIds);
      cursor += rw + H_GAP;
    }
    void totalW;
  }

  return positions;
}

function nodeMatchesFilters(node: OrgNode, filters: FilterState): boolean {
  const q = filters.search.toLowerCase();
  if (q && !node.title.toLowerCase().includes(q) &&
      !node.personName.toLowerCase().includes(q) &&
      !node.description.toLowerCase().includes(q)) return false;
  if (filters.category && node.category !== filters.category) return false;
  if (filters.language && node.language !== filters.language) return false;
  if (filters.status && node.status !== filters.status) return false;
  return true;
}

function getAncestorIds(nodes: OrgNode[], nodeId: string): string[] {
  const ids: string[] = [];
  let current = nodes.find(n => n.id === nodeId);
  while (current?.parentId) {
    ids.push(current.parentId);
    current = nodes.find(n => n.id === current!.parentId);
  }
  return ids;
}

function getDescendantIds(nodes: OrgNode[], nodeId: string): string[] {
  const result: string[] = [];
  const queue = [nodeId];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const children = nodes.filter(n => n.parentId === cur);
    for (const c of children) {
      result.push(c.id);
      queue.push(c.id);
    }
  }
  return result;
}

export function useOrgTree(nodes: OrgNode[], filters: FilterState) {
  return useMemo(() => {
    const { embeddedDeptIds } = computeEmbeddedSets(nodes);
    const hasActiveFilter = Boolean(
      filters.search || filters.category || filters.language || filters.status
    );

    if (!hasActiveFilter) {
      const rootNodes = nodes.filter(n => !n.parentId).sort((a, b) => a.order - b.order);
      return {
        visibleNodes: nodes,
        rootNodes,
        matchingIds: new Set<string>(),
        hasActiveFilter: false,
        embeddedDeptIds,
      };
    }

    // Find directly matching nodes
    const matchingIds = new Set<string>(nodes.filter(n => nodeMatchesFilters(n, filters)).map(n => n.id));

    // Expand to include ancestors + descendants
    const visibleIds = new Set<string>(matchingIds);
    for (const id of matchingIds) {
      for (const aid of getAncestorIds(nodes, id)) visibleIds.add(aid);
      for (const did of getDescendantIds(nodes, id)) visibleIds.add(did);
    }

    const visibleNodes = nodes.filter(n => visibleIds.has(n.id));
    const rootNodes = visibleNodes
      .filter(n => !n.parentId || !visibleIds.has(n.parentId ?? ''))
      .sort((a, b) => a.order - b.order);

    return { visibleNodes, rootNodes, matchingIds, hasActiveFilter: true, embeddedDeptIds };
  }, [nodes, filters]);
}

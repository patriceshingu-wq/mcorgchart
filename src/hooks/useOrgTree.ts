import { useMemo } from 'react';
import type { OrgNode, NodePosition, FilterState } from '../types';

// Shared layout constants (screen)
export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 110;
export const H_GAP = 28;
export const V_GAP = 56;

// Dark card header height (for standalone dark cards like Resident Pastor)
export const DARK_CARD_HEADER_HEIGHT = 68;

// Resident Pastor node ID (special short dark card)
const RESIDENT_PASTOR_ID = 'rp-001';

// Print layout constants (scaled down to fit on page)
export const PRINT_NODE_WIDTH = 200;
export const PRINT_NODE_HEIGHT = 100;
export const PRINT_H_GAP = 24;
export const PRINT_V_GAP = 60;

// Compute which nodes are embedded inside their parent card (depts in ministry cards, execs in exec-team cards, sub-depts in dept cards)
export function computeEmbeddedSets(nodes: OrgNode[]): {
  embeddedDeptIds: Set<string>;
  embeddedProgramIds: Set<string>;
  embeddedSubDeptIds: Set<string>;
} {
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

  // Programs embedded in ministry cards (direct children of ministries)
  const programIds = nodes
    .filter(n => n.category === 'program' && n.parentId !== null && ministryIds.has(n.parentId!))
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

  // Sub-departments embedded in department cards (departments whose parent is also a department)
  const deptIdSet = new Set(deptIds);
  const subDeptIds = nodes
    .filter(n => n.category === 'department' && n.parentId !== null && deptIdSet.has(n.parentId!))
    .map(n => n.id);

  return {
    embeddedDeptIds: new Set([...deptIds, ...execIds, ...seniorIds]),
    embeddedProgramIds: new Set(programIds),
    embeddedSubDeptIds: new Set(subDeptIds),
  };
}

// Get visible children (respects isCollapsed, skips embedded depts, programs, and sub-depts)
function getVisibleChildren(
  nodes: OrgNode[],
  nodeId: string,
  embeddedDeptIds: Set<string>,
  embeddedProgramIds: Set<string>,
  embeddedSubDeptIds: Set<string>,
): OrgNode[] {
  const node = nodes.find(n => n.id === nodeId);
  if (!node || node.isCollapsed) return [];

  // Normal children, minus embedded departments, programs, and sub-departments
  const directChildren = nodes
    .filter(n => n.parentId === nodeId && !embeddedDeptIds.has(n.id) && !embeddedProgramIds.has(n.id) && !embeddedSubDeptIds.has(n.id))
    .sort((a, b) => a.order - b.order);

  // For ministry-system: also hoist programs from embedded depts (programs nested under departments)
  if (node.category === 'ministry-system') {
    const embeddedDeptChildIds = nodes
      .filter(n => n.parentId === nodeId && embeddedDeptIds.has(n.id))
      .map(n => n.id);
    const hoistedPrograms = nodes
      .filter(n => n.parentId !== null && embeddedDeptChildIds.includes(n.parentId!) && !embeddedSubDeptIds.has(n.id))
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
function subtreeWidth(
  nodes: OrgNode[],
  nodeId: string,
  embeddedDeptIds: Set<string>,
  embeddedProgramIds: Set<string>,
  embeddedSubDeptIds: Set<string>,
): number {
  const children = getVisibleChildren(nodes, nodeId, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds);
  if (children.length === 0) return NODE_WIDTH;
  const total = children.reduce((sum, c) => sum + subtreeWidth(nodes, c.id, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds), 0);
  return Math.max(NODE_WIDTH, total + H_GAP * (children.length - 1));
}

// Get the effective height of a node (shorter for standalone dark cards like Resident Pastor)
function getNodeEffectiveHeight(nodeId: string): number {
  if (nodeId === RESIDENT_PASTOR_ID) {
    return DARK_CARD_HEADER_HEIGHT;
  }
  return NODE_HEIGHT;
}

// Assign (x, y) positions recursively
function assignPositions(
  nodes: OrgNode[],
  nodeId: string,
  centerX: number,
  currentY: number,
  positions: Map<string, NodePosition>,
  embeddedDeptIds: Set<string>,
  embeddedProgramIds: Set<string>,
  embeddedSubDeptIds: Set<string>,
) {
  const x = centerX - NODE_WIDTH / 2;
  positions.set(nodeId, { id: nodeId, x, y: currentY, width: NODE_WIDTH, height: NODE_HEIGHT });

  const children = getVisibleChildren(nodes, nodeId, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds);
  if (children.length === 0) return;

  const totalW = children.reduce((s, c) => s + subtreeWidth(nodes, c.id, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds), 0)
    + H_GAP * (children.length - 1);

  // Calculate Y for children based on this node's effective height
  const childY = currentY + getNodeEffectiveHeight(nodeId) + V_GAP;

  let cursor = centerX - totalW / 2;
  for (const child of children) {
    const cw = subtreeWidth(nodes, child.id, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds);
    assignPositions(nodes, child.id, cursor + cw / 2, childY, positions, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds);
    cursor += cw + H_GAP;
  }
}

export function computeLayout(
  nodes: OrgNode[],
  rootNodes: OrgNode[],
  embeddedDeptIds: Set<string>,
  embeddedProgramIds: Set<string>,
  embeddedSubDeptIds: Set<string>,
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  if (rootNodes.length === 0) return positions;

  const startY = 0;

  if (rootNodes.length === 1) {
    const root = rootNodes[0];
    const totalW = subtreeWidth(nodes, root.id, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds);
    assignPositions(nodes, root.id, totalW / 2 + H_GAP, startY, positions, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds);
  } else {
    // Multiple roots: space them like siblings
    const totalW = rootNodes.reduce((s, r) => s + subtreeWidth(nodes, r.id, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds), 0)
      + H_GAP * (rootNodes.length - 1);
    let cursor = H_GAP;
    for (const root of rootNodes) {
      const rw = subtreeWidth(nodes, root.id, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds);
      assignPositions(nodes, root.id, cursor + rw / 2, startY, positions, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds);
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
    const { embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds } = computeEmbeddedSets(nodes);
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
        embeddedProgramIds,
        embeddedSubDeptIds,
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

    // Optionally include siblings of matching nodes
    if (filters.includeSiblings) {
      for (const id of matchingIds) {
        const node = nodes.find(n => n.id === id);
        if (node) {
          const siblings = nodes.filter(n => n.parentId === node.parentId && n.id !== id);
          for (const sibling of siblings) {
            visibleIds.add(sibling.id);
          }
        }
      }
    }

    const visibleNodes = nodes.filter(n => visibleIds.has(n.id));
    const rootNodes = visibleNodes
      .filter(n => !n.parentId || !visibleIds.has(n.parentId ?? ''))
      .sort((a, b) => a.order - b.order);

    return { visibleNodes, rootNodes, matchingIds, hasActiveFilter: true, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds };
  }, [nodes, filters]);
}

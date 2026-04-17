import { useMemo } from 'react';
import type { OrgNode, NodePosition, FilterState } from '../types';
import { SCREEN } from '../constants/layout';

// Shared layout constants (screen)
export const NODE_WIDTH = 220;
export const WIDE_NODE_WIDTH = 280; // Wider cards for senior/executive leadership
export const NODE_HEIGHT = 110;
export const H_GAP = 28;
export const V_GAP = 56;

// Dark card header height (for dark container cards)
export const DARK_CARD_HEADER_HEIGHT = 68;

// Print layout constants (scaled down to fit on page)
export const PRINT_NODE_WIDTH = 200;
export const PRINT_WIDE_NODE_WIDTH = 260; // Wider cards for senior/executive leadership (print)
export const PRINT_NODE_HEIGHT = 100;
export const PRINT_H_GAP = 24;
export const PRINT_V_GAP = 60;

// Compute which nodes are embedded inside their parent card (depts in ministry cards, execs in exec-team cards, sub-depts in dept cards)
export function computeEmbeddedSets(nodes: OrgNode[]): {
  embeddedDeptIds: Set<string>;
  embeddedProgramIds: Set<string>;
  embeddedSubDeptIds: Set<string>;
  subDeptContainerIds: Set<string>;
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

  // Build a set of all node IDs that have at least one child — O(n)
  const nodeIdsWithChildren = new Set<string>();
  for (const n of nodes) {
    if (n.parentId !== null) {
      nodeIdsWithChildren.add(n.parentId);
    }
  }

  // Departments embedded in ministry cards
  const deptIds = nodes
    .filter(n => n.category === 'department' && n.parentId !== null && ministryIds.has(n.parentId!))
    .map(n => n.id);

  // Programs embedded in ministry cards (direct children of ministries)
  const programIds = nodes
    .filter(n => n.category === 'program' && n.parentId !== null && ministryIds.has(n.parentId!))
    .map(n => n.id);

  // Nodes embedded in executive-leadership parent cards:
  // 1. Executive-leadership leaf nodes (individual executives)
  // 2. Department/team nodes that are NOT ministry-systems (e.g. "Mid-Week Service", individual volunteers)
  //    These would otherwise float as disconnected cards.
  // Also embed any children of those embedded dept/team nodes (e.g. people under Mid-Week Service).
  const execIds: string[] = [];
  const execEmbeddedDeptIds: string[] = [];
  for (const n of nodes) {
    if (!n.parentId || !execLeadershipIds.has(n.parentId)) continue;
    if (n.category === 'ministry-system') continue; // ministries get their own cards
    if (n.category === 'executive-leadership') {
      if (!nodeIdsWithChildren.has(n.id)) execIds.push(n.id);
    } else {
      // Embed non-ministry children (departments, teams) into the exec card
      execIds.push(n.id);
      execEmbeddedDeptIds.push(n.id);
    }
  }
  // Also embed children of embedded dept/team nodes under exec-leadership
  const execEmbeddedDeptIdSet = new Set(execEmbeddedDeptIds);
  for (const n of nodes) {
    if (n.parentId && execEmbeddedDeptIdSet.has(n.parentId)) {
      execIds.push(n.id);
    }
  }

  // Senior-leadership leaf nodes embedded in the senior-leadership parent card.
  const seniorIds = nodes
    .filter(n => {
      if (n.category !== 'senior-leadership') return false;
      if (!n.parentId || !seniorLeadershipIds.has(n.parentId)) return false;
      const hasChildren = nodeIdsWithChildren.has(n.id);
      return !hasChildren;
    })
    .map(n => n.id);

  // Sub-departments and teams embedded in department cards
  // Also include their children (volunteers under sub-departments like Ushers, Greeters, etc.)
  const deptIdSet = new Set(deptIds);
  const subDeptNodes = nodes
    .filter(n =>
      n.parentId !== null &&
      deptIdSet.has(n.parentId!) &&
      (n.category === 'department' || n.category === 'team')
    );
  const subDeptIdSet = new Set(subDeptNodes.map(n => n.id));
  // Children of sub-departments (volunteers/team members under embedded sub-depts)
  const subDeptChildren = nodes
    .filter(n =>
      n.parentId !== null &&
      subDeptIdSet.has(n.parentId!)
    );
  const subDeptIds = [...subDeptNodes.map(n => n.id), ...subDeptChildren.map(n => n.id)];
  // Keep track of just the sub-dept containers (not their volunteer children) for height calculations
  const subDeptContainerIds = subDeptNodes.map(n => n.id);

  return {
    embeddedDeptIds: new Set([...deptIds, ...execIds, ...seniorIds]),
    embeddedProgramIds: new Set(programIds),
    embeddedSubDeptIds: new Set(subDeptIds),
    subDeptContainerIds: new Set(subDeptContainerIds),
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
  const nodeWidth = getNodeWidth(nodes, nodeId);
  const children = getVisibleChildren(nodes, nodeId, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds);
  if (children.length === 0) return nodeWidth;
  const total = children.reduce((sum, c) => sum + subtreeWidth(nodes, c.id, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds), 0);
  return Math.max(nodeWidth, total + H_GAP * (children.length - 1));
}

// Get the effective height of a node, accounting for embedded content in dark cards
function getNodeEffectiveHeight(
  nodes: OrgNode[],
  nodeId: string,
  embeddedDeptIds: Set<string>,
  embeddedProgramIds: Set<string>,
  embeddedSubDeptIds: Set<string>,
  subDeptContainerIds?: Set<string>,
): number {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return NODE_HEIGHT;

  // Ministry-system cards with embedded depts/programs
  if (node.category === 'ministry-system') {
    const embeddedDepts = nodes.filter(
      n => n.parentId === nodeId && embeddedDeptIds.has(n.id)
    );
    const deptCount = embeddedDepts.length;
    const programCount = nodes.filter(
      n => n.parentId === nodeId && embeddedProgramIds.has(n.id)
    ).length;

    if (deptCount > 0 || programCount > 0) {
      let listHeight = 0;
      for (const dept of embeddedDepts) {
        // Each dept row has a name line, and if person assigned, a second line for the role
        listHeight += dept.personName ? SCREEN.DEPT_ROW_HEIGHT + 10 : SCREEN.DEPT_ROW_HEIGHT;
        if (!dept.isCollapsed) {
          // Only count sub-dept containers for height, not their volunteer children
          const subDeptFilter = subDeptContainerIds ?? embeddedSubDeptIds;
          const subDepts = nodes.filter(
            n => n.parentId === dept.id && subDeptFilter.has(n.id)
          );
          if (subDepts.length > 0) {
            let subHeight = SCREEN.SUBDEPT_CONTAINER_PADDING;
            for (const sub of subDepts) {
              subHeight += sub.personName ? SCREEN.SUBDEPT_ROW_HEIGHT + 8 : SCREEN.SUBDEPT_ROW_HEIGHT;
            }
            listHeight += subHeight;
          }
        }
      }
      if (programCount > 0) {
        listHeight += SCREEN.PROGRAM_HEADER_HEIGHT + programCount * SCREEN.PROGRAM_ROW_HEIGHT + 8;
      }
      return SCREEN.DARK_CARD_HEADER_HEIGHT + listHeight + SCREEN.LIST_PADDING;
    }
    return SCREEN.DARK_CARD_HEADER_HEIGHT;
  }

  // Executive-leadership cards with embedded execs
  if (node.category === 'executive-leadership') {
    const directEmbedded = nodes.filter(
      n => n.parentId === nodeId && embeddedDeptIds.has(n.id)
    );
    const directIds = new Set(directEmbedded.map(n => n.id));
    const grandchildren = nodes.filter(
      n => n.parentId && directIds.has(n.parentId) && embeddedDeptIds.has(n.id)
    );
    const execCount = directEmbedded.length + grandchildren.length;
    if (execCount > 0) {
      return SCREEN.DARK_CARD_HEADER_HEIGHT + execCount * SCREEN.EXEC_ROW_HEIGHT + SCREEN.LIST_PADDING;
    }
  }

  // Senior-leadership cards with embedded members
  if (node.category === 'senior-leadership') {
    const seniorCount = nodes.filter(
      n => n.parentId === nodeId && embeddedDeptIds.has(n.id)
    ).length;
    if (seniorCount > 0) {
      return SCREEN.DARK_CARD_HEADER_HEIGHT + seniorCount * SCREEN.SENIOR_ROW_HEIGHT + SCREEN.LIST_PADDING;
    }
  }

  // Department cards with sub-depts (dark cards)
  if (node.category === 'department') {
    const subDepts = nodes.filter(
      n => n.parentId === nodeId && embeddedSubDeptIds.has(n.id)
    );
    if (subDepts.length > 0) {
      let listHeight = 0;
      for (const sub of subDepts) {
        listHeight += sub.personName ? SCREEN.SUBDEPT_ROW_HEIGHT + 8 : SCREEN.SUBDEPT_ROW_HEIGHT;
      }
      return SCREEN.DARK_CARD_HEADER_HEIGHT + listHeight + SCREEN.LIST_PADDING;
    }
  }

  return NODE_HEIGHT;
}

// Get the width for a node based on its category
function getNodeWidth(nodes: OrgNode[], nodeId: string): number {
  const node = nodes.find(n => n.id === nodeId);
  if (node?.category === 'senior-leadership' || node?.category === 'executive-leadership') {
    return WIDE_NODE_WIDTH;
  }
  return NODE_WIDTH;
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
  subDeptContainerIds?: Set<string>,
) {
  const nodeWidth = getNodeWidth(nodes, nodeId);
  const x = centerX - nodeWidth / 2;
  const effectiveHeight = getNodeEffectiveHeight(nodes, nodeId, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds, subDeptContainerIds);
  positions.set(nodeId, { id: nodeId, x, y: currentY, width: nodeWidth, height: effectiveHeight });

  const children = getVisibleChildren(nodes, nodeId, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds);
  if (children.length === 0) return;

  const totalW = children.reduce((s, c) => s + subtreeWidth(nodes, c.id, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds), 0)
    + H_GAP * (children.length - 1);

  // Calculate Y for children based on this node's effective height
  const childY = currentY + effectiveHeight + V_GAP;

  let cursor = centerX - totalW / 2;
  for (const child of children) {
    const cw = subtreeWidth(nodes, child.id, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds);
    assignPositions(nodes, child.id, cursor + cw / 2, childY, positions, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds, subDeptContainerIds);
    cursor += cw + H_GAP;
  }
}

export function computeLayout(
  nodes: OrgNode[],
  rootNodes: OrgNode[],
  embeddedDeptIds: Set<string>,
  embeddedProgramIds: Set<string>,
  embeddedSubDeptIds: Set<string>,
  subDeptContainerIds?: Set<string>,
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  if (rootNodes.length === 0) return positions;

  const startY = 0;

  if (rootNodes.length === 1) {
    const root = rootNodes[0];
    const totalW = subtreeWidth(nodes, root.id, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds);
    assignPositions(nodes, root.id, totalW / 2 + H_GAP, startY, positions, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds, subDeptContainerIds);
  } else {
    // Multiple roots: space them like siblings
    const totalW = rootNodes.reduce((s, r) => s + subtreeWidth(nodes, r.id, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds), 0)
      + H_GAP * (rootNodes.length - 1);
    let cursor = H_GAP;
    for (const root of rootNodes) {
      const rw = subtreeWidth(nodes, root.id, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds);
      assignPositions(nodes, root.id, cursor + rw / 2, startY, positions, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds, subDeptContainerIds);
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
    const { embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds, subDeptContainerIds } = computeEmbeddedSets(nodes);
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
        subDeptContainerIds,
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

    return { visibleNodes, rootNodes, matchingIds, hasActiveFilter: true, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds, subDeptContainerIds };
  }, [nodes, filters]);
}

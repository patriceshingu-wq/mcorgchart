import React from 'react';
import type { OrgNode, NodePosition } from '../../types';
import { NODE_HEIGHT } from '../../hooks/useOrgTree';

// Approximate row heights for embedded lists
const DEPT_ROW_HEIGHT = 26;   // EmbeddedDeptList row
const EXEC_ROW_HEIGHT = 36;   // EmbeddedExecList row (taller — has avatar)
// Approximate dark card header height (avatar row + padding)
const DARK_CARD_HEADER_HEIGHT = 68;
// Extra padding after embedded list (border-t + pt + pb)
const LIST_PADDING = 12;

interface OrgChartConnectorsProps {
  nodes: OrgNode[];
  allNodes: OrgNode[];
  positions: Map<string, NodePosition>;
  embeddedDeptIds: Set<string>;
  canvasWidth: number;
  canvasHeight: number;
}

export function OrgChartConnectors({
  nodes,
  allNodes,
  positions,
  embeddedDeptIds,
  canvasWidth,
  canvasHeight,
}: OrgChartConnectorsProps) {
  const lines: React.ReactNode[] = [];

  for (const node of nodes) {
    if (!node.parentId) continue;
    // Skip embedded dept nodes — they're not rendered as standalone cards
    if (embeddedDeptIds.has(node.id)) continue;

    let effectiveParentId = node.parentId;

    // If real parent is an embedded dept, walk up to the ministry grandparent
    if (embeddedDeptIds.has(node.parentId)) {
      const dept = allNodes.find(n => n.id === node.parentId);
      if (!dept?.parentId) continue;
      effectiveParentId = dept.parentId;
    }

    const parentPos = positions.get(effectiveParentId);
    const childPos = positions.get(node.id);
    if (!parentPos || !childPos) continue;

    // Compute effective bottom of parent card
    // Dark cards (ministry, exec team) are taller due to embedded lists
    const parentNode = allNodes.find(n => n.id === effectiveParentId);
    let effectiveHeight = NODE_HEIGHT;
    if (parentNode?.category === 'ministry-system') {
      const deptCount = allNodes.filter(
        n => n.parentId === effectiveParentId && embeddedDeptIds.has(n.id)
      ).length;
      effectiveHeight = deptCount > 0
        ? DARK_CARD_HEADER_HEIGHT + deptCount * DEPT_ROW_HEIGHT + LIST_PADDING
        : DARK_CARD_HEADER_HEIGHT;
    } else if (parentNode?.category === 'executive-leadership') {
      const execCount = allNodes.filter(
        n => n.parentId === effectiveParentId && embeddedDeptIds.has(n.id)
      ).length;
      if (execCount > 0) {
        effectiveHeight = DARK_CARD_HEADER_HEIGHT + execCount * EXEC_ROW_HEIGHT + LIST_PADDING;
      }
    }

    const x1 = parentPos.x + parentPos.width / 2;
    const y1 = parentPos.y + effectiveHeight;
    const x2 = childPos.x + childPos.width / 2;
    const y2 = childPos.y;
    const midY = (y1 + y2) / 2;

    lines.push(
      <path
        key={`${effectiveParentId}-${node.id}`}
        d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
        stroke="rgba(148,163,184,0.7)"
        strokeWidth="1.5"
        fill="none"
      />,
    );
  }

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: canvasWidth,
        height: canvasHeight,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 0,
      }}
    >
      {lines}
    </svg>
  );
}

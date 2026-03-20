import React from 'react';
import type { OrgNode, NodePosition } from '../../types';
import { NODE_HEIGHT } from '../../hooks/useOrgTree';

// Approximate row heights for embedded lists
const DEPT_ROW_HEIGHT = 26;     // EmbeddedDeptList row
const SUBDEPT_ROW_HEIGHT = 18;  // EmbeddedDeptList sub-department row (smaller)
const SUBDEPT_CONTAINER_PADDING = 4; // ml-4 border-l pl-2 my-0.5
const PROGRAM_ROW_HEIGHT = 26;  // EmbeddedDeptList program row
const PROGRAM_HEADER_HEIGHT = 24; // Programs section header
const EXEC_ROW_HEIGHT = 36;     // EmbeddedExecList row (taller — has avatar)
const SENIOR_ROW_HEIGHT = 36;   // Senior leadership embedded row
// Approximate dark card header height (avatar row + padding)
const DARK_CARD_HEADER_HEIGHT = 68;
// Extra padding after embedded list (border-t + pt + pb)
const LIST_PADDING = 12;
// Resident Pastor node ID (special standalone dark card)
const RESIDENT_PASTOR_ID = 'rp-001';

interface OrgChartConnectorsProps {
  nodes: OrgNode[];
  allNodes: OrgNode[];
  positions: Map<string, NodePosition>;
  embeddedDeptIds: Set<string>;
  embeddedProgramIds: Set<string>;
  embeddedSubDeptIds: Set<string>;
  canvasWidth: number;
  canvasHeight: number;
}

export function OrgChartConnectors({
  nodes,
  allNodes,
  positions,
  embeddedDeptIds,
  embeddedProgramIds,
  embeddedSubDeptIds,
  canvasWidth,
  canvasHeight,
}: OrgChartConnectorsProps) {
  const lines: React.ReactNode[] = [];

  for (const node of nodes) {
    if (!node.parentId) continue;
    // Skip embedded dept/program/subdept nodes — they're not rendered as standalone cards
    if (embeddedDeptIds.has(node.id) || embeddedProgramIds.has(node.id) || embeddedSubDeptIds.has(node.id)) continue;

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
      const embeddedDepts = allNodes.filter(
        n => n.parentId === effectiveParentId && embeddedDeptIds.has(n.id)
      );
      const deptCount = embeddedDepts.length;
      const programCount = allNodes.filter(
        n => n.parentId === effectiveParentId && embeddedProgramIds.has(n.id)
      ).length;

      if (deptCount > 0 || programCount > 0) {
        let listHeight = deptCount * DEPT_ROW_HEIGHT;
        // Add height for sub-departments under each embedded dept
        for (const dept of embeddedDepts) {
          const subDeptCount = allNodes.filter(
            n => n.parentId === dept.id && embeddedSubDeptIds.has(n.id)
          ).length;
          if (subDeptCount > 0) {
            listHeight += SUBDEPT_CONTAINER_PADDING + subDeptCount * SUBDEPT_ROW_HEIGHT;
          }
        }
        if (programCount > 0) {
          // Programs section has header + rows + wrapper padding
          listHeight += PROGRAM_HEADER_HEIGHT + programCount * PROGRAM_ROW_HEIGHT + 8;
        }
        effectiveHeight = DARK_CARD_HEADER_HEIGHT + listHeight + LIST_PADDING;
      } else {
        effectiveHeight = DARK_CARD_HEADER_HEIGHT;
      }
    } else if (parentNode?.category === 'executive-leadership') {
      const execCount = allNodes.filter(
        n => n.parentId === effectiveParentId && embeddedDeptIds.has(n.id)
      ).length;
      if (execCount > 0) {
        effectiveHeight = DARK_CARD_HEADER_HEIGHT + execCount * EXEC_ROW_HEIGHT + LIST_PADDING;
      } else if (effectiveParentId === RESIDENT_PASTOR_ID) {
        // Resident Pastor is a standalone dark card with no embedded children
        effectiveHeight = DARK_CARD_HEADER_HEIGHT;
      }
    } else if (parentNode?.category === 'senior-leadership') {
      const seniorCount = allNodes.filter(
        n => n.parentId === effectiveParentId && embeddedDeptIds.has(n.id)
      ).length;
      if (seniorCount > 0) {
        effectiveHeight = DARK_CARD_HEADER_HEIGHT + seniorCount * SENIOR_ROW_HEIGHT + LIST_PADDING;
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

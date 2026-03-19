import React from 'react';
import type { OrgNode, NodePosition } from '../../types';
import { NODE_HEIGHT } from '../../hooks/useOrgTree';

interface OrgChartConnectorsProps {
  nodes: OrgNode[];
  positions: Map<string, NodePosition>;
  canvasWidth: number;
  canvasHeight: number;
}

export function OrgChartConnectors({ nodes, positions, canvasWidth, canvasHeight }: OrgChartConnectorsProps) {
  const lines: React.ReactNode[] = [];

  for (const node of nodes) {
    if (!node.parentId) continue;
    const parentPos = positions.get(node.parentId);
    const childPos = positions.get(node.id);
    if (!parentPos || !childPos) continue;

    const x1 = parentPos.x + parentPos.width / 2;
    const y1 = parentPos.y + NODE_HEIGHT;
    const x2 = childPos.x + childPos.width / 2;
    const y2 = childPos.y;

    const midY = (y1 + y2) / 2;

    lines.push(
      <path
        key={`${node.parentId}-${node.id}`}
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

import React, { useMemo } from 'react';
import type { OrgNode, NodePosition } from '../../types';
import { CATEGORY_COLORS, STATUS_COLORS, getMinistryPalette, SENIOR_PASTORS_PALETTE, RESIDENT_PASTOR_PALETTE } from '../../types';
import {
  computeEmbeddedSets,
  PRINT_NODE_WIDTH as NODE_WIDTH,
  PRINT_WIDE_NODE_WIDTH as WIDE_NODE_WIDTH,
  PRINT_NODE_HEIGHT as NODE_HEIGHT,
  PRINT_H_GAP as H_GAP,
  PRINT_V_GAP as V_GAP,
} from '../../hooks/useOrgTree';
import { Sparkles } from 'lucide-react';
import { PRINT } from '../../constants/layout';

function getInitials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => /^[a-zA-Z]/.test(w)) // Only words starting with a letter
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function formatPersonDisplay(personTitle: string | undefined, personName: string): string {
  const title = personTitle?.trim();
  const name = personName?.trim();
  if (!name) return '';
  if (!title) return name;
  return `${title} ${name}`;
}

// Compute actual height of a node based on its embedded content
function computeNodeHeight(
  node: OrgNode,
  nodes: OrgNode[],
  embeddedDeptIds: Set<string>,
  embeddedProgramIds: Set<string>,
  embeddedSubDeptIds: Set<string>
): number {
  const isMinistry = node.category === 'ministry-system';
  const isExecTeam = node.category === 'executive-leadership';
  const isSeniorTeam = node.category === 'senior-leadership';
  const isResidentPastor = node.id === 'rp-001';

  if (isMinistry) {
    const embeddedDepts = nodes.filter(n => n.parentId === node.id && embeddedDeptIds.has(n.id));
    const programCount = nodes.filter(n => n.parentId === node.id && embeddedProgramIds.has(n.id)).length;

    if (embeddedDepts.length > 0 || programCount > 0) {
      let listHeight = embeddedDepts.length * PRINT.DEPT_ROW_HEIGHT;
      // Add sub-department heights
      for (const dept of embeddedDepts) {
        const subDeptCount = nodes.filter(n => n.parentId === dept.id && embeddedSubDeptIds.has(n.id)).length;
        if (subDeptCount > 0) {
          listHeight += PRINT.SUBDEPT_CONTAINER_PADDING + subDeptCount * PRINT.SUBDEPT_ROW_HEIGHT;
        }
      }
      if (programCount > 0) {
        listHeight += PRINT.PROGRAM_HEADER_HEIGHT + programCount * PRINT.PROGRAM_ROW_HEIGHT + 8;
      }
      return PRINT.DARK_CARD_HEADER_HEIGHT + listHeight + PRINT.LIST_PADDING;
    }
    return PRINT.DARK_CARD_HEADER_HEIGHT;
  }

  if (isExecTeam || isSeniorTeam) {
    const execCount = nodes.filter(n => n.parentId === node.id && embeddedDeptIds.has(n.id)).length;
    if (execCount > 0) {
      return PRINT.DARK_CARD_HEADER_HEIGHT + execCount * PRINT.EXEC_ROW_HEIGHT + PRINT.LIST_PADDING;
    }
  }

  if (isResidentPastor) {
    return PRINT.DARK_CARD_HEADER_HEIGHT;
  }

  return NODE_HEIGHT;
}

// Compute layout with all nodes expanded, using actual heights
function computePrintLayout(
  nodes: OrgNode[],
  embeddedDeptIds: Set<string>,
  embeddedProgramIds: Set<string>,
  embeddedSubDeptIds: Set<string>
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const nodeHeights = new Map<string, number>();

  // Pre-compute all node heights
  for (const node of nodes) {
    if (!embeddedDeptIds.has(node.id) && !embeddedProgramIds.has(node.id) && !embeddedSubDeptIds.has(node.id)) {
      nodeHeights.set(node.id, computeNodeHeight(node, nodes, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds));
    }
  }

  function getChildren(nodeId: string): OrgNode[] {
    return nodes
      .filter(n => n.parentId === nodeId && !embeddedDeptIds.has(n.id) && !embeddedProgramIds.has(n.id) && !embeddedSubDeptIds.has(n.id))
      .sort((a, b) => a.order - b.order);
  }

  function getNodeWidth(nodeId: string): number {
    const node = nodes.find(n => n.id === nodeId);
    if (node?.category === 'senior-leadership' || node?.category === 'executive-leadership') {
      return WIDE_NODE_WIDTH;
    }
    return NODE_WIDTH;
  }

  function subtreeWidth(nodeId: string): number {
    const nodeWidth = getNodeWidth(nodeId);
    const children = getChildren(nodeId);
    if (children.length === 0) return nodeWidth;
    const total = children.reduce((sum, c) => sum + subtreeWidth(c.id), 0);
    return Math.max(nodeWidth, total + H_GAP * (children.length - 1));
  }

  // Find max height among siblings at each depth, then use cumulative Y
  function getMaxHeightAtDepth(nodeIds: string[], depthMap: Map<string, number>): Map<number, number> {
    const maxHeights = new Map<number, number>();
    for (const id of nodeIds) {
      const depth = depthMap.get(id) ?? 0;
      const height = nodeHeights.get(id) ?? NODE_HEIGHT;
      maxHeights.set(depth, Math.max(maxHeights.get(depth) ?? 0, height));
    }
    return maxHeights;
  }

  // First pass: assign depths
  const depthMap = new Map<string, number>();
  function assignDepths(nodeId: string, depth: number) {
    depthMap.set(nodeId, depth);
    for (const child of getChildren(nodeId)) {
      assignDepths(child.id, depth + 1);
    }
  }

  const rootNodes = nodes.filter(n => !n.parentId).sort((a, b) => a.order - b.order);
  for (const root of rootNodes) {
    assignDepths(root.id, 0);
  }

  // Compute max height per depth level
  const maxHeightByDepth = getMaxHeightAtDepth(Array.from(depthMap.keys()), depthMap);

  // Compute cumulative Y offsets per depth
  const yOffsetByDepth = new Map<number, number>();
  let cumulativeY = 0;
  const maxDepth = Math.max(...Array.from(depthMap.values()), 0);
  for (let d = 0; d <= maxDepth; d++) {
    yOffsetByDepth.set(d, cumulativeY);
    cumulativeY += (maxHeightByDepth.get(d) ?? NODE_HEIGHT) + V_GAP;
  }

  function assignPositions(nodeId: string, centerX: number) {
    const depth = depthMap.get(nodeId) ?? 0;
    const nodeWidth = getNodeWidth(nodeId);
    const x = centerX - nodeWidth / 2;
    const y = yOffsetByDepth.get(depth) ?? 0;
    const height = nodeHeights.get(nodeId) ?? NODE_HEIGHT;
    positions.set(nodeId, { id: nodeId, x, y, width: nodeWidth, height });

    const children = getChildren(nodeId);
    if (children.length === 0) return;

    const totalW = children.reduce((s, c) => s + subtreeWidth(c.id), 0) + H_GAP * (children.length - 1);
    let cursor = centerX - totalW / 2;

    for (const child of children) {
      const cw = subtreeWidth(child.id);
      assignPositions(child.id, cursor + cw / 2);
      cursor += cw + H_GAP;
    }
  }

  if (rootNodes.length === 1) {
    const root = rootNodes[0];
    const totalW = subtreeWidth(root.id);
    assignPositions(root.id, totalW / 2 + H_GAP);
  } else if (rootNodes.length > 1) {
    const totalW = rootNodes.reduce((s, r) => s + subtreeWidth(r.id), 0) + H_GAP * (rootNodes.length - 1);
    let cursor = H_GAP;
    for (const root of rootNodes) {
      const rw = subtreeWidth(root.id);
      assignPositions(root.id, cursor + rw / 2);
      cursor += rw + H_GAP;
    }
  }

  return positions;
}

// Render connectors between nodes
function PrintConnectors({
  nodes,
  positions,
  embeddedDeptIds,
  embeddedProgramIds,
  embeddedSubDeptIds,
}: {
  nodes: OrgNode[];
  positions: Map<string, NodePosition>;
  embeddedDeptIds: Set<string>;
  embeddedProgramIds: Set<string>;
  embeddedSubDeptIds: Set<string>;
}) {
  const lines: React.ReactNode[] = [];

  for (const node of nodes) {
    if (!node.parentId) continue;
    if (embeddedDeptIds.has(node.id) || embeddedProgramIds.has(node.id) || embeddedSubDeptIds.has(node.id)) continue;

    let effectiveParentId = node.parentId;
    if (embeddedDeptIds.has(node.parentId)) {
      const dept = nodes.find(n => n.id === node.parentId);
      if (!dept?.parentId) continue;
      effectiveParentId = dept.parentId;
    }

    const parentPos = positions.get(effectiveParentId);
    const childPos = positions.get(node.id);
    if (!parentPos || !childPos) continue;

    const x1 = parentPos.x + parentPos.width / 2;
    const y1 = parentPos.y + parentPos.height;
    const x2 = childPos.x + childPos.width / 2;
    const y2 = childPos.y;
    const midY = (y1 + y2) / 2;

    lines.push(
      <path
        key={`${effectiveParentId}-${node.id}`}
        d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
        stroke="#94a3b8"
        strokeWidth="1.5"
        fill="none"
      />
    );
  }

  return <>{lines}</>;
}

// Render a single node card for print
function PrintNode({
  node,
  position,
  embeddedDepts,
  embeddedPrograms,
  embeddedExecs,
  embeddedSubDepts,
  subDeptsByParent,
}: {
  node: OrgNode;
  position: NodePosition;
  embeddedDepts: OrgNode[];
  embeddedPrograms: OrgNode[];
  embeddedExecs: OrgNode[];
  embeddedSubDepts: OrgNode[];
  subDeptsByParent?: Map<string, OrgNode[]>;
}) {
  const categoryColor = CATEGORY_COLORS[node.category];
  const statusColor = STATUS_COLORS[node.status];
  const isMinistry = node.category === 'ministry-system';
  const isExecTeam = node.category === 'executive-leadership' && embeddedExecs.length > 0;
  const isSeniorTeam = node.category === 'senior-leadership' && embeddedExecs.length > 0;
  const isResidentPastor = node.id === 'rp-001';
  const isDeptWithSubDepts = node.category === 'department' && embeddedSubDepts.length > 0;
  const isDarkCard = isMinistry || isExecTeam || isSeniorTeam || isResidentPastor || isDeptWithSubDepts;

  const ministryPalette = isMinistry ? getMinistryPalette(node.id, node.colorIndex) : null;
  const seniorPalette = isSeniorTeam ? SENIOR_PASTORS_PALETTE : null;
  const residentPalette = isResidentPastor ? RESIDENT_PASTOR_PALETTE : null;
  const deptPalette = isDeptWithSubDepts ? { accent: '#F97316', bg: '#431407', border: '#9a3412' } : null;
  const activePalette = ministryPalette ?? seniorPalette ?? residentPalette ?? deptPalette;
  const programColor = CATEGORY_COLORS['program'];

  if (isDarkCard) {
    return (
      <div
        className="print-node-card"
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          width: position.width,
          backgroundColor: activePalette?.bg ?? (isExecTeam ? '#1e3a8a' : categoryColor),
          borderColor: activePalette?.border ?? (isExecTeam ? '#1e40af' : categoryColor),
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 10,
          color: 'white',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '10px 12px 8px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: activePalette?.accent ?? categoryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {isResidentPastor && node.personName
                ? getInitials(node.personName)
                : getInitials(node.title)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {isResidentPastor ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>
                    {node.personName ? formatPersonDisplay(node.personTitle, node.personName) : '—'}
                  </div>
                  <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>{node.title}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>{node.title}</div>
                  <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>
                    {node.personName
                      ? formatPersonDisplay(node.personTitle, node.personName)
                      : isMinistry ? 'Ministry' : isSeniorTeam ? 'Senior Leadership' : isDeptWithSubDepts ? 'Department' : 'Executive'}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Embedded list */}
        {isMinistry && (embeddedDepts.length > 0 || embeddedPrograms.length > 0) && (
          <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '4px 0 6px' }}>
            {embeddedDepts.map(dept => {
              const subDepts = subDeptsByParent?.get(dept.id) || [];
              return (
                <div key={dept.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 10px', fontSize: 10 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: STATUS_COLORS[dept.status], flexShrink: 0 }} />
                    <span style={{ opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dept.title}
                      {subDepts.length > 0 && <span style={{ opacity: 0.5, marginLeft: 4 }}>({subDepts.length})</span>}
                    </span>
                  </div>
                  {subDepts.length > 0 && (
                    <div style={{ marginLeft: 16, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 8, marginTop: 2, marginBottom: 2 }}>
                      {subDepts.map(subDept => (
                        <div key={subDept.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '1px 0', fontSize: 9 }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: STATUS_COLORS[subDept.status], flexShrink: 0 }} />
                          <span style={{ opacity: 0.7 }}>{subDept.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {embeddedPrograms.length > 0 && (
              <div style={{ margin: '4px 6px 0', padding: '4px 6px', backgroundColor: `${programColor}20`, borderRadius: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, fontWeight: 600, color: programColor, textTransform: 'uppercase', marginBottom: 2 }}>
                  <Sparkles style={{ width: 8, height: 8 }} />
                  Programs
                </div>
                {embeddedPrograms.map(prog => (
                  <div key={prog.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 10 }}>
                    <span style={{ width: 5, height: 5, backgroundColor: STATUS_COLORS[prog.status], transform: 'rotate(45deg)', flexShrink: 0 }} />
                    <span style={{ opacity: 0.9 }}>{prog.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(isExecTeam || isSeniorTeam) && embeddedExecs.length > 0 && (
          <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '4px 0 6px' }}>
            {embeddedExecs.map(exec => (
              <div key={exec.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', fontSize: 10 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: activePalette?.accent ?? categoryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(exec.personName || exec.title)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, opacity: 0.9 }}>{exec.title}</div>
                  {exec.personName && <div style={{ fontSize: 9, opacity: 0.6 }}>{exec.personName}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {isDeptWithSubDepts && embeddedSubDepts.length > 0 && (
          <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '4px 0 6px' }}>
            {embeddedSubDepts.map(subDept => (
              <div key={subDept.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 10px', fontSize: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: STATUS_COLORS[subDept.status], flexShrink: 0 }} />
                <span style={{ opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subDept.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Standard white card
  return (
    <div
      className="print-node-card"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: position.width,
        backgroundColor: 'white',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '#e2e8f0',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* Category bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: categoryColor,
          borderTopLeftRadius: 10,
          borderBottomLeftRadius: 10,
        }}
      />

      {/* Content */}
      <div style={{ padding: '10px 10px 10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a', lineHeight: 1.2, flex: 1 }}>
            {node.title}
          </div>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: statusColor,
              flexShrink: 0,
              marginLeft: 6,
              marginTop: 2,
            }}
          />
        </div>
        {node.personName ? (
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>{formatPersonDisplay(node.personTitle, node.personName)}</div>
        ) : (
          <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 3, fontStyle: 'italic' }}>—</div>
        )}
        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
          <span
            style={{
              fontSize: 9,
              padding: '2px 6px',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              borderRadius: 10,
              fontWeight: 500,
            }}
          >
            {node.language === 'english' ? 'EN' : node.language === 'french' ? 'FR' : 'EN/FR'}
          </span>
          {node.status !== 'active' && (
            <span
              style={{
                fontSize: 9,
                padding: '2px 6px',
                backgroundColor: node.status === 'vacant' ? '#fef3c7' : '#f1f5f9',
                color: node.status === 'vacant' ? '#b45309' : '#94a3b8',
                borderRadius: 10,
                fontWeight: 500,
              }}
            >
              {node.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface PrintableOrgChartProps {
  nodes: OrgNode[];
  churchName: string;
  title: string;
}

export function PrintableOrgChart({ nodes, churchName, title }: PrintableOrgChartProps) {
  const { embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds } = useMemo(() => computeEmbeddedSets(nodes), [nodes]);

  const positions = useMemo(
    () => computePrintLayout(nodes, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds),
    [nodes, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds]
  );

  const canvasWidth = useMemo(() => {
    let maxX = 400;
    for (const pos of positions.values()) maxX = Math.max(maxX, pos.x + pos.width + H_GAP);
    return maxX;
  }, [positions]);

  const canvasHeight = useMemo(() => {
    let maxY = 200;
    for (const pos of positions.values()) maxY = Math.max(maxY, pos.y + pos.height + V_GAP);
    return maxY;
  }, [positions]);

  // Calculate scale to fit on page (landscape A4/Letter approximate printable area)
  const pageWidth = 1000;
  const pageHeight = 650; // Leave room for header
  const scaleX = pageWidth / canvasWidth;
  const scaleY = pageHeight / canvasHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

  // Scaled dimensions for the wrapper
  const scaledWidth = canvasWidth * scale;
  const scaledHeight = canvasHeight * scale;

  const visibleNodes = nodes.filter(n => !embeddedDeptIds.has(n.id) && !embeddedProgramIds.has(n.id) && !embeddedSubDeptIds.has(n.id));

  return (
    <div id="print-area" className="print-container" style={{
      padding: '10px 15px',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div className="print-header" style={{
        textAlign: 'center',
        marginBottom: 12,
        paddingBottom: 10,
        borderBottom: '2px solid #e2e8f0',
        width: '100%',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 2px 0' }}>{churchName}</h1>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#64748b', margin: 0 }}>{title}</p>
        <p className="print-date" style={{ fontSize: 9, fontWeight: 400, color: '#94a3b8', marginTop: 3 }}>
          Generated on {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Chart wrapper - sized to scaled dimensions for proper centering */}
      <div className="print-chart-wrapper" style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Scaled size container */}
        <div style={{
          width: scaledWidth,
          height: scaledHeight,
          position: 'relative',
          overflow: 'visible',
        }}>
          {/* Chart with scaling - positioned at top-left of scaled container */}
          <div
            className="print-chart"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: canvasWidth,
              height: canvasHeight,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvasWidth,
            height: canvasHeight,
            overflow: 'visible',
          }}
        >
          <PrintConnectors
            nodes={nodes}
            positions={positions}
            embeddedDeptIds={embeddedDeptIds}
            embeddedProgramIds={embeddedProgramIds}
            embeddedSubDeptIds={embeddedSubDeptIds}
          />
        </svg>

        {visibleNodes.map(node => {
          const pos = positions.get(node.id);
          if (!pos) return null;

          const embeddedDepts = node.category === 'ministry-system'
            ? nodes.filter(n => n.parentId === node.id && embeddedDeptIds.has(n.id)).sort((a, b) => a.order - b.order)
            : [];

          const embeddedPrograms = node.category === 'ministry-system'
            ? nodes.filter(n => n.parentId === node.id && embeddedProgramIds.has(n.id)).sort((a, b) => a.order - b.order)
            : [];

          // Sub-departments grouped by parent department (for ministry cards)
          const subDeptsByParent = node.category === 'ministry-system' && embeddedDepts.length > 0
            ? new Map(
                embeddedDepts.map(dept => [
                  dept.id,
                  nodes
                    .filter(n => n.parentId === dept.id && embeddedSubDeptIds.has(n.id))
                    .sort((a, b) => a.order - b.order)
                ])
              )
            : undefined;

          const embeddedExecs = (node.category === 'executive-leadership' || node.category === 'senior-leadership')
            ? nodes.filter(n => n.parentId === node.id && embeddedDeptIds.has(n.id)).sort((a, b) => a.order - b.order)
            : [];

          const embeddedSubDepts = node.category === 'department'
            ? nodes.filter(n => n.parentId === node.id && embeddedSubDeptIds.has(n.id)).sort((a, b) => a.order - b.order)
            : [];

          return (
            <PrintNode
              key={node.id}
              node={node}
              position={pos}
              embeddedDepts={embeddedDepts}
              embeddedPrograms={embeddedPrograms}
              embeddedExecs={embeddedExecs}
              subDeptsByParent={subDeptsByParent}
              embeddedSubDepts={embeddedSubDepts}
            />
          );
        })}
        </div>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, ChevronDown, ChevronUp, List, BarChart2, Users, User, Type, UserCircle } from 'lucide-react';
import { OrgChartNode } from './OrgChartNode';
import { OrgChartConnectors } from './OrgChartConnectors';
import { computeLayout, NODE_WIDTH, NODE_HEIGHT, H_GAP, V_GAP } from '../../hooks/useOrgTree';
import type { OrgNode, ZoomLevel, CardDisplayMode } from '../../types';
import { ZOOM_LEVELS } from '../../types';
import { cn } from '../../lib/utils';
import type { TranslationKeys } from '../../data/translations';

interface OrgChartCanvasProps {
  nodes: OrgNode[];
  visibleNodes: OrgNode[];
  rootNodes: OrgNode[];
  matchingIds: Set<string>;
  hasActiveFilter: boolean;
  embeddedDeptIds: Set<string>;
  embeddedProgramIds: Set<string>;
  embeddedSubDeptIds: Set<string>;
  subDeptContainerIds: Set<string>;
  cardDisplayMode: CardDisplayMode;
  onCardDisplayModeChange: (mode: CardDisplayMode) => void;
  zoomLevel: ZoomLevel;
  onZoomChange: (z: ZoomLevel) => void;
  selectedId: string | null;
  onSelectNode: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onEdit: (node: OrgNode) => void;
  onReassign: (node: OrgNode) => void;
  onDelete: (node: OrgNode) => void;
  onToggleCollapse: (id: string) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  chartView: 'visual' | 'list' | 'leaders';
  onChartViewChange: (v: 'visual' | 'list' | 'leaders') => void;
  t: TranslationKeys;
}

export function OrgChartCanvas({
  nodes,
  visibleNodes,
  rootNodes,
  matchingIds,
  hasActiveFilter,
  embeddedDeptIds,
  embeddedProgramIds,
  embeddedSubDeptIds,
  subDeptContainerIds,
  cardDisplayMode,
  onCardDisplayModeChange,
  zoomLevel,
  onZoomChange,
  selectedId,
  onSelectNode,
  onAddChild,
  onEdit,
  onReassign,
  onDelete,
  onToggleCollapse,
  onCollapseAll,
  onExpandAll,
  chartView,
  onChartViewChange,
  t,
}: OrgChartCanvasProps) {
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const positions = useMemo(
    () => computeLayout(visibleNodes, rootNodes, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds, subDeptContainerIds),
    [visibleNodes, rootNodes, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds, subDeptContainerIds],
  );

  const canvasWidth = useMemo(() => {
    let maxX = 400;
    for (const pos of positions.values()) maxX = Math.max(maxX, pos.x + pos.width + H_GAP);
    return maxX;
  }, [positions]);

  const canvasHeight = useMemo(() => {
    let maxY = 200;
    for (const pos of positions.values()) maxY = Math.max(maxY, pos.y + NODE_HEIGHT + V_GAP);
    return maxY;
  }, [positions]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-node]') || target.closest('button') || target.closest('[data-radix-popper-content-wrapper]')) return;
    e.preventDefault();
    setIsPanning(true);
    panStart.current = { mouseX: e.clientX, mouseY: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !panStart.current) return;
    const dx = e.clientX - panStart.current.mouseX;
    const dy = e.clientY - panStart.current.mouseY;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStart.current = null;
  }, []);

  const zoomIdx = ZOOM_LEVELS.indexOf(zoomLevel);
  const canZoomIn = zoomIdx < ZOOM_LEVELS.length - 1;
  const canZoomOut = zoomIdx > 0;

  const isEmpty = visibleNodes.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 flex-shrink-0 no-print">
        {/* View toggle */}
        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => onChartViewChange('visual')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
              chartView === 'visual' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50',
            )}
          >
            <BarChart2 className="h-3 w-3" />
            {t.chartView}
          </button>
          <button
            onClick={() => onChartViewChange('leaders')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
              chartView === 'leaders' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50',
            )}
          >
            <Users className="h-3 w-3" />
            Leaders
          </button>
          <button
            onClick={() => onChartViewChange('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
              chartView === 'list' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50',
            )}
          >
            <List className="h-3 w-3" />
            {t.listView}
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200" />

        {/* Display mode toggle */}
        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
          {([
            { mode: 'title' as const, icon: Type, label: 'Title' },
            { mode: 'name' as const, icon: User, label: 'Name' },
            { mode: 'both' as const, icon: UserCircle, label: 'Both' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => onCardDisplayModeChange(mode)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors',
                cardDisplayMode === mode ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50',
              )}
              title={label}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-slate-200" />

        {/* Zoom controls */}
        {(chartView === 'visual' || chartView === 'leaders') && (
          <>
            <button
              onClick={() => canZoomOut && onZoomChange(ZOOM_LEVELS[zoomIdx - 1])}
              disabled={!canZoomOut}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title={t.zoomOut}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-medium text-slate-600 w-10 text-center tabular-nums">{zoomLevel}%</span>
            <button
              onClick={() => canZoomIn && onZoomChange(ZOOM_LEVELS[zoomIdx + 1])}
              disabled={!canZoomIn}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              title={t.zoomIn}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-200" />

            <button
              onClick={onCollapseAll}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title={t.collapse}
            >
              <ChevronUp className="h-3 w-3" />
              {t.collapse}
            </button>
            <button
              onClick={onExpandAll}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title={t.expand}
            >
              <ChevronDown className="h-3 w-3" />
              {t.expand}
            </button>
          </>
        )}

        <button
          onClick={() => setPan({ x: 40, y: 40 })}
          className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Reset view"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={cn(
          'flex-1 overflow-auto relative select-none',
          isPanning ? 'cursor-grabbing' : 'cursor-grab',
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
            <svg viewBox="0 0 120 80" className="w-32 h-24 opacity-30" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="45" y="5" width="30" height="18" rx="3" />
              <line x1="60" y1="23" x2="60" y2="33" />
              <rect x="10" y="33" width="30" height="18" rx="3" />
              <rect x="80" y="33" width="30" height="18" rx="3" />
              <line x1="60" y1="33" x2="25" y2="33" />
              <line x1="60" y1="33" x2="95" y2="33" />
            </svg>
            <p className="text-sm">{hasActiveFilter ? t.noResults : t.emptyChart}</p>
          </div>
        ) : (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel / 100})`,
              transformOrigin: '0 0',
              position: 'relative',
              width: canvasWidth,
              height: canvasHeight,
            }}
          >
            <OrgChartConnectors
              nodes={visibleNodes}
              allNodes={nodes}
              positions={positions}
              embeddedDeptIds={embeddedDeptIds}
              embeddedProgramIds={embeddedProgramIds}
              embeddedSubDeptIds={embeddedSubDeptIds}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
            />
            {visibleNodes
              .filter(node => !embeddedDeptIds.has(node.id) && !embeddedProgramIds.has(node.id) && !embeddedSubDeptIds.has(node.id))
              .map(node => {
                const pos = positions.get(node.id);
                if (!pos) return null;

                // Embedded departments for ministry cards
                const embeddedDepts = node.category === 'ministry-system'
                  ? nodes
                      .filter(n => n.parentId === node.id && embeddedDeptIds.has(n.id))
                      .sort((a, b) => a.order - b.order)
                  : [];

                // Embedded programs for ministry cards
                const embeddedPrograms = node.category === 'ministry-system'
                  ? nodes
                      .filter(n => n.parentId === node.id && embeddedProgramIds.has(n.id))
                      .sort((a, b) => a.order - b.order)
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

                // Members/volunteers grouped by sub-department (for ministry cards)
                const membersByParent = node.category === 'ministry-system' && subDeptsByParent
                  ? (() => {
                      const map = new Map<string, OrgNode[]>();
                      for (const [, subDepts] of subDeptsByParent) {
                        for (const subDept of subDepts) {
                          const members = nodes
                            .filter(n => n.parentId === subDept.id && embeddedSubDeptIds.has(n.id))
                            .sort((a, b) => a.order - b.order);
                          if (members.length > 0) map.set(subDept.id, members);
                        }
                      }
                      return map;
                    })()
                  : undefined;

                // Embedded executives for executive-leadership and senior-leadership cards
                // Include direct children + grandchildren of embedded dept/team nodes (flattened)
                const embeddedExecs = (node.category === 'executive-leadership' || node.category === 'senior-leadership')
                  ? (() => {
                      const directEmbedded = nodes.filter(n => n.parentId === node.id && embeddedDeptIds.has(n.id));
                      const directIds = new Set(directEmbedded.map(n => n.id));
                      const grandchildren = nodes.filter(n => n.parentId && directIds.has(n.parentId) && embeddedDeptIds.has(n.id));
                      return [...directEmbedded, ...grandchildren].sort((a, b) => a.order - b.order);
                    })()
                  : [];

                // Embedded sub-departments for department cards (standalone dept cards, not embedded ones)
                const embeddedSubDepts = node.category === 'department' && !embeddedDeptIds.has(node.id)
                  ? nodes
                      .filter(n => n.parentId === node.id && embeddedSubDeptIds.has(n.id))
                      .sort((a, b) => a.order - b.order)
                  : [];

                // Effective visual children: non-dept/non-program/non-subdept direct children + hoisted programs from depts
                const ownChildren = nodes.filter(n => n.parentId === node.id && !embeddedDeptIds.has(n.id) && !embeddedProgramIds.has(n.id) && !embeddedSubDeptIds.has(n.id));
                const hoistedPrograms = embeddedDepts.length > 0
                  ? nodes.filter(n => embeddedDepts.some(d => d.id === n.parentId) && !embeddedSubDeptIds.has(n.id))
                  : [];
                const directChildCount = ownChildren.length + hoistedPrograms.length;
                const hasChildren = directChildCount > 0;

                return (
                  <div key={node.id} data-node={node.id}>
                    <OrgChartNode
                      node={node}
                      position={pos}
                      embeddedDepts={embeddedDepts}
                      embeddedPrograms={embeddedPrograms}
                      embeddedExecs={embeddedExecs}
                      embeddedSubDepts={embeddedSubDepts}
                      subDeptsByParent={subDeptsByParent}
                      membersByParent={membersByParent}
                      cardDisplayMode={cardDisplayMode}
                      isSelected={selectedId === node.id}
                      isMatching={matchingIds.has(node.id)}
                      hasActiveFilter={hasActiveFilter}
                      hasChildren={hasChildren}
                      childCount={directChildCount}
                      onSelect={onSelectNode}
                      onAddChild={onAddChild}
                      onEdit={onEdit}
                      onReassign={onReassign}
                      onDelete={onDelete}
                      onToggleCollapse={onToggleCollapse}
                      t={t}
                    />
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { MoreVertical, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/DropdownMenu';
import type { OrgNode, NodePosition } from '../../types';
import { CATEGORY_COLORS, STATUS_COLORS } from '../../types';
import { cn } from '../../lib/utils';
import type { TranslationKeys } from '../../data/translations';

const LANGUAGE_LABELS: Record<OrgNode['language'], string> = {
  english: 'EN',
  french: 'FR',
  both: 'EN/FR',
};

interface OrgChartNodeProps {
  node: OrgNode;
  position: NodePosition;
  isSelected: boolean;
  isMatching: boolean;
  hasActiveFilter: boolean;
  hasChildren: boolean;
  childCount: number;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onEdit: (node: OrgNode) => void;
  onReassign: (node: OrgNode) => void;
  onDelete: (node: OrgNode) => void;
  onToggleCollapse: (id: string) => void;
  t: TranslationKeys;
}

export function OrgChartNode({
  node,
  position,
  isSelected,
  isMatching,
  hasActiveFilter,
  hasChildren,
  childCount,
  onSelect,
  onAddChild,
  onEdit,
  onReassign,
  onDelete,
  onToggleCollapse,
  t,
}: OrgChartNodeProps) {
  const categoryColor = CATEGORY_COLORS[node.category];
  const statusColor = STATUS_COLORS[node.status];
  const isDimmed = hasActiveFilter && !isMatching;
  const isHighlighted = hasActiveFilter && isMatching;

  return (
    <div
      className={cn(
        'absolute group',
        'org-node-card',
        'rounded-xl border border-slate-200 bg-white shadow-md cursor-pointer',
        'transition-all duration-150',
        isSelected && !isHighlighted && 'ring-2 ring-slate-900 border-slate-900',
        isHighlighted && 'ring-2 border-transparent',
        isDimmed && 'opacity-30 pointer-events-none',
      )}
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        zIndex: isSelected ? 2 : 1,
        ...(isHighlighted ? { boxShadow: `0 0 0 2px ${categoryColor}, 0 4px 12px rgba(0,0,0,0.1)` } : {}),
      }}
      onClick={() => onSelect(node.id)}
    >
      {/* Category color bar */}
      <div
        className="org-node-category-bar absolute left-0 top-0 bottom-0 rounded-l-xl"
        style={{ width: 5, backgroundColor: categoryColor }}
      />

      {/* Status dot */}
      <div
        className="absolute top-2.5 right-8"
        style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: statusColor, flexShrink: 0 }}
      />

      {/* Kebab menu */}
      <DropdownMenuRoot>
        <DropdownMenuTrigger asChild>
          <button
            onClick={e => e.stopPropagation()}
            className="absolute top-1.5 right-1.5 p-1 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-700 hover:bg-slate-100 transition-opacity focus:opacity-100 focus:outline-none"
            title="Options"
          >
            <MoreVertical className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={e => { e.stopPropagation?.(); onEdit(node); }}>
            {t.edit}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={e => { e.stopPropagation?.(); onAddChild(node.id); }}>
            {t.addChild}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={e => { e.stopPropagation?.(); onReassign(node); }}>
            {t.reassignParent}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-rose-600 data-[highlighted]:bg-rose-50"
            onSelect={e => { e.stopPropagation?.(); onDelete(node); }}
          >
            {t.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuRoot>

      {/* Content */}
      <div className="pl-3.5 pr-2 pt-2.5 pb-3">
        <div className="text-xs font-semibold text-slate-900 leading-tight line-clamp-2 pr-1">{node.title}</div>
        {node.personName ? (
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">{node.personName}</div>
        ) : (
          <div className="text-[11px] text-slate-300 mt-0.5 italic">—</div>
        )}
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
            {LANGUAGE_LABELS[node.language]}
          </span>
          {node.status !== 'active' && (
            <span className={cn(
              'inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              node.status === 'vacant' && 'bg-amber-50 text-amber-700',
              node.status === 'inactive' && 'bg-slate-100 text-slate-400',
            )}>
              {node.status}
            </span>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      {hasChildren && (
        <button
          onClick={e => { e.stopPropagation(); onToggleCollapse(node.id); }}
          className={cn(
            'absolute -bottom-3 left-1/2 -translate-x-1/2 z-10',
            'flex items-center justify-center rounded-full bg-white border border-slate-300',
            'shadow-sm hover:bg-slate-50 hover:border-slate-400 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-slate-900',
          )}
          style={{ width: 20, height: 20 }}
          title={node.isCollapsed ? t.expand : t.collapse}
        >
          {node.isCollapsed ? (
            <span className="text-[9px] font-bold text-slate-600">+{childCount}</span>
          ) : (
            <ChevronUp className="h-3 w-3 text-slate-500" />
          )}
        </button>
      )}
    </div>
  );
}

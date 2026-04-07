import React from 'react';
import { MoreVertical, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/DropdownMenu';
import type { OrgNode, NodePosition } from '../../types';
import { CATEGORY_COLORS, STATUS_COLORS, getMinistryPalette, SENIOR_PASTORS_PALETTE, RESIDENT_PASTOR_PALETTE } from '../../types';
import { cn } from '../../lib/utils';
import type { TranslationKeys } from '../../data/translations';
import { EmbeddedDeptList } from './EmbeddedDeptList';
import { EmbeddedExecList } from './EmbeddedExecList';

const LANGUAGE_LABELS: Record<OrgNode['language'], string> = {
  english: 'EN',
  french: 'FR',
  both: 'EN/FR',
};

function getInitials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => /^[a-zA-Z]/.test(w)) // Only words starting with a letter
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

// Format person display: "Pastor John Smith" or just "John Smith"
function formatPersonDisplay(personTitle: string | undefined, personName: string): string {
  const title = personTitle?.trim();
  const name = personName?.trim();
  if (!name) return '';
  if (!title) return name;
  return `${title} ${name}`;
}

interface OrgChartNodeProps {
  node: OrgNode;
  position: NodePosition;
  embeddedDepts: OrgNode[];
  embeddedPrograms: OrgNode[];
  embeddedExecs: OrgNode[];
  embeddedSubDepts: OrgNode[];
  subDeptsByParent?: Map<string, OrgNode[]>;
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
  embeddedDepts,
  embeddedPrograms,
  embeddedExecs,
  embeddedSubDepts,
  subDeptsByParent,
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
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const categoryColor = CATEGORY_COLORS[node.category];
  const statusColor = STATUS_COLORS[node.status];
  const isDimmed = hasActiveFilter && !isMatching;
  const isHighlighted = hasActiveFilter && isMatching;
  const isMinistry = node.category === 'ministry-system';
  const isExecTeam = node.category === 'executive-leadership' && embeddedExecs.length > 0;
  const isSeniorTeam = node.category === 'senior-leadership' && embeddedExecs.length > 0;
  const isDeptWithSubDepts = node.category === 'department' && embeddedSubDepts.length > 0;
  const isDarkCard = isMinistry || isExecTeam || isSeniorTeam || isDeptWithSubDepts;

  const ministryPalette = isMinistry ? getMinistryPalette(node.id, node.colorIndex) : null;
  const seniorPalette = isSeniorTeam
    ? (node.id === 'rp-001' ? RESIDENT_PASTOR_PALETTE : SENIOR_PASTORS_PALETTE)
    : null;
  // Departments with sub-departments use the department orange color
  const deptPalette = isDeptWithSubDepts ? { accent: '#F97316', bg: '#431407', border: '#9a3412' } : null;
  const activePalette = ministryPalette ?? seniorPalette ?? deptPalette;
  // Exec team uses Tailwind blue; ministry/senior/resident/dept use inline palette styles
  const darkBg = (isExecTeam && !activePalette) ? 'bg-blue-900 border-blue-700' : '';

  return (
    <div
      className={cn(
        'absolute group org-node-card rounded-xl border cursor-pointer transition-all duration-150 shadow-md',
        isDarkCard
          ? `${darkBg} text-white`
          : 'bg-white border-slate-200 text-slate-900',
        isSelected && !isHighlighted && !isDarkCard && 'ring-2 ring-slate-900 border-slate-900',
        isSelected && isDarkCard && 'ring-2 ring-white/60',
        isHighlighted && 'ring-2 border-transparent',
        isDimmed && 'opacity-30 pointer-events-none',
      )}
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        zIndex: isSelected ? 2 : 1,
        ...(activePalette ? { backgroundColor: activePalette.bg, borderColor: activePalette.border } : {}),
        ...(isHighlighted && !isDarkCard ? { boxShadow: `0 0 0 2px ${categoryColor}, 0 4px 12px rgba(0,0,0,0.1)` } : {}),
      }}
      onClick={() => onSelect(node.id)}
    >
      {isDarkCard ? (
        /* ── DARK CARD (ministry or exec team) ── */
        <>
          {/* Header */}
          <div className="flex items-start gap-2 px-3 pt-3 pb-2 rounded-t-xl bg-white/10">
            {/* Avatar circle with initials */}
            <div
              className="flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold text-[11px]"
              style={{ width: 32, height: 32, backgroundColor: activePalette?.accent ?? categoryColor }}
            >
              {getInitials(node.title)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-white leading-tight line-clamp-2 pr-1">
                {node.title}
              </div>
              <div className="text-[10px] text-white/50 mt-0.5">
                {node.personName
                  ? formatPersonDisplay(node.personTitle, node.personName)
                  : isMinistry ? 'Ministry Division' : isSeniorTeam ? 'Senior Leadership' : isDeptWithSubDepts ? 'Department' : 'Executive Leadership'}
              </div>
            </div>
            {/* Kebab menu — admin only */}
            {isAdmin && (
              <DropdownMenuRoot>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={e => e.stopPropagation()}
                    className="flex-shrink-0 p-1 rounded-md text-white/30 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10 transition-opacity focus:opacity-100 focus:outline-none"
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
            )}
          </div>

          {/* Embedded list — departments and programs for ministries, executives for exec teams, sub-depts for depts */}
          {isMinistry ? (
            <div className="bg-black/25 rounded-b-xl overflow-hidden">
              <EmbeddedDeptList
                depts={embeddedDepts}
                programs={embeddedPrograms}
                subDeptsByParent={subDeptsByParent}
                accentColor={activePalette?.accent}
                onEdit={onEdit}
                onSelect={onSelect}
                onAddChild={onAddChild}
                onDelete={onDelete}
                onToggleCollapse={onToggleCollapse}
                isAdmin={isAdmin}
              />
            </div>
          ) : isDeptWithSubDepts ? (
            <div className="bg-black/25 rounded-b-xl overflow-hidden">
              <EmbeddedDeptList
                depts={embeddedSubDepts}
                accentColor={activePalette?.accent}
                onEdit={onEdit}
                onSelect={onSelect}
                onAddChild={onAddChild}
                onDelete={onDelete}
                onToggleCollapse={onToggleCollapse}
                isAdmin={isAdmin}
              />
            </div>
          ) : (isExecTeam || isSeniorTeam) ? (
            <div className="bg-black/25 rounded-b-xl overflow-hidden">
              <EmbeddedExecList
                execs={embeddedExecs}
                accentColor={activePalette?.accent ?? categoryColor}
                onEdit={onEdit}
                onSelect={onSelect}
                isAdmin={isAdmin}
              />
            </div>
          ) : null}
        </>
      ) : (
        /* ── STANDARD WHITE CARD ── */
        <>
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

          {/* Kebab menu — admin only */}
          {isAdmin && (
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
          )}

          {/* Content */}
          <div className="pl-3.5 pr-2 pt-2.5 pb-3">
            <div className="text-xs font-semibold text-slate-900 leading-tight line-clamp-2 pr-1">{node.title}</div>
            {node.personName ? (
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">{formatPersonDisplay(node.personTitle, node.personName)}</div>
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
        </>
      )}

      {/* Collapse toggle — same for both styles */}
      {hasChildren && (
        <button
          onClick={e => { e.stopPropagation(); onToggleCollapse(node.id); }}
          className={cn(
            'absolute -bottom-3 left-1/2 -translate-x-1/2 z-10',
            'flex items-center justify-center rounded-full border shadow-sm transition-colors',
            'focus:outline-none focus:ring-2',
            isDarkCard
              ? activePalette
                ? 'focus:ring-white/40'                      // ministry or senior — inline styled
                : 'bg-blue-900 border-blue-700 hover:bg-blue-800 focus:ring-white/40'  // exec team
              : 'bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-900',
          )}
          style={{
            width: 20,
            height: 20,
            ...(activePalette ? { backgroundColor: activePalette.bg, borderColor: activePalette.border } : {}),
          }}
          title={node.isCollapsed ? t.expand : t.collapse}
        >
          {node.isCollapsed ? (
            <span className={cn('text-[9px] font-bold', isDarkCard ? 'text-white' : 'text-slate-600')}>
              +{childCount}
            </span>
          ) : (
            <ChevronUp className={cn('h-3 w-3', isDarkCard ? 'text-white/70' : 'text-slate-500')} />
          )}
        </button>
      )}
    </div>
  );
}

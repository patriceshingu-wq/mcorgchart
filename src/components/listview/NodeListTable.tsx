import React, { useState } from 'react';
import { Edit2, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { OrgNode } from '../../types';
import { CATEGORY_COLORS, STATUS_COLORS } from '../../types';
import type { TranslationKeys } from '../../data/translations';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

type SortKey = 'title' | 'category' | 'status' | 'order';
type SortDir = 'asc' | 'desc';

const LANG_LABELS: Record<OrgNode['language'], string> = {
  english: 'EN', french: 'FR', both: 'EN/FR',
};
const CATEGORY_LABEL_KEYS: Record<OrgNode['category'], keyof TranslationKeys> = {
  'senior-leadership': 'seniorLeadership',
  'executive-leadership': 'executiveLeadership',
  'ministry-system': 'ministrySystem',
  'department': 'department',
  'program': 'program',
};
const STATUS_LABEL_KEYS: Record<OrgNode['status'], keyof TranslationKeys> = {
  active: 'active', vacant: 'vacant', inactive: 'inactive',
};

interface NodeListTableProps {
  nodes: OrgNode[];
  selectedId: string | null;
  onSelectNode: (id: string) => void;
  onEdit: (node: OrgNode) => void;
  onDelete: (node: OrgNode) => void;
  t: TranslationKeys;
}

export function NodeListTable({ nodes, selectedId, onSelectNode, onEdit, onDelete, t }: NodeListTableProps) {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [sortKey, setSortKey] = useState<SortKey>('order');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const sorted = [...nodes].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'title') cmp = a.title.localeCompare(b.title);
    else if (sortKey === 'category') cmp = a.category.localeCompare(b.category);
    else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
    else cmp = a.order - b.order;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-slate-300" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-slate-700" />
      : <ArrowDown className="h-3 w-3 text-slate-700" />;
  }

  const colHead = (label: string, key?: SortKey) => (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap',
        key && 'cursor-pointer hover:text-slate-900 select-none',
      )}
      onClick={() => key && handleSort(key)}
    >
      <div className="flex items-center gap-1">
        {label}
        {key && <SortIcon col={key} />}
      </div>
    </th>
  );

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <p className="text-sm">{t.noResults}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
          <tr>
            {colHead(t.title, 'title')}
            {colHead(t.personName)}
            {colHead(t.category, 'category')}
            {colHead(t.language)}
            {colHead(t.status, 'status')}
            {colHead(t.reportsTo)}
            {isAdmin && (
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map(node => {
            const parent = nodes.find(n => n.id === node.parentId);
            const catColor = CATEGORY_COLORS[node.category];
            const statusColor = STATUS_COLORS[node.status];
            return (
              <tr
                key={node.id}
                onClick={() => onSelectNode(node.id)}
                className={cn(
                  'border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50',
                  selectedId === node.id && 'bg-slate-50',
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: catColor, flexShrink: 0 }} />
                    <span className="font-medium text-slate-900 line-clamp-1">{node.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]">{node.personName || '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" style={{ borderLeft: `3px solid ${catColor}` }}>
                    {t[CATEGORY_LABEL_KEYS[node.category]] as string}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{LANG_LABELS[node.language]}</Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusColor }} />
                    {t[STATUS_LABEL_KEYS[node.status]] as string}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{parent?.title ?? '—'}</td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); onEdit(node); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title={t.edit}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onDelete(node); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title={t.delete}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

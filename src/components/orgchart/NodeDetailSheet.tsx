import React from 'react';
import { SheetRoot, SheetContent, SheetHeader, SheetTitle } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Edit2, Trash2, ExternalLink } from 'lucide-react';
import type { OrgNode } from '../../types';
import { CATEGORY_COLORS, STATUS_COLORS } from '../../types';
import type { TranslationKeys } from '../../data/translations';
import { useAuth } from '../../contexts/AuthContext';

const LANGUAGE_LABELS: Record<OrgNode['language'], string> = {
  english: 'EN', french: 'FR', both: 'EN/FR',
};
const STATUS_LABELS: Record<OrgNode['status'], keyof TranslationKeys> = {
  active: 'active', vacant: 'vacant', inactive: 'inactive',
};
const CATEGORY_LABELS: Record<OrgNode['category'], keyof TranslationKeys> = {
  'senior-leadership': 'seniorLeadership',
  'executive-leadership': 'executiveLeadership',
  'ministry-system': 'ministrySystem',
  'department': 'department',
  'program': 'program',
  'team': 'team',
};

interface NodeDetailSheetProps {
  node: OrgNode | null;
  nodes: OrgNode[];
  t: TranslationKeys;
  onEdit: () => void;
  onDelete: () => void;
  onSelectNode: (id: string) => void;
  onClose: () => void;
}

export function NodeDetailSheet({ node, nodes, t, onEdit, onDelete, onSelectNode, onClose }: NodeDetailSheetProps) {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const isOpen = !!node;
  const parent = node?.parentId ? nodes.find(n => n.id === node.parentId) : null;
  const directReports = node ? nodes.filter(n => n.parentId === node.id) : [];
  const categoryColor = node ? CATEGORY_COLORS[node.category] : '#94A3B8';
  const statusColor = node ? STATUS_COLORS[node.status] : '#94A3B8';

  return (
    <SheetRoot open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent>
        {node && (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Category color strip */}
            <div style={{ height: 4, backgroundColor: categoryColor, flexShrink: 0 }} />

            <SheetHeader>
              <SheetTitle className="pr-8">{node.title}</SheetTitle>
              {node.personName && (
                <p className="text-sm text-slate-500 mt-0.5">{node.personName}</p>
              )}
            </SheetHeader>

            <div className="px-6 pb-6 flex flex-col gap-5 flex-1">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" style={{ borderLeft: `3px solid ${categoryColor}` }}>
                  {t[CATEGORY_LABELS[node.category]] as string}
                </Badge>
                <Badge variant="secondary">
                  {LANGUAGE_LABELS[node.language]}
                </Badge>
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusColor, display: 'inline-block' }} />
                  {t[STATUS_LABELS[node.status]] as string}
                </span>
              </div>

              {/* Description */}
              {node.description && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{t.description}</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{node.description}</p>
                </div>
              )}

              {/* Reports To */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{t.reportsTo}</p>
                {parent ? (
                  <button
                    onClick={() => onSelectNode(parent.id)}
                    className="flex items-center gap-1.5 text-sm text-slate-900 hover:text-blue-600 transition-colors group"
                  >
                    {parent.title}
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ) : (
                  <span className="text-sm text-slate-400">{t.noParent}</span>
                )}
              </div>

              {/* Direct Reports */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  {t.directReports} ({directReports.length})
                </p>
                {directReports.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {directReports.map(r => (
                      <button
                        key={r.id}
                        onClick={() => onSelectNode(r.id)}
                        className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 transition-colors text-left"
                      >
                        {r.title}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )}
              </div>

              {/* Actions */}
              {isAdmin && (
                <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                  <Button size="sm" variant="outline" onClick={onEdit} className="flex-1 gap-1.5">
                    <Edit2 className="h-3.5 w-3.5" />
                    {t.edit}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={onDelete} className="gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                    {t.delete}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </SheetRoot>
  );
}

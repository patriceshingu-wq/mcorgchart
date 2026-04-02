import { useState, useMemo } from 'react';
import { Edit2, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { OrgNode } from '../../types';
import { CATEGORY_COLORS, STATUS_COLORS } from '../../types';
import type { TranslationKeys } from '../../data/translations';
import { cn, getChildren } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORY_LABEL_KEYS: Record<OrgNode['category'], keyof TranslationKeys> = {
  'senior-leadership': 'seniorLeadership',
  'executive-leadership': 'executiveLeadership',
  'ministry-system': 'ministrySystem',
  'department': 'department',
  'program': 'program',
  'team': 'team',
};
const STATUS_LABEL_KEYS: Record<OrgNode['status'], keyof TranslationKeys> = {
  active: 'active', vacant: 'vacant', inactive: 'inactive',
};

interface TreeRow {
  node: OrgNode;
  depth: number;
  hasChildren: boolean;
}

function buildTreeRows(
  nodes: OrgNode[],
  parentId: string | null,
  depth: number,
  collapsedIds: Set<string>
): TreeRow[] {
  const children = getChildren(nodes, parentId);
  const rows: TreeRow[] = [];

  for (const node of children) {
    const nodeChildren = getChildren(nodes, node.id);
    const hasChildren = nodeChildren.length > 0;
    rows.push({ node, depth, hasChildren });

    // Only recurse if this node is not collapsed
    if (hasChildren && !collapsedIds.has(node.id)) {
      rows.push(...buildTreeRows(nodes, node.id, depth + 1, collapsedIds));
    }
  }

  return rows;
}

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
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const treeRows = useMemo(
    () => buildTreeRows(nodes, null, 0, collapsedIds),
    [nodes, collapsedIds]
  );

  function toggleCollapse(nodeId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  if (treeRows.length === 0) {
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
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.title}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.personName}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.category}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.status}
            </th>
            {isAdmin && (
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {treeRows.map(({ node, depth, hasChildren }) => {
            const catColor = CATEGORY_COLORS[node.category];
            const statusColor = STATUS_COLORS[node.status];
            const isCollapsed = collapsedIds.has(node.id);

            return (
              <tr
                key={node.id}
                onClick={() => onSelectNode(node.id)}
                className={cn(
                  'border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50',
                  selectedId === node.id && 'bg-slate-100',
                )}
              >
                <td className="px-4 py-3">
                  <div
                    className="flex items-center gap-1"
                    style={{ paddingLeft: depth * 24 }}
                  >
                    {/* Collapse/Expand button */}
                    {hasChildren ? (
                      <button
                        onClick={(e) => toggleCollapse(node.id, e)}
                        className="p-0.5 rounded hover:bg-slate-200 transition-colors flex-shrink-0"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        )}
                      </button>
                    ) : (
                      <span className="w-5 flex-shrink-0" /> // Spacer for alignment
                    )}

                    {/* Category color bar */}
                    <div
                      style={{
                        width: 4,
                        height: 20,
                        borderRadius: 2,
                        backgroundColor: catColor,
                        flexShrink: 0
                      }}
                    />

                    {/* Title */}
                    <span className="font-medium text-slate-900 line-clamp-1">
                      {node.title}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]">
                  {node.personName || '—'}
                </td>

                <td className="px-4 py-3">
                  <Badge variant="secondary" style={{ borderLeft: `3px solid ${catColor}` }}>
                    {t[CATEGORY_LABEL_KEYS[node.category]] as string}
                  </Badge>
                </td>

                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: statusColor
                      }}
                    />
                    {t[STATUS_LABEL_KEYS[node.status]] as string}
                  </span>
                </td>

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

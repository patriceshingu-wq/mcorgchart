import React from 'react';
import { Edit2, Info, Sparkles, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { OrgNode } from '../../types';
import { STATUS_COLORS, CATEGORY_COLORS } from '../../types';

interface EmbeddedDeptListProps {
  depts: OrgNode[];
  programs?: OrgNode[];
  subDeptsByParent?: Map<string, OrgNode[]>;
  accentColor?: string;
  onEdit: (node: OrgNode) => void;
  onSelect: (id: string) => void;
  onAddChild?: (parentId: string) => void;
  onDelete?: (node: OrgNode) => void;
}

export function EmbeddedDeptList({ depts, programs = [], subDeptsByParent, accentColor, onEdit, onSelect, onAddChild, onDelete }: EmbeddedDeptListProps) {
  if (depts.length === 0 && programs.length === 0) return null;

  const programColor = CATEGORY_COLORS['program']; // bright green

  return (
    <div
      className="border-t pt-1 pb-2"
      style={{ borderColor: accentColor ? `${accentColor}55` : 'rgba(255,255,255,0.1)' }}
    >
      {/* Departments */}
      {depts.map(dept => {
        const subDepts = subDeptsByParent?.get(dept.id) || [];
        return (
          <div key={dept.id}>
            <div
              className="flex items-center gap-2 px-3 py-1 hover:bg-white/10 rounded mx-1 transition-colors group/row"
              onClick={e => e.stopPropagation()}
            >
              {/* Status dot - solid for departments */}
              <span
                className="flex-shrink-0 rounded-full"
                style={{ width: 7, height: 7, backgroundColor: STATUS_COLORS[dept.status] }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-white/90 truncate">
                  {dept.title}
                  {subDepts.length > 0 && (
                    <span className="text-white/40 ml-1">({subDepts.length})</span>
                  )}
                </div>
                {dept.personName && (
                  <div className="text-[9px] text-white/50 truncate">{dept.personName}</div>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); onEdit(dept); }}
                className="p-0.5 rounded text-white/30 opacity-0 group-hover/row:opacity-100 hover:text-white hover:bg-white/10 transition-opacity"
                title="Edit department"
              >
                <Edit2 className="h-2.5 w-2.5" />
              </button>
              {onAddChild && (
                <button
                  onClick={e => { e.stopPropagation(); onAddChild(dept.id); }}
                  className="p-0.5 rounded text-white/30 opacity-0 group-hover/row:opacity-100 hover:text-white hover:bg-white/10 transition-opacity"
                  title="Add sub-department"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); onSelect(dept.id); }}
                className="p-0.5 rounded text-white/30 opacity-0 group-hover/row:opacity-100 hover:text-white hover:bg-white/10 transition-opacity"
                title="View details"
              >
                <Info className="h-2.5 w-2.5" />
              </button>
            </div>
            {/* Sub-departments */}
            {subDepts.length > 0 && (
              <div className="ml-4 border-l border-white/10 pl-2 my-0.5">
                {subDepts.map(subDept => (
                  <div
                    key={subDept.id}
                    className="flex items-center gap-2 px-2 py-0.5 hover:bg-white/10 rounded transition-colors group/subrow"
                    onClick={e => e.stopPropagation()}
                  >
                    <ChevronRight className="h-2 w-2 text-white/30 flex-shrink-0" />
                    <span
                      className="flex-shrink-0 rounded-full"
                      style={{ width: 5, height: 5, backgroundColor: STATUS_COLORS[subDept.status] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-white/70 truncate">{subDept.title}</div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onEdit(subDept); }}
                      className="p-0.5 rounded text-white/30 opacity-0 group-hover/subrow:opacity-100 hover:text-white hover:bg-white/10 transition-opacity"
                      title="Edit sub-department"
                    >
                      <Edit2 className="h-2 w-2" />
                    </button>
                    {onDelete && (
                      <button
                        onClick={e => { e.stopPropagation(); onDelete(subDept); }}
                        className="p-0.5 rounded text-white/30 opacity-0 group-hover/subrow:opacity-100 hover:text-rose-400 hover:bg-white/10 transition-opacity"
                        title="Delete sub-department"
                      >
                        <Trash2 className="h-2 w-2" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Programs section - visually distinct */}
      {programs.length > 0 && (
        <div
          className="mt-1 mx-1 rounded-md overflow-hidden"
          style={{ backgroundColor: `${programColor}15` }}
        >
          {/* Programs header */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: programColor }}
          >
            <Sparkles className="h-2.5 w-2.5" />
            Programs
          </div>

          {/* Program items */}
          {programs.map(prog => (
            <div
              key={prog.id}
              className="flex items-center gap-2 px-3 py-1 hover:bg-white/10 transition-colors group/row"
              onClick={e => e.stopPropagation()}
            >
              {/* Program indicator - diamond shape */}
              <span
                className="flex-shrink-0 rotate-45"
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: STATUS_COLORS[prog.status],
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-white/90 truncate">{prog.title}</div>
                {prog.personName && (
                  <div className="text-[9px] text-white/50 truncate">{prog.personName}</div>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); onEdit(prog); }}
                className="p-0.5 rounded text-white/30 opacity-0 group-hover/row:opacity-100 hover:text-white hover:bg-white/10 transition-opacity"
                title="Edit program"
              >
                <Edit2 className="h-2.5 w-2.5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onSelect(prog.id); }}
                className="p-0.5 rounded text-white/30 opacity-0 group-hover/row:opacity-100 hover:text-white hover:bg-white/10 transition-opacity"
                title="View details"
              >
                <Info className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

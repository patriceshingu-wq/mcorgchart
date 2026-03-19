import React from 'react';
import { Edit2, Info } from 'lucide-react';
import type { OrgNode } from '../../types';
import { STATUS_COLORS } from '../../types';

interface EmbeddedDeptListProps {
  depts: OrgNode[];
  accentColor?: string;
  onEdit: (node: OrgNode) => void;
  onSelect: (id: string) => void;
}

export function EmbeddedDeptList({ depts, accentColor, onEdit, onSelect }: EmbeddedDeptListProps) {
  if (depts.length === 0) return null;
  return (
    <div
      className="border-t pt-1 pb-2"
      style={{ borderColor: accentColor ? `${accentColor}55` : 'rgba(255,255,255,0.1)' }}
    >
      {depts.map(dept => (
        <div
          key={dept.id}
          className="flex items-center gap-2 px-3 py-1 hover:bg-white/10 rounded mx-1 transition-colors group/row"
          onClick={e => e.stopPropagation()}
        >
          {/* Status dot */}
          <span
            className="flex-shrink-0 rounded-full"
            style={{ width: 7, height: 7, backgroundColor: STATUS_COLORS[dept.status] }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-white/90 truncate">{dept.title}</div>
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
          <button
            onClick={e => { e.stopPropagation(); onSelect(dept.id); }}
            className="p-0.5 rounded text-white/30 opacity-0 group-hover/row:opacity-100 hover:text-white hover:bg-white/10 transition-opacity"
            title="View details"
          >
            <Info className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

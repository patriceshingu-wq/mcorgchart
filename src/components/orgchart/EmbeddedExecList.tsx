import React from 'react';
import { Edit2, Info } from 'lucide-react';
import type { OrgNode, CardDisplayMode } from '../../types';
import { CATEGORY_COLORS } from '../../types';
import { getCardText } from '../../lib/utils';

const LANGUAGE_LABELS: Record<OrgNode['language'], string> = {
  english: 'EN',
  french: 'FR',
  both: 'EN/FR',
};

function getInitials(name: string): string {
  return name
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

interface EmbeddedExecListProps {
  execs: OrgNode[];
  cardDisplayMode?: CardDisplayMode;
  accentColor?: string;
  onEdit: (node: OrgNode) => void;
  onSelect: (id: string) => void;
  isAdmin?: boolean;
}

export function EmbeddedExecList({ execs, cardDisplayMode = 'both', accentColor, onEdit, onSelect, isAdmin = true }: EmbeddedExecListProps) {
  if (execs.length === 0) return null;

  return (
    <div
      className="border-t pb-2"
      style={{ borderColor: accentColor ? `${accentColor}55` : 'rgba(255,255,255,0.1)' }}
    >
      {execs.map(exec => {
        const initials = exec.personName
          ? getInitials(exec.personName)
          : getInitials(exec.title);
        const avatarColor = CATEGORY_COLORS[exec.category];

        return (
          <div
            key={exec.id}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 transition-colors group/row mx-1 rounded"
            onClick={e => e.stopPropagation()}
          >
            {/* Avatar circle */}
            <div
              className="flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold text-[9px]"
              style={{ width: 26, height: 26, backgroundColor: avatarColor, opacity: 0.85 }}
            >
              {initials}
            </div>

            {/* Role + person name */}
            <div className="flex-1 min-w-0">
              {(() => {
                const { primary, secondary } = getCardText(exec, cardDisplayMode);
                return (
                  <>
                    <div className="text-[11px] font-semibold text-white/90 truncate">
                      {primary || '—'}
                    </div>
                    {secondary && <div className="text-[9px] text-white/50 truncate">{secondary}</div>}
                  </>
                );
              })()}
            </div>

            {/* Language badge */}
            <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/60 font-medium flex-shrink-0">
              {LANGUAGE_LABELS[exec.language]}
            </span>

            {/* Action buttons — visible on row hover, admin only */}
            {isAdmin && (
              <button
                onClick={e => { e.stopPropagation(); onEdit(exec); }}
                className="p-0.5 rounded text-white/30 opacity-0 group-hover/row:opacity-100 hover:text-white hover:bg-white/10 transition-opacity"
                title="Edit executive"
              >
                <Edit2 className="h-2.5 w-2.5" />
              </button>
            )}
            <button
              onClick={e => { e.stopPropagation(); onSelect(exec.id); }}
              className="p-0.5 rounded text-white/30 opacity-0 group-hover/row:opacity-100 hover:text-white hover:bg-white/10 transition-opacity"
              title="View details"
            >
              <Info className="h-2.5 w-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

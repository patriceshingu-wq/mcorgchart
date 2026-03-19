import React, { useState, useMemo } from 'react';
import { DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Check } from 'lucide-react';
import type { OrgNode } from '../../types';
import { getDescendantIds } from '../../lib/utils';
import type { TranslationKeys } from '../../data/translations';
import { cn } from '../../lib/utils';

interface ReassignParentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: OrgNode | null;
  nodes: OrgNode[];
  onConfirm: (nodeId: string, newParentId: string | null) => void;
  t: TranslationKeys;
}

export function ReassignParentModal({ open, onOpenChange, node, nodes, onConfirm, t }: ReassignParentModalProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const candidates = useMemo(() => {
    if (!node) return [];
    const descendants = new Set(getDescendantIds(nodes, node.id));
    descendants.add(node.id);
    return nodes.filter(n => !descendants.has(n.id));
  }, [node, nodes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? candidates.filter(n => n.title.toLowerCase().includes(q) || n.personName.toLowerCase().includes(q)) : candidates;
  }, [candidates, search]);

  function handleConfirm() {
    if (!node) return;
    onConfirm(node.id, selected);
    onOpenChange(false);
  }

  return (
    <DialogRoot open={open} onOpenChange={open => { if (!open) setSearch(''); onOpenChange(open); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.reassignParent}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-sm text-slate-600">{t.selectParent}:</p>
          <Input
            placeholder={t.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {/* None (root) option */}
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
            <button
              onClick={() => setSelected(null)}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors',
                selected === null && 'bg-slate-50 font-medium',
              )}
            >
              <span className="text-slate-500 italic">{t.noParent}</span>
              {selected === null && <Check className="h-4 w-4 text-slate-700" />}
            </button>
            {filtered.map(n => (
              <button
                key={n.id}
                onClick={() => setSelected(n.id)}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors',
                  selected === n.id && 'bg-slate-50 font-medium',
                )}
              >
                <div className="min-w-0">
                  <div className="truncate">{n.title}</div>
                  {n.personName && <div className="text-xs text-slate-400 truncate">{n.personName}</div>}
                </div>
                {selected === n.id && <Check className="h-4 w-4 text-slate-700 flex-shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && search && (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">{t.noResults}</div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button size="sm" onClick={handleConfirm}>{t.confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

import React, { useState, useEffect } from 'react';
import {
  DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select, SelectItem } from '../ui/Select';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { OrgNode } from '../../types';
import { getChildren } from '../../lib/utils';
import type { TranslationKeys } from '../../data/translations';

interface NodeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<OrgNode, 'id'> & { id?: string }) => void;
  initialNode: OrgNode | null;
  nodes: OrgNode[];
  t: TranslationKeys;
  defaultParentId?: string | null;
}

function buildParentOptions(nodes: OrgNode[], excludeId?: string, excludeDescendants?: string[]): OrgNode[] {
  const excluded = new Set([excludeId, ...(excludeDescendants ?? [])].filter(Boolean) as string[]);
  return nodes.filter(n => !excluded.has(n.id));
}

export function NodeFormModal({ open, onOpenChange, onSubmit, initialNode, nodes, t, defaultParentId }: NodeFormModalProps) {
  const [title, setTitle] = useState('');
  const [personName, setPersonName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<OrgNode['category']>('department');
  const [language, setLanguage] = useState<OrgNode['language']>('both');
  const [status, setStatus] = useState<OrgNode['status']>('active');
  const [parentId, setParentId] = useState<string>('__none__');
  const [order, setOrder] = useState(0);
  const [titleError, setTitleError] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialNode) {
        setTitle(initialNode.title);
        setPersonName(initialNode.personName);
        setDescription(initialNode.description);
        setCategory(initialNode.category);
        setLanguage(initialNode.language);
        setStatus(initialNode.status);
        setParentId(initialNode.parentId ?? '__none__');
        setOrder(initialNode.order);
      } else {
        setTitle('');
        setPersonName('');
        setDescription('');
        setCategory('department');
        setLanguage('both');
        setStatus('active');
        setParentId(defaultParentId !== undefined ? (defaultParentId ?? '__none__') : '__none__');
        setOrder(0);
      }
      setTitleError(false);
    }
  }, [open, initialNode, defaultParentId]);

  // Compute siblings for order adjustment
  const siblings = nodes.filter(n =>
    n.parentId === (parentId === '__none__' ? null : parentId) &&
    (!initialNode || n.id !== initialNode.id)
  );

  function handleSubmit() {
    if (!title.trim()) { setTitleError(true); return; }
    onSubmit({
      id: initialNode?.id,
      title: title.trim(),
      personName: personName.trim(),
      description: description.trim(),
      category,
      language,
      status,
      parentId: parentId === '__none__' ? null : parentId,
      order,
      isCollapsed: initialNode?.isCollapsed ?? false,
    });
    onOpenChange(false);
  }

  // Get descendant ids for the exclude list (when editing)
  const excludeDescendants: string[] = [];
  if (initialNode) {
    const queue = [initialNode.id];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const children = nodes.filter(n => n.parentId === cur);
      for (const c of children) { excludeDescendants.push(c.id); queue.push(c.id); }
    }
  }

  const parentOptions = buildParentOptions(nodes, initialNode?.id, excludeDescendants);

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialNode ? t.editNode : t.addNode}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t.title} <span className="text-rose-500">*</span></label>
            <Input
              value={title}
              onChange={e => { setTitle(e.target.value); if (titleError) setTitleError(false); }}
              placeholder={t.title}
              className={titleError ? 'border-rose-400 focus:ring-rose-500' : ''}
              autoFocus
            />
            {titleError && <p className="text-xs text-rose-500 mt-1">{t.titleRequired}</p>}
          </div>

          {/* Person Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t.personName}</label>
            <Input value={personName} onChange={e => setPersonName(e.target.value)} placeholder={t.personName} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t.description}</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t.description} rows={3} />
          </div>

          {/* Category + Language row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{t.category}</label>
              <Select value={category} onValueChange={v => setCategory(v as OrgNode['category'])}>
                <SelectItem value="senior-leadership">{t.seniorLeadership}</SelectItem>
                <SelectItem value="executive-leadership">{t.executiveLeadership}</SelectItem>
                <SelectItem value="ministry-system">{t.ministrySystem}</SelectItem>
                <SelectItem value="department">{t.department}</SelectItem>
                <SelectItem value="program">{t.program}</SelectItem>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{t.language}</label>
              <Select value={language} onValueChange={v => setLanguage(v as OrgNode['language'])}>
                <SelectItem value="english">{t.english}</SelectItem>
                <SelectItem value="french">{t.french}</SelectItem>
                <SelectItem value="both">{t.both}</SelectItem>
              </Select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t.status}</label>
            <Select value={status} onValueChange={v => setStatus(v as OrgNode['status'])}>
              <SelectItem value="active">{t.active}</SelectItem>
              <SelectItem value="vacant">{t.vacant}</SelectItem>
              <SelectItem value="inactive">{t.inactive}</SelectItem>
            </Select>
          </div>

          {/* Parent Node */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t.reportsTo}</label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectItem value="__none__">{t.noParent}</SelectItem>
              {parentOptions.map(n => (
                <SelectItem key={n.id} value={n.id}>{n.title}</SelectItem>
              ))}
            </Select>
          </div>

          {/* Order */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t.order}</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 w-8 text-center">{order + 1}</span>
              <button
                type="button"
                onClick={() => setOrder(Math.max(0, order - 1))}
                disabled={order === 0}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
                title={t.moveUp}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOrder(Math.min(siblings.length, order + 1))}
                disabled={order >= siblings.length}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
                title={t.moveDown}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs text-slate-400">of {siblings.length + 1}</span>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button size="sm" onClick={handleSubmit}>{t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

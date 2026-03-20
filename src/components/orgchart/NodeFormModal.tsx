import React, { useState, useEffect } from 'react';
import {
  DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select, SelectItem } from '../ui/Select';
import { ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import type { OrgNode } from '../../types';
import { getChildren } from '../../lib/utils';
import type { TranslationKeys } from '../../data/translations';

// Validation constants
const MAX_TITLE_LENGTH = 100;
const MAX_PERSON_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 500;

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
  const [errors, setErrors] = useState<{ title?: string; personName?: string; description?: string; duplicate?: string }>({});

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
        setStatus('vacant'); // Default to vacant for new nodes (no person assigned yet)
        setParentId(defaultParentId !== undefined ? (defaultParentId ?? '__none__') : '__none__');
        setOrder(0);
      }
      setErrors({});
    }
  }, [open, initialNode, defaultParentId]);

  // Check for duplicate titles
  const duplicateNode = nodes.find(n =>
    n.title.toLowerCase().trim() === title.toLowerCase().trim() &&
    n.id !== initialNode?.id &&
    title.trim() !== ''
  );

  // Validate field and return error message if invalid
  function validateField(field: 'title' | 'personName' | 'description', value: string): string | undefined {
    const trimmed = value.trim();
    if (field === 'title') {
      if (!trimmed) return t.titleRequired;
      if (trimmed.length > MAX_TITLE_LENGTH) return `Max ${MAX_TITLE_LENGTH} characters`;
    }
    if (field === 'personName' && trimmed.length > MAX_PERSON_NAME_LENGTH) {
      return `Max ${MAX_PERSON_NAME_LENGTH} characters`;
    }
    if (field === 'description' && trimmed.length > MAX_DESCRIPTION_LENGTH) {
      return `Max ${MAX_DESCRIPTION_LENGTH} characters`;
    }
    return undefined;
  }

  // Compute siblings for order adjustment
  const siblings = nodes.filter(n =>
    n.parentId === (parentId === '__none__' ? null : parentId) &&
    (!initialNode || n.id !== initialNode.id)
  );

  function handleSubmit() {
    // Validate all fields
    const newErrors: typeof errors = {};
    newErrors.title = validateField('title', title);
    newErrors.personName = validateField('personName', personName);
    newErrors.description = validateField('description', description);

    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      return;
    }

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
              onChange={e => {
                const newValue = e.target.value;
                if (newValue.length <= MAX_TITLE_LENGTH) {
                  setTitle(newValue);
                  if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
                }
              }}
              placeholder={t.title}
              className={errors.title ? 'border-rose-400 focus:ring-rose-500' : ''}
              autoFocus
              maxLength={MAX_TITLE_LENGTH}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.title ? (
                <p className="text-xs text-rose-500">{errors.title}</p>
              ) : duplicateNode ? (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  A node with this title already exists
                </p>
              ) : (
                <span />
              )}
              <span className={`text-xs ${title.length > MAX_TITLE_LENGTH * 0.9 ? 'text-amber-600' : 'text-slate-400'}`}>
                {title.length}/{MAX_TITLE_LENGTH}
              </span>
            </div>
          </div>

          {/* Person Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t.personName}</label>
            <Input
              value={personName}
              onChange={e => {
                const newValue = e.target.value;
                if (newValue.length <= MAX_PERSON_NAME_LENGTH) {
                  setPersonName(newValue);
                  if (errors.personName) setErrors(prev => ({ ...prev, personName: undefined }));
                  // Auto-toggle status between active/vacant (don't override inactive)
                  if (status !== 'inactive') {
                    setStatus(newValue.trim() ? 'active' : 'vacant');
                  }
                }
              }}
              placeholder={t.personName}
              maxLength={MAX_PERSON_NAME_LENGTH}
              className={errors.personName ? 'border-rose-400 focus:ring-rose-500' : ''}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.personName ? (
                <p className="text-xs text-rose-500">{errors.personName}</p>
              ) : (
                <span />
              )}
              <span className={`text-xs ${personName.length > MAX_PERSON_NAME_LENGTH * 0.9 ? 'text-amber-600' : 'text-slate-400'}`}>
                {personName.length}/{MAX_PERSON_NAME_LENGTH}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t.description}</label>
            <Textarea
              value={description}
              onChange={e => {
                const newValue = e.target.value;
                if (newValue.length <= MAX_DESCRIPTION_LENGTH) {
                  setDescription(newValue);
                  if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
                }
              }}
              placeholder={t.description}
              rows={3}
              maxLength={MAX_DESCRIPTION_LENGTH}
              className={errors.description ? 'border-rose-400 focus:ring-rose-500' : ''}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.description ? (
                <p className="text-xs text-rose-500">{errors.description}</p>
              ) : (
                <span />
              )}
              <span className={`text-xs ${description.length > MAX_DESCRIPTION_LENGTH * 0.9 ? 'text-amber-600' : 'text-slate-400'}`}>
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </span>
            </div>
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
              <SelectItem value="active">
                <div>
                  <div>{t.active}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{t.activeDesc}</div>
                </div>
              </SelectItem>
              <SelectItem value="vacant">
                <div>
                  <div>{t.vacant}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{t.vacantDesc}</div>
                </div>
              </SelectItem>
              <SelectItem value="inactive">
                <div>
                  <div>{t.inactive}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{t.inactiveDesc}</div>
                </div>
              </SelectItem>
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

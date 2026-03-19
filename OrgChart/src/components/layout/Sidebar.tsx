import React from 'react';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectItem } from '../ui/Select';
import type { FilterState, OrgNode } from '../../types';
import type { TranslationKeys } from '../../data/translations';
import { cn } from '../../lib/utils';

interface SidebarProps {
  nodes: OrgNode[];
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  onAddNode: () => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  t: TranslationKeys;
}

export function Sidebar({ nodes, filters, onFiltersChange, onAddNode, isCollapsed, onToggleCollapsed, t }: SidebarProps) {
  const hasFilters = !!(filters.search || filters.category || filters.language || filters.status);

  function clearFilters() {
    onFiltersChange({ search: '', category: '', language: '', status: '' });
  }

  if (isCollapsed) {
    return (
      <aside className="flex flex-col items-center py-3 gap-3 border-r border-slate-200 bg-white w-12 flex-shrink-0 no-print">
        <button
          onClick={onToggleCollapsed}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title={t.sidebarExpand}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={onAddNode}
          className="p-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          title={t.addNode}
        >
          <Plus className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col gap-4 p-4 border-r border-slate-200 bg-white w-60 flex-shrink-0 no-print">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t.filter}</span>
        <button
          onClick={onToggleCollapsed}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title={t.sidebarCollapse}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <Input
          className="pl-8 text-xs h-8"
          placeholder={t.search}
          value={filters.search}
          onChange={e => onFiltersChange({ ...filters, search: e.target.value })}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-600">{t.category}</label>
        <Select
          value={filters.category}
          onValueChange={v => onFiltersChange({ ...filters, category: v as FilterState['category'] })}
          placeholder={t.allCategories}
          className="text-xs h-8"
        >
          <SelectItem value="">{t.allCategories}</SelectItem>
          <SelectItem value="senior-leadership">{t.seniorLeadership}</SelectItem>
          <SelectItem value="executive-leadership">{t.executiveLeadership}</SelectItem>
          <SelectItem value="ministry-system">{t.ministrySystem}</SelectItem>
          <SelectItem value="department">{t.department}</SelectItem>
          <SelectItem value="program">{t.program}</SelectItem>
        </Select>

        <label className="text-xs font-medium text-slate-600">{t.language}</label>
        <Select
          value={filters.language}
          onValueChange={v => onFiltersChange({ ...filters, language: v as FilterState['language'] })}
          placeholder={t.allLanguages}
          className="text-xs h-8"
        >
          <SelectItem value="">{t.allLanguages}</SelectItem>
          <SelectItem value="english">{t.english}</SelectItem>
          <SelectItem value="french">{t.french}</SelectItem>
          <SelectItem value="both">{t.both}</SelectItem>
        </Select>

        <label className="text-xs font-medium text-slate-600">{t.status}</label>
        <Select
          value={filters.status}
          onValueChange={v => onFiltersChange({ ...filters, status: v as FilterState['status'] })}
          placeholder={t.allStatuses}
          className="text-xs h-8"
        >
          <SelectItem value="">{t.allStatuses}</SelectItem>
          <SelectItem value="active">{t.active}</SelectItem>
          <SelectItem value="vacant">{t.vacant}</SelectItem>
          <SelectItem value="inactive">{t.inactive}</SelectItem>
        </Select>
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="text-xs text-slate-500 hover:text-slate-900 underline text-left"
        >
          {t.clearFilters}
        </button>
      )}

      {/* Add Node */}
      <Button onClick={onAddNode} className="w-full gap-2" size="sm">
        <Plus className="h-3.5 w-3.5" />
        {t.addNode}
      </Button>

      {/* Node count */}
      <div className={cn('mt-auto text-xs text-slate-400 text-center')}>
        {nodes.length} {t.nodeCount}
      </div>
    </aside>
  );
}

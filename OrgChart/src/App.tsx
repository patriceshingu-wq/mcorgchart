import React, { useState, useCallback } from 'react';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { OrgChartCanvas } from './components/orgchart/OrgChartCanvas';
import { NodeDetailSheet } from './components/orgchart/NodeDetailSheet';
import { NodeFormModal } from './components/orgchart/NodeFormModal';
import { ReassignParentModal } from './components/orgchart/ReassignParentModal';
import { DeleteConfirmDialog } from './components/orgchart/DeleteConfirmDialog';
import { NodeListTable } from './components/listview/NodeListTable';
import { ExportPage } from './components/export/ExportPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { ToastProvider, useToast } from './components/ui/Toast';
import { useNodes } from './hooks/useNodes';
import { useSettings } from './hooks/useSettings';
import { useTranslation } from './hooks/useTranslation';
import { useOrgTree } from './hooks/useOrgTree';
import { getDescendantIds } from './lib/utils';
import type { ActivePage, FilterState, OrgNode, ZoomLevel, AppSettings } from './types';

const DEFAULT_FILTERS: FilterState = { search: '', category: '', language: '', status: '' };

function AppContent() {
  const { settings, updateSettings } = useSettings();
  const {
    nodes, addNode, updateNode, deleteNode, reassignParent,
    toggleCollapse, collapseAll, expandAll, importNodes, resetToSeed,
  } = useNodes();
  const t = useTranslation(settings.language);
  const { showToast } = useToast();

  const [activePage, setActivePage] = useState<ActivePage>('org-chart');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(100);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chartView, setChartView] = useState<'visual' | 'list'>('visual');

  // Modal states
  const [formModal, setFormModal] = useState<{ open: boolean; node: OrgNode | null; defaultParentId?: string | null }>({ open: false, node: null });
  const [reassignModal, setReassignModal] = useState<{ open: boolean; node: OrgNode | null }>({ open: false, node: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; node: OrgNode | null }>({ open: false, node: null });

  const { visibleNodes, rootNodes, matchingIds, hasActiveFilter, embeddedDeptIds } = useOrgTree(nodes, filters);
  const selectedNode = nodes.find(n => n.id === selectedId) ?? null;

  // Handlers
  const handleSelectNode = useCallback((id: string) => setSelectedId(prev => prev === id ? null : id), []);

  const handleAddNode = useCallback(() => {
    setFormModal({ open: true, node: null, defaultParentId: null });
  }, []);

  const handleAddChild = useCallback((parentId: string) => {
    setFormModal({ open: true, node: null, defaultParentId: parentId });
  }, []);

  const handleEdit = useCallback((node: OrgNode) => {
    setFormModal({ open: true, node });
  }, []);

  const handleReassign = useCallback((node: OrgNode) => {
    setReassignModal({ open: true, node });
  }, []);

  const handleDeleteRequest = useCallback((node: OrgNode) => {
    setDeleteDialog({ open: true, node });
  }, []);

  const handleFormSubmit = useCallback((data: Omit<OrgNode, 'id'> & { id?: string }) => {
    if (data.id) {
      updateNode(data.id, data);
    } else {
      addNode(data as Omit<OrgNode, 'id' | 'order'>);
    }
    showToast(t.nodeSaved);
  }, [addNode, updateNode, showToast, t]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteDialog.node) return;
    deleteNode(deleteDialog.node.id);
    if (selectedId === deleteDialog.node.id) setSelectedId(null);
    setDeleteDialog({ open: false, node: null });
    showToast(t.nodeDeleted);
  }, [deleteDialog.node, deleteNode, selectedId, showToast, t]);

  const handleReassignConfirm = useCallback((nodeId: string, newParentId: string | null) => {
    reassignParent(nodeId, newParentId);
    showToast(t.nodeSaved);
  }, [reassignParent, showToast, t]);

  const handleImportNodes = useCallback((incoming: OrgNode[], newSettings?: AppSettings) => {
    importNodes(incoming);
    if (newSettings) updateSettings(newSettings);
    setSelectedId(null);
    showToast(t.importSuccess);
  }, [importNodes, updateSettings, showToast, t]);

  const handleReset = useCallback(() => {
    resetToSeed();
    setSelectedId(null);
    setFilters(DEFAULT_FILTERS);
  }, [resetToSeed]);

  const deleteDescendantCount = deleteDialog.node
    ? getDescendantIds(nodes, deleteDialog.node.id).length
    : 0;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <TopBar
        settings={settings}
        activePage={activePage}
        onPageChange={page => { setActivePage(page); setSelectedId(null); }}
        onLanguageChange={lang => updateSettings({ language: lang })}
        t={t}
      />

      <div className="flex flex-1 overflow-hidden">
        {activePage === 'org-chart' && (
          <Sidebar
            nodes={nodes}
            filters={filters}
            onFiltersChange={setFilters}
            onAddNode={handleAddNode}
            isCollapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed(v => !v)}
            t={t}
          />
        )}

        <main className="flex flex-1 overflow-hidden">
          {activePage === 'org-chart' && (
            <>
              <div className="flex flex-col flex-1 overflow-hidden">
                {chartView === 'visual' ? (
                  <OrgChartCanvas
                    nodes={nodes}
                    visibleNodes={visibleNodes}
                    rootNodes={rootNodes}
                    matchingIds={matchingIds}
                    hasActiveFilter={hasActiveFilter}
                    embeddedDeptIds={embeddedDeptIds}
                    zoomLevel={zoomLevel}
                    onZoomChange={setZoomLevel}
                    selectedId={selectedId}
                    onSelectNode={handleSelectNode}
                    onAddChild={handleAddChild}
                    onEdit={handleEdit}
                    onReassign={handleReassign}
                    onDelete={handleDeleteRequest}
                    onToggleCollapse={toggleCollapse}
                    onCollapseAll={collapseAll}
                    onExpandAll={expandAll}
                    chartView={chartView}
                    onChartViewChange={setChartView}
                    t={t}
                  />
                ) : (
                  <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Toolbar reuse from OrgChartCanvas pattern */}
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 flex-shrink-0 no-print">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setChartView('visual')}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                          {t.chartView}
                        </button>
                        <button
                          onClick={() => setChartView('list')}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white transition-colors"
                        >
                          {t.listView}
                        </button>
                      </div>
                    </div>
                    <NodeListTable
                      nodes={visibleNodes}
                      selectedId={selectedId}
                      onSelectNode={handleSelectNode}
                      onEdit={handleEdit}
                      onDelete={handleDeleteRequest}
                      t={t}
                    />
                  </div>
                )}
              </div>

              <NodeDetailSheet
                node={selectedNode}
                nodes={nodes}
                t={t}
                onEdit={() => selectedNode && handleEdit(selectedNode)}
                onDelete={() => selectedNode && handleDeleteRequest(selectedNode)}
                onSelectNode={handleSelectNode}
                onClose={() => setSelectedId(null)}
              />
            </>
          )}

          {activePage === 'export' && (
            <ExportPage
              nodes={nodes}
              settings={settings}
              t={t}
              onImportNodes={handleImportNodes}
            />
          )}

          {activePage === 'settings' && (
            <SettingsPage
              settings={settings}
              nodes={nodes}
              onUpdateSettings={updateSettings}
              t={t}
              onReset={handleReset}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <NodeFormModal
        open={formModal.open}
        onOpenChange={open => setFormModal(prev => ({ ...prev, open }))}
        onSubmit={handleFormSubmit}
        initialNode={formModal.node}
        nodes={nodes}
        t={t}
        defaultParentId={formModal.defaultParentId}
      />

      <ReassignParentModal
        open={reassignModal.open}
        onOpenChange={open => setReassignModal(prev => ({ ...prev, open }))}
        node={reassignModal.node}
        nodes={nodes}
        onConfirm={handleReassignConfirm}
        t={t}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={open => setDeleteDialog(prev => ({ ...prev, open }))}
        node={deleteDialog.node}
        descendantCount={deleteDescendantCount}
        onConfirm={handleDeleteConfirm}
        t={t}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

import React, { useState, useCallback, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
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
import { PrintableOrgChart } from './components/print/PrintableOrgChart';
import { ToastProvider, useToast } from './components/ui/Toast';
import { useNodes } from './hooks/useNodes';
import { useSettings } from './hooks/useSettings';
import { useTranslation } from './hooks/useTranslation';
import { useOrgTree } from './hooks/useOrgTree';
import { getDescendantIds } from './lib/utils';
import type { ActivePage, FilterState, OrgNode, ZoomLevel, AppSettings } from './types';

const DEFAULT_FILTERS: FilterState = { search: '', category: '', language: '', status: '', includeSiblings: false };

function AppContent() {
  const { settings, updateSettings, isLoading: settingsLoading } = useSettings();
  const {
    nodes, isLoading: nodesLoading, loadError, storageMode, addNode, updateNode, deleteNode, reassignParent,
    toggleCollapse, collapseAll, expandAll, importNodes, resetToSeed,
    undo, redo, canUndo, canRedo,
  } = useNodes();

  const isLoading = settingsLoading || nodesLoading;
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

  const { visibleNodes, rootNodes, matchingIds, hasActiveFilter, embeddedDeptIds, embeddedProgramIds, embeddedSubDeptIds } = useOrgTree(nodes, filters);
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

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle shortcuts when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Don't handle when modals are open
      if (formModal.open || reassignModal.open || deleteDialog.open) {
        return;
      }

      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
          showToast(t.undo ?? 'Undo');
        }
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) {
          redo();
          showToast(t.redo ?? 'Redo');
        }
        return;
      }

      // Only handle arrow keys when on org-chart page with visual view
      if (activePage !== 'org-chart' || chartView !== 'visual') return;

      const selectedNode = nodes.find(n => n.id === selectedId);
      if (!selectedNode && !['ArrowDown', 'Home'].includes(e.key)) return;

      // Build navigation maps
      const visibleNodesList = nodes.filter(n => {
        // A node is visible if all its ancestors are not collapsed
        let current = n;
        while (current.parentId) {
          const parent = nodes.find(p => p.id === current.parentId);
          if (!parent) break;
          if (parent.isCollapsed) return false;
          current = parent;
        }
        return true;
      });

      const siblings = selectedNode
        ? visibleNodesList.filter(n => n.parentId === selectedNode.parentId).sort((a, b) => a.order - b.order)
        : [];

      const currentIndex = siblings.findIndex(n => n.id === selectedId);

      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault();
          if (selectedNode?.parentId) {
            // Go to parent
            setSelectedId(selectedNode.parentId);
          }
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          if (!selectedNode) {
            // Select first root node
            const rootNodes = visibleNodesList.filter(n => !n.parentId).sort((a, b) => a.order - b.order);
            if (rootNodes.length > 0) setSelectedId(rootNodes[0].id);
          } else if (!selectedNode.isCollapsed) {
            // Go to first child
            const children = visibleNodesList.filter(n => n.parentId === selectedNode.id).sort((a, b) => a.order - b.order);
            if (children.length > 0) setSelectedId(children[0].id);
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (currentIndex > 0) {
            setSelectedId(siblings[currentIndex - 1].id);
          }
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (currentIndex < siblings.length - 1) {
            setSelectedId(siblings[currentIndex + 1].id);
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (selectedNode) {
            handleEdit(selectedNode);
          }
          break;
        }
        case ' ': {
          e.preventDefault();
          if (selectedNode) {
            toggleCollapse(selectedNode.id);
          }
          break;
        }
        case 'Delete':
        case 'Backspace': {
          e.preventDefault();
          if (selectedNode) {
            handleDeleteRequest(selectedNode);
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setSelectedId(null);
          break;
        }
        case 'Home': {
          e.preventDefault();
          const rootNodes = visibleNodesList.filter(n => !n.parentId).sort((a, b) => a.order - b.order);
          if (rootNodes.length > 0) setSelectedId(rootNodes[0].id);
          break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activePage, chartView, selectedId, nodes, formModal.open, reassignModal.open, deleteDialog.open,
    canUndo, canRedo, undo, redo, showToast, t, toggleCollapse, handleEdit, handleDeleteRequest,
  ]);

  const deleteDescendantCount = deleteDialog.node
    ? getDescendantIds(nodes, deleteDialog.node.id).length
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Failed to load data</h1>
          <p className="text-sm text-slate-500 mb-2">{loadError}</p>
          <p className="text-xs text-slate-400 mb-4">Using local seed data as fallback.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <TopBar
        settings={settings}
        activePage={activePage}
        onPageChange={page => { setActivePage(page); setSelectedId(null); }}
        onLanguageChange={lang => updateSettings({ language: lang })}
        storageMode={storageMode}
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
                    embeddedProgramIds={embeddedProgramIds}
                    embeddedSubDeptIds={embeddedSubDeptIds}
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

      {/* Printable org chart - hidden on screen, visible when printing */}
      <PrintableOrgChart
        nodes={nodes}
        churchName={settings.churchName}
        title={t.printHeader}
      />
    </div>
  );
}

function AuthGate() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

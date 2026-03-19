import React, { useRef, useState } from 'react';
import { Download, Upload, Printer, FileJson } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import {
  AlertDialogRoot, AlertDialogContent, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '../ui/AlertDialog';
import { useToast } from '../ui/Toast';
import type { OrgNode, AppSettings } from '../../types';
import type { TranslationKeys } from '../../data/translations';
import { downloadFile, formatExportDate } from '../../lib/utils';

interface ExportPageProps {
  nodes: OrgNode[];
  settings: AppSettings;
  t: TranslationKeys;
  onImportNodes: (nodes: OrgNode[], newSettings?: AppSettings) => void;
}

export function ExportPage({ nodes, settings, t, onImportNodes }: ExportPageProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const allDataInputRef = useRef<HTMLInputElement>(null);
  const [importConfirm, setImportConfirm] = useState<{ open: boolean; data: OrgNode[] | null; settings?: AppSettings }>({ open: false, data: null });

  function handleExportJson() {
    const date = formatExportDate();
    const payload = JSON.stringify({ settings, nodes, exportedAt: new Date().toISOString() }, null, 2);
    downloadFile(`mont-carmel-orgchart-${date}.json`, payload);
    showToast(t.exportJson);
  }

  function handlePrint() {
    window.print();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        // Validate: must have nodes array with id, title, parentId
        const incoming = parsed.nodes ?? parsed;
        if (!Array.isArray(incoming) || !incoming.every((n: unknown) => {
          const node = n as Record<string, unknown>;
          return typeof node.id === 'string' && typeof node.title === 'string' && 'parentId' in node;
        })) {
          showToast(t.importError, 'error');
          return;
        }
        const importedSettings = parsed.settings as AppSettings | undefined;
        setImportConfirm({ open: true, data: incoming as OrgNode[], settings: importedSettings });
      } catch {
        showToast(t.importError, 'error');
      }
    };
    reader.readAsText(file);
  }

  function confirmImport() {
    if (!importConfirm.data) return;
    onImportNodes(importConfirm.data, importConfirm.settings);
    showToast(t.importSuccess);
    setImportConfirm({ open: false, data: null });
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Print header (hidden on screen) */}
      <div id="print-header" className="hidden">
        <h1>{settings.churchName} — {t.printHeader}</h1>
        <p>{t.generatedOn}: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">{t.export}</h2>

        {/* Print */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-slate-500" />
              {t.printChart}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-3">{t.printDesc}</p>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-3.5 w-3.5" />
              {t.printChart}
            </Button>
          </CardContent>
        </Card>

        {/* Export JSON */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-4 w-4 text-slate-500" />
              {t.exportJson}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-3">{t.exportJsonDesc}</p>
            <Button variant="outline" size="sm" onClick={handleExportJson} className="gap-2">
              <Download className="h-3.5 w-3.5" />
              {t.exportJson}
            </Button>
          </CardContent>
        </Card>

        {/* Import JSON */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-slate-500" />
              {t.importJson}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-3">{t.importJsonDesc}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
            <input
              ref={allDataInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-3.5 w-3.5" />
              {t.importJson}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Import confirm dialog */}
      <AlertDialogRoot open={importConfirm.open} onOpenChange={open => setImportConfirm(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogTitle>{t.importJson}</AlertDialogTitle>
          <AlertDialogDescription>{t.importWarning}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm">{t.cancel}</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" onClick={confirmImport}>{t.importConfirm}</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
    </div>
  );
}

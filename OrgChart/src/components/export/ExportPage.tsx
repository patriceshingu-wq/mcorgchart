import React, { useRef, useState } from 'react';
import { Download, Upload, Printer, FileJson, FileSpreadsheet } from 'lucide-react';
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

// ── CSV helpers ────────────────────────────────────────────────────────────────

const CSV_HEADERS = ['id', 'title', 'personName', 'description', 'category', 'language', 'status', 'parentId', 'order'] as const;

function csvEscape(value: string): string {
  // Wrap in quotes if value contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function nodesToCsv(nodes: OrgNode[]): string {
  const rows = [CSV_HEADERS.join(',')];
  for (const node of nodes) {
    const row = [
      csvEscape(node.id),
      csvEscape(node.title),
      csvEscape(node.personName),
      csvEscape(node.description),
      csvEscape(node.category),
      csvEscape(node.language),
      csvEscape(node.status),
      csvEscape(node.parentId ?? ''),
      String(node.order),
    ];
    rows.push(row.join(','));
  }
  return rows.join('\n');
}

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field
      let field = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++; // skip closing quote
          break;
        } else {
          field += line[i++];
        }
      }
      fields.push(field);
      if (line[i] === ',') i++; // skip comma
    } else {
      // Unquoted field
      const end = line.indexOf(',', i);
      if (end === -1) {
        fields.push(line.slice(i));
        break;
      } else {
        fields.push(line.slice(i, end));
        i = end + 1;
      }
    }
  }
  return fields;
}

function csvToNodes(csv: string): OrgNode[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) throw new Error('Empty CSV');

  const headers = parseCsvRow(lines[0]);
  const idx = (col: string) => {
    const i = headers.indexOf(col);
    if (i === -1) throw new Error(`Missing column: ${col}`);
    return i;
  };

  const idIdx = idx('id');
  const titleIdx = idx('title');
  const personNameIdx = idx('personName');
  const descIdx = idx('description');
  const categoryIdx = idx('category');
  const languageIdx = idx('language');
  const statusIdx = idx('status');
  const parentIdIdx = idx('parentId');
  const orderIdx = idx('order');

  const validCategories = new Set(['senior-leadership', 'executive-leadership', 'ministry-system', 'department', 'program']);
  const validLanguages = new Set(['english', 'french', 'both']);
  const validStatuses = new Set(['active', 'vacant', 'inactive']);

  return lines.slice(1).map((line, i) => {
    const f = parseCsvRow(line);
    const id = f[idIdx]?.trim();
    const title = f[titleIdx]?.trim();
    const category = f[categoryIdx]?.trim();
    const language = f[languageIdx]?.trim();
    const status = f[statusIdx]?.trim();

    if (!id || !title) throw new Error(`Row ${i + 2}: id and title are required`);
    if (!validCategories.has(category)) throw new Error(`Row ${i + 2}: invalid category "${category}"`);
    if (!validLanguages.has(language)) throw new Error(`Row ${i + 2}: invalid language "${language}"`);
    if (!validStatuses.has(status)) throw new Error(`Row ${i + 2}: invalid status "${status}"`);

    const parentIdRaw = f[parentIdIdx]?.trim() ?? '';

    return {
      id,
      title,
      personName: f[personNameIdx]?.trim() ?? '',
      description: f[descIdx]?.trim() ?? '',
      category: category as OrgNode['category'],
      language: language as OrgNode['language'],
      status: status as OrgNode['status'],
      parentId: parentIdRaw === '' ? null : parentIdRaw,
      order: parseInt(f[orderIdx]?.trim() ?? '0', 10) || 0,
      isCollapsed: false,
    };
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ExportPage({ nodes, settings, t, onImportNodes }: ExportPageProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [importConfirm, setImportConfirm] = useState<{ open: boolean; data: OrgNode[] | null; settings?: AppSettings }>({ open: false, data: null });

  function handleExportJson() {
    const date = formatExportDate();
    const payload = JSON.stringify({ settings, nodes, exportedAt: new Date().toISOString() }, null, 2);
    downloadFile(`mont-carmel-orgchart-${date}.json`, payload);
    showToast(t.exportJson);
  }

  function handleExportCsv() {
    const date = formatExportDate();
    downloadFile(`mont-carmel-orgchart-${date}.csv`, nodesToCsv(nodes));
    showToast('CSV exported');
  }

  function handlePrint() {
    window.print();
  }

  function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
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

  function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const incoming = csvToNodes(ev.target?.result as string);
        setImportConfirm({ open: true, data: incoming });
      } catch (err) {
        showToast(err instanceof Error ? err.message : t.importError, 'error');
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

        {/* Export / Import CSV */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-slate-500" />
              CSV Spreadsheet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-3">
              Export the org chart as a CSV file to edit in Excel or Google Sheets, then re-import the modified file.
            </p>
            <p className="text-xs text-slate-400 mb-3 font-mono">
              Columns: {CSV_HEADERS.join(', ')}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-2">
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCsv}
              />
              <Button variant="outline" size="sm" onClick={() => csvInputRef.current?.click()} className="gap-2">
                <Upload className="h-3.5 w-3.5" />
                Import CSV
              </Button>
            </div>
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
              onChange={handleImportJson}
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

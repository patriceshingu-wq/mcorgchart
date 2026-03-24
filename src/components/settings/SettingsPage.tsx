import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { loadUsers, setUserRole } from '../../lib/dataService';
import type { UserRecord } from '../../lib/dataService';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  AlertDialogRoot, AlertDialogContent, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '../ui/AlertDialog';
import { useToast } from '../ui/Toast';
import { Download } from 'lucide-react';
import type { AppSettings } from '../../types';
import type { TranslationKeys } from '../../data/translations';
import { downloadFile, formatExportDate } from '../../lib/utils';
import type { OrgNode } from '../../types';

interface SettingsPageProps {
  settings: AppSettings;
  nodes: OrgNode[];
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  t: TranslationKeys;
  onReset: () => void;
}

export function SettingsPage({ settings, nodes, onUpdateSettings, t, onReset }: SettingsPageProps) {
  const { showToast } = useToast();
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetInput, setResetInput] = useState('');

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setUsersLoading(true);
    loadUsers()
      .then(setUsers)
      .catch(() => showToast('Failed to load users', 'error'))
      .finally(() => setUsersLoading(false));
  }, [isAdmin]);

  const handleRoleChange = useCallback(async (userId: string, newRole: 'admin' | 'viewer') => {
    try {
      await setUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast('Role updated');
    } catch {
      showToast('Failed to update role', 'error');
    }
  }, [showToast]);

  function handleReset() {
    if (resetInput !== 'RESET') return;
    // Auto-backup before reset
    const date = formatExportDate();
    const payload = JSON.stringify({ settings, nodes, exportedAt: new Date().toISOString() }, null, 2);
    downloadFile(`mont-carmel-orgchart-backup-${date}.json`, payload);
    // Then reset
    onReset();
    setResetDialogOpen(false);
    setResetInput('');
    showToast(t.importSuccess);
  }

  function handleExport() {
    const date = formatExportDate();
    const payload = JSON.stringify({ settings, nodes, exportedAt: new Date().toISOString() }, null, 2);
    downloadFile(`mont-carmel-orgchart-${date}.json`, payload);
    showToast(t.exportJson);
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-xl mx-auto space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">{t.settings}</h2>

        {/* Users — admin only */}
        {isAdmin && (
          <Card>
            <CardHeader><CardTitle>Users</CardTitle></CardHeader>
            <CardContent>
              {usersLoading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-slate-400">No users found.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{u.email}</div>
                        {u.fullName && (
                          <div className="text-xs text-slate-500 truncate">{u.fullName}</div>
                        )}
                        {u.lastSignInAt && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Last sign-in: {new Date(u.lastSignInAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {u.id === user?.id ? (
                        <span className="text-[11px] px-2 py-1 rounded-md bg-violet-100 text-violet-700 font-semibold flex-shrink-0">
                          {u.role} (you)
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value as 'admin' | 'viewer')}
                          className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 flex-shrink-0"
                        >
                          <option value="admin">admin</option>
                          <option value="viewer">viewer</option>
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Church info */}
        <Card>
          <CardHeader><CardTitle>{t.churchName}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t.churchName}</label>
              <Input
                value={settings.churchName}
                onChange={e => onUpdateSettings({ churchName: e.target.value })}
                disabled={!isAdmin}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t.appTitle}</label>
              <Input
                value={settings.appTitle}
                onChange={e => onUpdateSettings({ appTitle: e.target.value })}
                disabled={!isAdmin}
              />
            </div>
          </CardContent>
        </Card>

        {/* Interface language */}
        <Card>
          <CardHeader><CardTitle>{t.interfaceLanguage}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden w-fit">
              {(['en', 'fr'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => onUpdateSettings({ language: lang })}
                  className={[
                    'px-4 py-2 text-sm font-medium transition-colors',
                    settings.language === lang
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data management */}
        <Card>
          <CardHeader><CardTitle>{t.exportData}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-500 mb-2">{t.exportAllDesc}</p>
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                <Download className="h-3.5 w-3.5" />
                {t.exportData}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reset — admin only */}
        {isAdmin && (
          <Card className="border-rose-100">
            <CardHeader><CardTitle className="text-rose-700">{t.resetData}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-3">{t.resetWarning}</p>
              <Button variant="destructive" size="sm" onClick={() => { setResetInput(''); setResetDialogOpen(true); }}>
                {t.resetData}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reset confirm dialog */}
      <AlertDialogRoot open={resetDialogOpen} onOpenChange={open => { if (!open) setResetInput(''); setResetDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogTitle>{t.resetData}</AlertDialogTitle>
          <AlertDialogDescription>{t.resetWarning}</AlertDialogDescription>
          <Input
            className="mt-2"
            placeholder={t.typeReset}
            value={resetInput}
            onChange={e => setResetInput(e.target.value)}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm">{t.cancel}</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={resetInput !== 'RESET'}
                onClick={handleReset}
              >
                {t.resetConfirm}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
    </div>
  );
}

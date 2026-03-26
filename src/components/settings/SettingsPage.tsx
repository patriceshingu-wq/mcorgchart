import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { loadUsers, setUserRole, inviteUser, deleteUser } from '../../lib/dataService';
import type { UserRecord } from '../../lib/dataService';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  AlertDialogRoot, AlertDialogContent, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '../ui/AlertDialog';
import { useToast } from '../ui/Toast';
import { Download, UserPlus, Trash2 } from 'lucide-react';
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

  // User management state
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<UserRecord | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    try {
      const data = await loadUsers();
      setUsers(data);
    } catch (err) {
      showToast('Failed to load users', 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = useCallback(async (userId: string, newRole: 'admin' | 'viewer') => {
    try {
      await setUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast('Role updated');
    } catch {
      showToast('Failed to update role', 'error');
    }
  }, [showToast]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { resetLink } = await inviteUser(inviteEmail.trim(), inviteRole);
      showToast('User invited');
      setInviteEmail('');
      fetchUsers();
      if (resetLink) {
        await navigator.clipboard.writeText(resetLink);
        showToast('Password reset link copied to clipboard');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to invite user', 'error');
    } finally {
      setInviting(false);
    }
  }, [inviteEmail, inviteRole, fetchUsers, showToast]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      await deleteUser(deleteConfirm.id);
      setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id));
      showToast('User deleted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete user', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, showToast]);

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
            <CardContent className="space-y-4">
              {/* Invite form */}
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as 'admin' | 'viewer')}
                  className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700"
                >
                  <option value="viewer">viewer</option>
                  <option value="admin">admin</option>
                </select>
                <Button
                  size="sm"
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="gap-1"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {inviting ? 'Inviting...' : 'Invite'}
                </Button>
              </div>

              {/* User list */}
              {usersLoading ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-slate-400">No users found.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{u.email}</div>
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
                        <>
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value as 'admin' | 'viewer')}
                            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700"
                          >
                            <option value="admin">admin</option>
                            <option value="viewer">viewer</option>
                          </select>
                          <button
                            onClick={() => setDeleteConfirm(u)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
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

      {/* Delete user confirm dialog */}
      <AlertDialogRoot open={!!deleteConfirm} onOpenChange={open => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{deleteConfirm?.email}</strong>? This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
    </div>
  );
}

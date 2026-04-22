import { useEffect, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useSettings } from '../../hooks/useSettings';
import { getAuditLogs, type AuditLogFilters } from '../../lib/dataService';
import type { AuditLogEntry } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectItem } from '../ui/select';
import { Badge } from '../ui/badge';

export function AuditLogViewer() {
  const { settings } = useSettings();
  const t = useTranslation(settings.language);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AuditLogFilters>({ limit: 50 });

  useEffect(() => {
    loadLogs();
  }, [filters]);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await getAuditLogs(filters);
      setLogs(data);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  function getOperationBadgeVariant(operation: string): 'default' | 'secondary' | 'outline' {
    switch (operation) {
      case 'INSERT':
        return 'default';
      case 'UPDATE':
        return 'secondary';
      case 'DELETE':
        return 'outline';
      default:
        return 'secondary';
    }
  }

  function getOperationLabel(operation: string): string {
    switch (operation) {
      case 'INSERT':
        return t.created;
      case 'UPDATE':
        return t.updated;
      case 'DELETE':
        return t.deleted;
      default:
        return operation;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.auditLog}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-4">
          <Select
            value={filters.operation || 'all'}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                operation: value === 'all' ? undefined : (value as 'INSERT' | 'UPDATE' | 'DELETE'),
              }))
            }
            placeholder={t.filterByOperation}
            className="w-[200px]"
          >
            <SelectItem value="all">{t.allOperations}</SelectItem>
            <SelectItem value="INSERT">{t.created}</SelectItem>
            <SelectItem value="UPDATE">{t.updated}</SelectItem>
            <SelectItem value="DELETE">{t.deleted}</SelectItem>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">{t.loadingLogs}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{t.noAuditLogs}</div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">{t.operation}</th>
                  <th className="p-3 text-left font-medium">{t.changedBy}</th>
                  <th className="p-3 text-left font-medium">{t.changedAt}</th>
                  <th className="p-3 text-left font-medium">{t.changes}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <Badge variant={getOperationBadgeVariant(log.operation)}>
                        {getOperationLabel(log.operation)}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">{log.userEmail || 'System'}</td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatDate(log.changedAt)}
                    </td>
                    <td className="p-3 text-sm">{log.changeSummary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

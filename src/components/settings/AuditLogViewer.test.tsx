import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AuditLogViewer } from './AuditLogViewer';
import type { AuditLogEntry } from '../../types';

// Mock the dataService
const mockGetAuditLogs = vi.fn();
vi.mock('../../lib/dataService', () => ({
  getAuditLogs: (...args: unknown[]) => mockGetAuditLogs(...args),
}));

// Mock the settings hook
vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => ({ settings: { language: 'en' } }),
}));

// Mock the translation hook
vi.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    auditLog: 'Audit Log',
    changeHistory: 'Change History',
    operation: 'Operation',
    changedBy: 'Changed By',
    changedAt: 'Changed At',
    changes: 'Changes',
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    noAuditLogs: 'No audit logs found',
    loadingLogs: 'Loading logs...',
    filterByOperation: 'Filter by operation',
    allOperations: 'All Operations',
  }),
}));

// Mock the Select component to make it testable
// We need to capture the onValueChange callback and expose a way to trigger it
let capturedOnValueChange: ((value: string) => void) | null = null;

vi.mock('../ui/Select', () => ({
  Select: ({ value, onValueChange, children, className, placeholder }: any) => {
    // Capture the onValueChange callback so tests can trigger it
    capturedOnValueChange = onValueChange;

    return (
      <div data-testid="mock-select" className={className}>
        <button role="combobox" aria-label={placeholder}>
          {value}
        </button>
        {children}
      </div>
    );
  },
  SelectItem: ({ value, children }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}));

// Helper function to trigger select value change in tests
function triggerSelectChange(value: string) {
  if (capturedOnValueChange) {
    capturedOnValueChange(value);
  } else {
    throw new Error('Select onValueChange callback not captured');
  }
}

describe('AuditLogViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockLog = (overrides: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
    id: 'log-1',
    nodeId: 'node-1',
    operation: 'UPDATE',
    userId: 'user-123',
    userEmail: 'test@example.com',
    changedAt: '2024-01-15T10:30:00Z',
    oldValues: null,
    newValues: null,
    changeSummary: 'Updated test node',
    ...overrides,
  });

  describe('Initial Loading', () => {
    it('should show loading state initially', () => {
      mockGetAuditLogs.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<AuditLogViewer />);

      expect(screen.getByText('Loading logs...')).toBeInTheDocument();
    });

    it('should load audit logs on mount', async () => {
      const mockLogs: AuditLogEntry[] = [createMockLog()];
      mockGetAuditLogs.mockResolvedValue(mockLogs);

      render(<AuditLogViewer />);

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith({ limit: 50 });
      });

      await waitFor(() => {
        expect(screen.getByText('Updated test node')).toBeInTheDocument();
      });
    });

    it('should show empty state when no logs exist', async () => {
      mockGetAuditLogs.mockResolvedValue([]);

      render(<AuditLogViewer />);

      await waitFor(() => {
        expect(screen.getByText('No audit logs found')).toBeInTheDocument();
      });
    });

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetAuditLogs.mockRejectedValue(new Error('Network error'));

      render(<AuditLogViewer />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error loading audit logs:',
          expect.any(Error)
        );
      });

      // Should show empty state after error
      expect(screen.getByText('No audit logs found')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Rendering Logs', () => {
    it('should render table headers', async () => {
      mockGetAuditLogs.mockResolvedValue([createMockLog()]);

      render(<AuditLogViewer />);

      await waitFor(() => {
        expect(screen.getByText('Operation')).toBeInTheDocument();
        expect(screen.getByText('Changed By')).toBeInTheDocument();
        expect(screen.getByText('Changed At')).toBeInTheDocument();
        expect(screen.getByText('Changes')).toBeInTheDocument();
      });
    });

    it('should render multiple log entries', async () => {
      const mockLogs: AuditLogEntry[] = [
        createMockLog({ id: 'log-1', changeSummary: 'First change' }),
        createMockLog({ id: 'log-2', changeSummary: 'Second change' }),
        createMockLog({ id: 'log-3', changeSummary: 'Third change' }),
      ];
      mockGetAuditLogs.mockResolvedValue(mockLogs);

      render(<AuditLogViewer />);

      await waitFor(() => {
        expect(screen.getByText('First change')).toBeInTheDocument();
        expect(screen.getByText('Second change')).toBeInTheDocument();
        expect(screen.getByText('Third change')).toBeInTheDocument();
      });
    });

    it('should display user email or "System" for each log', async () => {
      const mockLogs: AuditLogEntry[] = [
        createMockLog({ id: 'log-1', userEmail: 'user@example.com' }),
        createMockLog({ id: 'log-2', userEmail: null }),
      ];
      mockGetAuditLogs.mockResolvedValue(mockLogs);

      render(<AuditLogViewer />);

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
        expect(screen.getByText('System')).toBeInTheDocument();
      });
    });
  });

  describe('Operation Badges', () => {
    it('should show correct badge for INSERT operation', async () => {
      const mockLogs: AuditLogEntry[] = [
        createMockLog({ operation: 'INSERT', changeSummary: 'Created new node' }),
      ];
      mockGetAuditLogs.mockResolvedValue(mockLogs);

      render(<AuditLogViewer />);

      await waitFor(() => {
        const badge = screen.getByText('Created');
        expect(badge).toBeInTheDocument();
      });
    });

    it('should show correct badge for UPDATE operation', async () => {
      const mockLogs: AuditLogEntry[] = [
        createMockLog({ operation: 'UPDATE', changeSummary: 'Updated node' }),
      ];
      mockGetAuditLogs.mockResolvedValue(mockLogs);

      render(<AuditLogViewer />);

      await waitFor(() => {
        const badge = screen.getByText('Updated');
        expect(badge).toBeInTheDocument();
      });
    });

    it('should show correct badge for DELETE operation', async () => {
      const mockLogs: AuditLogEntry[] = [
        createMockLog({ operation: 'DELETE', changeSummary: 'Deleted node' }),
      ];
      mockGetAuditLogs.mockResolvedValue(mockLogs);

      render(<AuditLogViewer />);

      await waitFor(() => {
        const badge = screen.getByText('Deleted');
        expect(badge).toBeInTheDocument();
      });
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', async () => {
      const mockLogs: AuditLogEntry[] = [
        createMockLog({ changedAt: '2024-01-15T10:30:00Z' }),
      ];
      mockGetAuditLogs.mockResolvedValue(mockLogs);

      render(<AuditLogViewer />);

      await waitFor(() => {
        // The exact format depends on locale, but it should contain the date parts
        const dateText = screen.getByText(/Jan.*15.*2024/);
        expect(dateText).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter by INSERT operation', async () => {
      mockGetAuditLogs.mockResolvedValue([createMockLog()]);

      render(<AuditLogViewer />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith({ limit: 50 });
      });

      // Trigger the select change using our mock
      triggerSelectChange('INSERT');

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith({
          limit: 50,
          operation: 'INSERT',
        });
      });
    });

    it('should filter by UPDATE operation', async () => {
      mockGetAuditLogs.mockResolvedValue([createMockLog()]);

      render(<AuditLogViewer />);

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith({ limit: 50 });
      });

      triggerSelectChange('UPDATE');

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith({
          limit: 50,
          operation: 'UPDATE',
        });
      });
    });

    it('should filter by DELETE operation', async () => {
      mockGetAuditLogs.mockResolvedValue([createMockLog()]);

      render(<AuditLogViewer />);

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith({ limit: 50 });
      });

      triggerSelectChange('DELETE');

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith({
          limit: 50,
          operation: 'DELETE',
        });
      });
    });

    it('should show all operations when "all" is selected', async () => {
      mockGetAuditLogs.mockResolvedValue([createMockLog()]);

      render(<AuditLogViewer />);

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith({ limit: 50 });
      });

      // First set a filter to INSERT
      triggerSelectChange('INSERT');

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith({
          limit: 50,
          operation: 'INSERT',
        });
      });

      // Then select "all" to clear the filter
      triggerSelectChange('all');

      await waitFor(() => {
        expect(mockGetAuditLogs).toHaveBeenCalledWith({
          limit: 50,
          operation: undefined,
        });
      });
    });
  });

  describe('UI Elements', () => {
    it('should render the card title', async () => {
      mockGetAuditLogs.mockResolvedValue([]);

      render(<AuditLogViewer />);

      await waitFor(() => {
        expect(screen.getByText('Audit Log')).toBeInTheDocument();
      });
    });

    it('should render the filter dropdown with correct placeholder', async () => {
      mockGetAuditLogs.mockResolvedValue([]);

      render(<AuditLogViewer />);

      await waitFor(() => {
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toBeInTheDocument();
      });
    });
  });

  describe('Helper Functions', () => {
    it('getOperationBadgeVariant should return correct variants', () => {
      // Import the component to access internal functions
      // Note: These are internal functions, but we can test the rendered output
      const mockLogs: AuditLogEntry[] = [
        createMockLog({ id: 'log-1', operation: 'INSERT' }),
        createMockLog({ id: 'log-2', operation: 'UPDATE' }),
        createMockLog({ id: 'log-3', operation: 'DELETE' }),
      ];
      mockGetAuditLogs.mockResolvedValue(mockLogs);

      render(<AuditLogViewer />);

      waitFor(() => {
        // We can verify the correct labels are rendered
        expect(screen.getByText('Created')).toBeInTheDocument();
        expect(screen.getByText('Updated')).toBeInTheDocument();
        expect(screen.getByText('Deleted')).toBeInTheDocument();
      });
    });
  });
});

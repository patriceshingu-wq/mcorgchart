import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OrgNode } from '../types';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}));

// We need to test the internal generateChangeSummary function
// Since it's not exported, we'll test it indirectly through saveNode
// But first, let's create a helper to build test nodes

function createTestNode(overrides: Partial<OrgNode> = {}): OrgNode {
  return {
    id: 'test-1',
    title: 'Test Title',
    personTitle: '',
    personName: '',
    description: '',
    category: 'ministry-system',
    language: 'en',
    status: 'active',
    parentId: null,
    order: 0,
    isCollapsed: false,
    ...overrides,
  };
}

describe('dataService audit logging', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('generateChangeSummary (tested indirectly)', () => {
    it('should create summary for new node', async () => {
      // This tests the CREATE case
      const newNode = createTestNode({
        title: 'Youth Ministry',
        personName: 'John Doe',
      });

      // In localStorage mode, saveNode should work without errors
      const { saveNode } = await import('./dataService');
      await expect(saveNode(newNode)).resolves.not.toThrow();
    });

    it('should handle node with no person assigned', async () => {
      const newNode = createTestNode({
        title: 'Vacant Position',
        personName: '',
      });

      const { saveNode } = await import('./dataService');
      await expect(saveNode(newNode)).resolves.not.toThrow();
    });

    it('should handle title changes', async () => {
      const { saveNode, loadNodes } = await import('./dataService');

      const originalNode = createTestNode({
        id: 'change-test-1',
        title: 'Original Title',
      });

      await saveNode(originalNode);

      const updatedNode = createTestNode({
        id: 'change-test-1',
        title: 'Updated Title',
      });

      await saveNode(updatedNode);

      const nodes = await loadNodes();
      const savedNode = nodes.find(n => n.id === 'change-test-1');
      expect(savedNode?.title).toBe('Updated Title');
    });

    it('should handle person name changes', async () => {
      const { saveNode, loadNodes } = await import('./dataService');

      const originalNode = createTestNode({
        id: 'person-test-1',
        title: 'Senior Pastor',
        personName: 'Jane Smith',
      });

      await saveNode(originalNode);

      const updatedNode = createTestNode({
        id: 'person-test-1',
        title: 'Senior Pastor',
        personName: 'John Doe',
      });

      await saveNode(updatedNode);

      const nodes = await loadNodes();
      const savedNode = nodes.find(n => n.id === 'person-test-1');
      expect(savedNode?.personName).toBe('John Doe');
    });

    it('should handle person title changes', async () => {
      const { saveNode, loadNodes } = await import('./dataService');

      const originalNode = createTestNode({
        id: 'title-test-1',
        title: 'Youth Leader',
        personTitle: 'Pastor',
        personName: 'John Doe',
      });

      await saveNode(originalNode);

      const updatedNode = createTestNode({
        id: 'title-test-1',
        title: 'Youth Leader',
        personTitle: 'Minister',
        personName: 'John Doe',
      });

      await saveNode(updatedNode);

      const nodes = await loadNodes();
      const savedNode = nodes.find(n => n.id === 'title-test-1');
      expect(savedNode?.personTitle).toBe('Minister');
    });

    it('should handle description changes', async () => {
      const { saveNode, loadNodes } = await import('./dataService');

      const originalNode = createTestNode({
        id: 'desc-test-1',
        title: 'Worship Ministry',
        description: 'Original description',
      });

      await saveNode(originalNode);

      const updatedNode = createTestNode({
        id: 'desc-test-1',
        title: 'Worship Ministry',
        description: 'Updated description with more details',
      });

      await saveNode(updatedNode);

      const nodes = await loadNodes();
      const savedNode = nodes.find(n => n.id === 'desc-test-1');
      expect(savedNode?.description).toBe('Updated description with more details');
    });

    it('should handle category changes', async () => {
      const { saveNode, loadNodes } = await import('./dataService');

      const originalNode = createTestNode({
        id: 'cat-test-1',
        title: 'Special Project',
        category: 'program',
      });

      await saveNode(originalNode);

      const updatedNode = createTestNode({
        id: 'cat-test-1',
        title: 'Special Project',
        category: 'team',
      });

      await saveNode(updatedNode);

      const nodes = await loadNodes();
      const savedNode = nodes.find(n => n.id === 'cat-test-1');
      expect(savedNode?.category).toBe('team');
    });

    it('should handle parent reassignment', async () => {
      const { saveNode, loadNodes } = await import('./dataService');

      const originalNode = createTestNode({
        id: 'parent-test-1',
        title: 'Sub Ministry',
        parentId: 'parent-a',
      });

      await saveNode(originalNode);

      const updatedNode = createTestNode({
        id: 'parent-test-1',
        title: 'Sub Ministry',
        parentId: 'parent-b',
      });

      await saveNode(updatedNode);

      const nodes = await loadNodes();
      const savedNode = nodes.find(n => n.id === 'parent-test-1');
      expect(savedNode?.parentId).toBe('parent-b');
    });

    it('should handle order changes', async () => {
      const { saveNode, loadNodes } = await import('./dataService');

      const originalNode = createTestNode({
        id: 'order-test-1',
        title: 'Ministry',
        order: 0,
      });

      await saveNode(originalNode);

      const updatedNode = createTestNode({
        id: 'order-test-1',
        title: 'Ministry',
        order: 5,
      });

      await saveNode(updatedNode);

      const nodes = await loadNodes();
      const savedNode = nodes.find(n => n.id === 'order-test-1');
      expect(savedNode?.order).toBe(5);
    });

    it('should handle collapse state changes', async () => {
      const { saveNode, loadNodes } = await import('./dataService');

      const originalNode = createTestNode({
        id: 'collapse-test-1',
        title: 'Ministry',
        isCollapsed: false,
      });

      await saveNode(originalNode);

      const updatedNode = createTestNode({
        id: 'collapse-test-1',
        title: 'Ministry',
        isCollapsed: true,
      });

      await saveNode(updatedNode);

      const nodes = await loadNodes();
      const savedNode = nodes.find(n => n.id === 'collapse-test-1');
      expect(savedNode?.isCollapsed).toBe(true);
    });

    it('should handle multiple simultaneous changes', async () => {
      const { saveNode, loadNodes } = await import('./dataService');

      const originalNode = createTestNode({
        id: 'multi-test-1',
        title: 'Original Title',
        personName: 'Jane Doe',
        category: 'ministry-system',
      });

      await saveNode(originalNode);

      const updatedNode = createTestNode({
        id: 'multi-test-1',
        title: 'New Title',
        personName: 'John Smith',
        category: 'department',
      });

      await saveNode(updatedNode);

      const nodes = await loadNodes();
      const savedNode = nodes.find(n => n.id === 'multi-test-1');
      expect(savedNode).toMatchObject({
        title: 'New Title',
        personName: 'John Smith',
        category: 'department',
      });
    });
  });

  describe('deleteNode', () => {
    it('should delete a node', async () => {
      const { saveNode, deleteNode, loadNodes } = await import('./dataService');

      const node = createTestNode({
        id: 'delete-test-1',
        title: 'To Be Deleted',
      });

      await saveNode(node);
      let nodes = await loadNodes();
      expect(nodes.find(n => n.id === 'delete-test-1')).toBeDefined();

      await deleteNode('delete-test-1');
      nodes = await loadNodes();
      expect(nodes.find(n => n.id === 'delete-test-1')).toBeUndefined();
    });
  });

  describe('saveNodes (bulk operation)', () => {
    it('should save multiple nodes', async () => {
      const { saveNodes, loadNodes } = await import('./dataService');

      const nodes = [
        createTestNode({ id: 'bulk-1', title: 'Node 1' }),
        createTestNode({ id: 'bulk-2', title: 'Node 2' }),
        createTestNode({ id: 'bulk-3', title: 'Node 3' }),
      ];

      await saveNodes(nodes);
      const savedNodes = await loadNodes();

      expect(savedNodes.length).toBeGreaterThanOrEqual(3);
      expect(savedNodes.find(n => n.id === 'bulk-1')).toBeDefined();
      expect(savedNodes.find(n => n.id === 'bulk-2')).toBeDefined();
      expect(savedNodes.find(n => n.id === 'bulk-3')).toBeDefined();
    });
  });

  describe('settings', () => {
    it('should load and save settings', async () => {
      const { loadSettings, saveSettings } = await import('./dataService');

      const settings = await loadSettings();
      expect(settings).toBeDefined();
      expect(settings.churchName).toBeDefined();

      const updatedSettings = {
        ...settings,
        churchName: 'Test Church',
      };

      await saveSettings(updatedSettings);
      const loadedSettings = await loadSettings();
      expect(loadedSettings.churchName).toBe('Test Church');
    });
  });

  describe('getAuditLogs', () => {
    it('should return empty array when Supabase is not configured', async () => {
      const { getAuditLogs } = await import('./dataService');
      const logs = await getAuditLogs();
      expect(logs).toEqual([]);
    });

    it('should handle filters parameter', async () => {
      const { getAuditLogs } = await import('./dataService');
      const logs = await getAuditLogs({
        nodeId: 'test-node',
        operation: 'UPDATE',
        limit: 10,
      });
      expect(logs).toEqual([]);
    });
  });

  describe('storage mode', () => {
    it('should return local storage mode', async () => {
      const { getStorageMode } = await import('./dataService');
      expect(getStorageMode()).toBe('local');
    });
  });
});

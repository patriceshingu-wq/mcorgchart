export type NodeCategory =
  | 'senior-leadership'
  | 'executive-leadership'
  | 'ministry-system'
  | 'department'
  | 'program';

export interface OrgNode {
  id: string;
  title: string;
  personName: string;
  description: string;
  category: NodeCategory;
  language: 'english' | 'french' | 'both';
  status: 'active' | 'vacant' | 'inactive';
  parentId: string | null;
  order: number;
  isCollapsed: boolean;
}

export interface AppSettings {
  churchName: string;
  appTitle: string;
  language: 'en' | 'fr';
}

export type ActivePage = 'org-chart' | 'export' | 'settings';
export type ZoomLevel = 50 | 75 | 100 | 125 | 150;

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FilterState {
  search: string;
  category: NodeCategory | '';
  language: 'english' | 'french' | 'both' | '';
  status: 'active' | 'vacant' | 'inactive' | '';
}

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  'senior-leadership': '#7C3AED',
  'executive-leadership': '#2563EB',
  'ministry-system': '#0D9488',
  'department': '#D97706',
  'program': '#16A34A',
};

export const STATUS_COLORS: Record<OrgNode['status'], string> = {
  active: '#16A34A',
  vacant: '#D97706',
  inactive: '#94A3B8',
};

export const ZOOM_LEVELS: ZoomLevel[] = [50, 75, 100, 125, 150];

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
  'senior-leadership': '#9333EA',    // vivid violet
  'executive-leadership': '#3B82F6', // bright blue
  'ministry-system': '#14B8A6',      // vibrant teal (fallback)
  'department': '#F97316',           // bright orange
  'program': '#22C55E',              // bright green
};

// Senior pastors card palette (gold — distinct from exec team blue)
export const SENIOR_PASTORS_PALETTE = {
  accent: '#EAB308',  // gold
  bg: '#1c1100',      // very dark amber
  border: '#713f12',  // dark amber border
};

// Per-ministry color palettes keyed by node ID
export const MINISTRY_PALETTES: Record<string, { accent: string; bg: string; border: string }> = {
  'we-001': { accent: '#EC4899', bg: '#500724', border: '#9d174d' }, // rose    – Worship Experience
  'as-001': { accent: '#F59E0B', bg: '#451a03', border: '#92400e' }, // amber   – Connections
  'ds-001': { accent: '#8B5CF6', bg: '#2e1065', border: '#5b21b6' }, // violet  – Discipleship
  'ng-001': { accent: '#0EA5E9', bg: '#082f49', border: '#0369a1' }, // sky     – Next Gen
  'pc-001': { accent: '#10B981', bg: '#064e3b', border: '#065f46' }, // emerald – Pastoral Care
  'om-001': { accent: '#F97316', bg: '#431407', border: '#9a3412' }, // orange  – Outreach
  'oa-001': { accent: '#6366F1', bg: '#1e1b4b', border: '#3730a3' }, // indigo  – Operations
};

export const STATUS_COLORS: Record<OrgNode['status'], string> = {
  active: '#22C55E',
  vacant: '#F59E0B',
  inactive: '#94A3B8',
};

export const ZOOM_LEVELS: ZoomLevel[] = [50, 75, 100, 125, 150];

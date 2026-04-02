export type NodeCategory =
  | 'senior-leadership'
  | 'executive-leadership'
  | 'ministry-system'
  | 'department'
  | 'program'
  | 'team';

export interface OrgNode {
  id: string;
  title: string;
  personTitle: string; // e.g., "Pastor", "Minister", "Deacon"
  personName: string;
  description: string;
  category: NodeCategory;
  language: 'english' | 'french' | 'both';
  status: 'active' | 'vacant' | 'inactive';
  parentId: string | null;
  order: number;
  isCollapsed: boolean;
  colorIndex?: number; // Optional index into MINISTRY_PALETTE_OPTIONS for custom color
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
  includeSiblings?: boolean;
}

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  'senior-leadership': '#9333EA',    // vivid violet
  'executive-leadership': '#3B82F6', // bright blue
  'ministry-system': '#14B8A6',      // vibrant teal (fallback)
  'department': '#F97316',           // bright orange
  'program': '#22C55E',              // bright green
  'team': '#A78BFA',                 // light violet
};

// Senior pastors card palette (gold — distinct from exec team blue)
export const SENIOR_PASTORS_PALETTE = {
  accent: '#EAB308',  // gold
  bg: '#1c1100',      // very dark amber
  border: '#713f12',  // dark amber border
};

// Resident Pastor palette (teal — bridge between senior leadership and exec team)
export const RESIDENT_PASTOR_PALETTE = {
  accent: '#14B8A6',  // teal
  bg: '#042f2e',      // very dark teal
  border: '#0f766e',  // dark teal border
};

// Per-ministry color palettes keyed by node ID (for seed data)
export const MINISTRY_PALETTES: Record<string, { accent: string; bg: string; border: string }> = {
  'cw-001': { accent: '#A855F7', bg: '#3b0764', border: '#6b21a8' }, // purple  – Church-Wide Initiatives
  'we-001': { accent: '#EC4899', bg: '#500724', border: '#9d174d' }, // rose    – Worship Experience
  'as-001': { accent: '#F59E0B', bg: '#451a03', border: '#92400e' }, // amber   – Connections
  'ds-001': { accent: '#8B5CF6', bg: '#2e1065', border: '#5b21b6' }, // violet  – Discipleship
  'ng-001': { accent: '#0EA5E9', bg: '#082f49', border: '#0369a1' }, // sky     – Next Gen
  'pc-001': { accent: '#10B981', bg: '#064e3b', border: '#065f46' }, // emerald – Pastoral Care
  'om-001': { accent: '#F97316', bg: '#431407', border: '#9a3412' }, // orange  – Outreach
  'oa-001': { accent: '#6366F1', bg: '#1e1b4b', border: '#3730a3' }, // indigo  – Operations
};

// All available color palettes for ministry nodes (user-selectable)
export const MINISTRY_PALETTE_OPTIONS = [
  { name: 'Purple', accent: '#A855F7', bg: '#3b0764', border: '#6b21a8' },
  { name: 'Rose', accent: '#EC4899', bg: '#500724', border: '#9d174d' },
  { name: 'Amber', accent: '#F59E0B', bg: '#451a03', border: '#92400e' },
  { name: 'Violet', accent: '#8B5CF6', bg: '#2e1065', border: '#5b21b6' },
  { name: 'Sky', accent: '#0EA5E9', bg: '#082f49', border: '#0369a1' },
  { name: 'Emerald', accent: '#10B981', bg: '#064e3b', border: '#065f46' },
  { name: 'Orange', accent: '#F97316', bg: '#431407', border: '#9a3412' },
  { name: 'Indigo', accent: '#6366F1', bg: '#1e1b4b', border: '#3730a3' },
  { name: 'Teal', accent: '#14B8A6', bg: '#042f2e', border: '#0f766e' },
  { name: 'Red', accent: '#EF4444', bg: '#450a0a', border: '#991b1b' },
  { name: 'Blue', accent: '#3B82F6', bg: '#172554', border: '#1e40af' },
  { name: 'Lime', accent: '#84CC16', bg: '#1a2e05', border: '#3f6212' },
  { name: 'Pink', accent: '#F472B6', bg: '#4a0d2e', border: '#9d174d' },
  { name: 'Cyan', accent: '#22D3EE', bg: '#083344', border: '#0e7490' },
  { name: 'Yellow', accent: '#FBBF24', bg: '#422006', border: '#a16207' },
  { name: 'Fuchsia', accent: '#C084FC', bg: '#3b0764', border: '#7c3aed' },
];

// Map old seed node IDs to palette indices for backwards compatibility
const SEED_NODE_PALETTE_MAP: Record<string, number> = {
  'cw-001': 0,  // purple
  'we-001': 1,  // rose
  'as-001': 2,  // amber
  'ds-001': 3,  // violet
  'ng-001': 4,  // sky
  'pc-001': 5,  // emerald
  'om-001': 6,  // orange
  'oa-001': 7,  // indigo
};

// Generate a consistent hash from a string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Get a ministry palette - checks colorIndex first, then seed map, then hash-based fallback
export function getMinistryPalette(nodeId: string, colorIndex?: number): { accent: string; bg: string; border: string } {
  // If explicit colorIndex is provided, use it
  if (colorIndex !== undefined && colorIndex >= 0 && colorIndex < MINISTRY_PALETTE_OPTIONS.length) {
    return MINISTRY_PALETTE_OPTIONS[colorIndex];
  }
  // Check if it's a seed node with predefined color
  if (SEED_NODE_PALETTE_MAP[nodeId] !== undefined) {
    return MINISTRY_PALETTE_OPTIONS[SEED_NODE_PALETTE_MAP[nodeId]];
  }
  // Fallback: use hash of node ID to pick a palette
  const index = hashString(nodeId) % MINISTRY_PALETTE_OPTIONS.length;
  return MINISTRY_PALETTE_OPTIONS[index];
}

export const STATUS_COLORS: Record<OrgNode['status'], string> = {
  active: '#22C55E',
  vacant: '#F59E0B',
  inactive: '#94A3B8',
};

export const ZOOM_LEVELS: ZoomLevel[] = [50, 75, 100, 125, 150];

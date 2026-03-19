# Mont Carmel Org Chart Builder — Lovable Prompt (Revised)

---

## PROJECT OVERVIEW

Build a React web app called **"Mont Carmel Org Chart Builder"**.

This app has one purpose: create, view, edit, reorganize, and export a church organizational chart. Do not build dashboards, roster management, program planning, or any other module. Every decision should serve the org chart use case.

---

## TECH STACK

- React with TypeScript
- Tailwind CSS
- shadcn/ui components (Dialog, Sheet, Select, Badge, Button, Input, Textarea, Toast, AlertDialog, Tabs, Separator, DropdownMenu, Tooltip)
- lucide-react icons
- localStorage for persistence (structure code so API calls can replace localStorage later)
- No backend required

---

## DATA MODEL

Define this TypeScript interface as the single source of truth for all node data:

```ts
interface OrgNode {
  id: string;           // uuid
  title: string;        // role title, e.g. "Senior Pastor"
  personName: string;   // assigned person, e.g. "Rev. S. Y. Freddy Shembo"
  description: string;  // short role description
  category: NodeCategory;
  language: 'english' | 'french' | 'both';
  status: 'active' | 'vacant' | 'inactive';
  parentId: string | null; // null = root node
  order: number;        // integer for sibling ordering within parent
  isCollapsed: boolean; // whether subtree is hidden in chart view
}

type NodeCategory =
  | 'senior-leadership'
  | 'executive-leadership'
  | 'ministry-system'
  | 'department'
  | 'program';
```

Store all nodes in a single `nodes: OrgNode[]` array in localStorage under the key `mont-carmel-orgchart-v1`. Also store app settings separately under `mont-carmel-settings-v1`:

```ts
interface AppSettings {
  churchName: string;   // default: "Mont Carmel"
  appTitle: string;     // default: "Org Chart Builder"
  language: 'en' | 'fr';
}
```

---

## LAYOUT

Use a three-panel layout:

```
┌─────────────────────────────────────────────────────────┐
│  TOP BAR                                                │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ LEFT     │   MAIN WORKSPACE                             │
│ SIDEBAR  │   (Org Chart or List View)                   │
│          │                                              │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

**Top bar** contains:
- Church name / app title (left)
- Language toggle: `EN | FR` buttons (right)
- Section navigation: Org Chart | Export | Settings (center or right)

**Left sidebar** (collapsible, ~240px wide) contains:
- Search input
- Filter controls: Category, Language, Status (each as a Select or set of toggle pills)
- "Add Node" button (primary)
- Node count summary

**Main workspace** switches between:
- Visual org chart (default)
- List/table view
- Export page
- Settings page

Use a `Tabs` or toggle in the workspace header to switch between chart and list views within the Org Chart section.

---

## SECTION 1 — ORG CHART

### 1A. Visual Chart View

Render the org chart as a vertical top-down tree hierarchy.

**Layout approach:**
- Use a recursive tree rendering function that computes (x, y) positions for each node based on depth and sibling count
- Render nodes as absolutely positioned cards within a scrollable, pannable container div
- Render connector lines using an SVG overlay (absolutely positioned, same size as the container, pointer-events: none) with `<line>` or `<path>` elements drawn from parent card bottom-center to child card top-center
- The container should support:
  - Horizontal and vertical scrolling (overflow: auto)
  - Zoom via buttons (0.5x, 0.75x, 1x, 1.25x, 1.5x) using CSS `transform: scale()` on the inner canvas div
  - Pan via mouse drag (mousedown + mousemove + mouseup on the container)

**Node cards:**
Each node renders as a card (~180px wide, auto height) showing:
- Category color bar on the left edge (5px wide, full height)
- Status dot (top right corner): green = active, amber = vacant, gray = inactive
- Role title (bold, 13px)
- Person name (regular, 12px, muted)
- Language badge (small pill: "EN", "FR", or "EN/FR")
- Collapse/expand toggle if node has children (chevron icon, bottom center)

**Category color mapping (left border and badge):**
- `senior-leadership` → purple (`#7C3AED`)
- `executive-leadership` → blue (`#2563EB`)
- `ministry-system` → teal (`#0D9488`)
- `department` → amber (`#D97706`)
- `program` → green (`#16A34A`)

**Node interaction:**
- Click a node card → open the Detail Panel (right-side Sheet)
- Right-click or kebab menu (⋮) on a node → dropdown with: Edit, Add Child, Reassign Parent, Delete
- Collapse/expand toggle → hides or shows the subtree of that node in the visual chart. Persist `isCollapsed` in the node data.

**Reassign Parent:**
- Open a modal (Dialog) with a searchable dropdown listing all nodes except the current node and its own descendants
- Selecting a new parent updates `parentId` and saves

**Visual feedback during reorganization:**
- Since drag-and-drop is unreliable in sandboxed environments, implement node reorganization via the "Reassign Parent" modal only. Do NOT attempt drag-and-drop.
- Node sibling ordering can be adjusted with Up / Down arrow buttons in the edit modal (changes `order` field)

**Filtering:**
- Applying a filter dims non-matching nodes (opacity: 0.3) and highlights matching nodes
- Search highlights matching nodes by showing a colored ring around their card

### 1B. List / Table View

Render all nodes in a sortable table with these columns:
- Title
- Person Name
- Category (badge)
- Language (badge)
- Status (dot + label)
- Reports To (parent node title)
- Actions (Edit icon, Delete icon)

Default sort: by category order, then by `order` within siblings.
Allow sorting by clicking column headers (Title, Category, Status).
Each row is clickable and opens the Detail Panel.

### 1C. Detail Panel (Right Sheet)

When a node is clicked, open a shadcn Sheet from the right side showing:
- Role title (heading)
- Person name
- Description
- Category badge
- Language badge
- Status badge
- Reports To: parent node title (clickable → selects that node)
- Direct Reports: list of child node titles
- Edit button (opens Edit Modal)
- Delete button (opens confirm dialog)

### 1D. Add / Edit Modal (Dialog)

A shadcn Dialog with a form containing:
- Title (Input, required)
- Person Name (Input)
- Description (Textarea)
- Category (Select)
- Language Context (Select: English / French / Both)
- Status (Select: Active / Vacant / Inactive)
- Reports To / Parent Node (Select, searchable list of all nodes — shows "None" for root)
- Order within siblings (number input or Up/Down arrows)
- Save button / Cancel button

Validation: Title is required. Show inline error if empty on submit.

On save: show a toast notification ("Node saved" / "Nœud enregistré").

### 1E. Delete Confirmation

Use shadcn AlertDialog with:
- Warning message: "Deleting this node will also delete all its child nodes. This cannot be undone."
- French version when language is FR
- Cancel and Confirm (destructive) buttons
- On confirm: show toast ("Node deleted" / "Nœud supprimé")

---

## SECTION 2 — EXPORT

A dedicated page (not a modal) with four export options displayed as cards:

### Export to PDF / Print
- Button: "Print Org Chart" / "Imprimer l'organigramme"
- Action: `window.print()`
- Include a `@media print` CSS block that:
  - Hides sidebar, top bar, and all buttons
  - Shows the full org chart canvas in print-friendly layout
  - Adds a print header with church name and date generated (`new Date().toLocaleDateString()`)
  - Uses black-and-white friendly styling (borders instead of color fills)
  - Forces page orientation to landscape

### Export as JSON
- Button: "Export JSON"
- Action: generates a JSON file download containing `{ settings, nodes, exportedAt }`
- Filename: `mont-carmel-orgchart-YYYY-MM-DD.json`

### Import from JSON
- Button: "Import JSON" / "Importer JSON"
- Action: triggers file input (`.json` only)
- On file selected: parse and validate the JSON
  - Must contain a `nodes` array where each item has at minimum `id`, `title`, `parentId`
  - If valid: show AlertDialog — "Importing will replace all current data. Continue?" with Cancel and Import buttons
  - If invalid: show toast error — "Invalid file format" / "Format de fichier invalide"
  - On confirm: replace localStorage data and reload the chart

---

## SECTION 3 — SETTINGS

A dedicated settings page with these controls:

| Setting | Control |
|---|---|
| Church Name | Input (updates app title in top bar) |
| App Title | Input |
| Interface Language | Toggle: EN / FR |
| Reset to Default Data | Button (destructive) — triggers AlertDialog: "This will delete all your changes and restore the original church structure. Type RESET to confirm." Shows a text input that must equal "RESET" before the Confirm button activates. |
| Export All App Data | Same as JSON export above |
| Import App Data | Same as JSON import above |

---

## BILINGUAL INTERFACE

Store all UI strings in a translations object. Switch all labels instantly when the language toggle is changed. The language setting persists in `AppSettings`.

Define at minimum these translation keys:

```ts
const t = {
  en: {
    orgChart: "Org Chart",
    export: "Export",
    settings: "Settings",
    addNode: "Add Node",
    editNode: "Edit Node",
    deleteNode: "Delete Node",
    search: "Search",
    filter: "Filter",
    category: "Category",
    language: "Language",
    status: "Status",
    reportsTo: "Reports To",
    directReports: "Direct Reports",
    personName: "Person Name",
    description: "Description",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirm: "Confirm",
    active: "Active",
    vacant: "Vacant",
    inactive: "Inactive",
    english: "English",
    french: "French",
    both: "Both",
    seniorLeadership: "Senior Leadership",
    executiveLeadership: "Executive Leadership",
    ministrySystem: "Ministry System",
    department: "Department",
    program: "Program / Initiative",
    nodeSaved: "Node saved",
    nodeDeleted: "Node deleted",
    importSuccess: "Chart imported successfully",
    importError: "Invalid file format",
    deleteWarning: "Deleting this node will also delete all its child nodes. This cannot be undone.",
    importWarning: "Importing will replace all current data. Continue?",
    resetWarning: "This will delete all your changes and restore the original church structure. Type RESET to confirm.",
    printHeader: "Organizational Chart",
    generatedOn: "Generated on",
    noResults: "No nodes match your search or filters.",
    emptyChart: "No nodes yet. Click 'Add Node' to get started.",
    listView: "List View",
    chartView: "Chart View",
    churchName: "Church Name",
    appTitle: "App Title",
    resetData: "Reset to Default Data",
    exportData: "Export All Data",
    importData: "Import Data",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    collapse: "Collapse",
    expand: "Expand",
    addChild: "Add Child Node",
    reassignParent: "Reassign Parent",
    selectParent: "Select Parent Node",
    noParent: "None (Root Node)",
    printChart: "Print Org Chart",
    exportJson: "Export JSON",
    importJson: "Import JSON",
    title: "Title",
    titleRequired: "Title is required",
    order: "Order",
    moveUp: "Move Up",
    moveDown: "Move Down",
  },
  fr: {
    orgChart: "Organigramme",
    export: "Exportation",
    settings: "Paramètres",
    addNode: "Ajouter un nœud",
    editNode: "Modifier le nœud",
    deleteNode: "Supprimer le nœud",
    search: "Rechercher",
    filter: "Filtrer",
    category: "Catégorie",
    language: "Langue",
    status: "Statut",
    reportsTo: "Relève de",
    directReports: "Supervise",
    personName: "Nom de la personne",
    description: "Description",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    confirm: "Confirmer",
    active: "Actif",
    vacant: "Vacant",
    inactive: "Inactif",
    english: "Anglais",
    french: "Français",
    both: "Les deux",
    seniorLeadership: "Direction principale",
    executiveLeadership: "Direction exécutive",
    ministrySystem: "Système ministériel",
    department: "Département",
    program: "Programme / Initiative",
    nodeSaved: "Nœud enregistré",
    nodeDeleted: "Nœud supprimé",
    importSuccess: "Organigramme importé avec succès",
    importError: "Format de fichier invalide",
    deleteWarning: "La suppression de ce nœud supprimera également tous ses nœuds enfants. Cette action est irréversible.",
    importWarning: "L'importation remplacera toutes les données actuelles. Continuer ?",
    resetWarning: "Cela supprimera toutes vos modifications et restaurera la structure originale. Tapez RESET pour confirmer.",
    printHeader: "Organigramme",
    generatedOn: "Généré le",
    noResults: "Aucun nœud ne correspond à votre recherche ou vos filtres.",
    emptyChart: "Aucun nœud. Cliquez sur 'Ajouter un nœud' pour commencer.",
    listView: "Vue liste",
    chartView: "Vue organigramme",
    churchName: "Nom de l'église",
    appTitle: "Titre de l'application",
    resetData: "Réinitialiser les données",
    exportData: "Exporter toutes les données",
    importData: "Importer des données",
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
    collapse: "Réduire",
    expand: "Développer",
    addChild: "Ajouter un nœud enfant",
    reassignParent: "Réassigner le parent",
    selectParent: "Sélectionner le nœud parent",
    noParent: "Aucun (Nœud racine)",
    printChart: "Imprimer l'organigramme",
    exportJson: "Exporter JSON",
    importJson: "Importer JSON",
    title: "Titre",
    titleRequired: "Le titre est obligatoire",
    order: "Ordre",
    moveUp: "Monter",
    moveDown: "Descendre",
  }
};
```

---

## DESIGN SYSTEM

**Color palette:**
```css
:root {
  --color-senior:    #7C3AED;
  --color-executive: #2563EB;
  --color-ministry:  #0D9488;
  --color-department:#D97706;
  --color-program:   #16A34A;
  --color-active:    #16A34A;
  --color-vacant:    #D97706;
  --color-inactive:  #6B7280;
}
```

**Node card status dot:**
- Active: solid green circle, 8px
- Vacant: solid amber circle, 8px
- Inactive: solid gray circle, 8px

**Typography:**
- Use system font stack or a clean sans-serif (e.g. `font-family: 'Inter', sans-serif` via Google Fonts or Tailwind default)
- Role title: `text-sm font-semibold`
- Person name: `text-xs text-muted-foreground`
- Badge text: `text-xs`

**Spacing:**
- Node cards: min-width 180px, padding 12px
- Tree spacing: 40px vertical gap between parent bottom and child top, 20px horizontal gap between siblings
- Sidebar: 240px fixed width, collapsible on smaller screens

**Empty states:**
- Visual chart with no nodes: centered illustration placeholder (simple SVG of an org chart outline) + message + "Add Node" button
- List view with no results: centered message (`t.noResults`) and clear filters button
- If filtered results are empty but unfiltered nodes exist: show "No nodes match your filters" + "Clear filters" button

---

## SEED DATA

Initialize with this data if localStorage is empty. All nodes use `status: 'active'` unless noted. Generate proper UUIDs for all `id` fields.

The hierarchy has 5 levels: Senior Pastors → Resident Pastor → Executive Team → Ministry Systems → Departments/Programs.

**Key structural notes:**
- "Executive Team" is a virtual coordinating node. It has no assigned person. It exists to represent the co-supervisory layer where both executives and all ministry systems sit together under the Resident Pastor.
- Both executives (French and English) are siblings of the 8 ministry systems, all sharing `parentId: → Executive Team`. Neither executive is the parent of any ministry system.
- All ministry systems and their departments serve the bilingual congregation, so all are `language: 'both'`.
- Church-Wide Initiatives and its two program children report to Resident Pastor directly (they are congregation-wide, not ministry-system-level).

```
Senior Pastors [senior-leadership, both]
  personName: "Rev. S. Y. Freddy Shembo & Rev. Beatrice Shembo"
  description: "Lead the overall vision, spiritual direction, and mission of Mont Carmel Church"
  parentId: null  ← ROOT NODE
  │
  └── Resident Pastor [executive-leadership, both]
        personName: "Patrice Shingu"
        description: "Oversees day-to-day church operations and supervises the executive leadership team"
        parentId: → Senior Pastors
        │
        ├── Executive Team [executive-leadership, both]
        │     personName: ""
        │     description: "The executive leadership layer that jointly supervises all ministry systems. Both executives function as assistants to the Resident Pastor."
        │     parentId: → Resident Pastor
        │     │
        │     ├── Executive Pastor – French Ministries [executive-leadership, french]
        │     │     personName: "Pastor Roger Dinanga"
        │     │     description: "Assists the Resident Pastor in providing executive oversight across all ministry systems, with a focus on French-language expressions"
        │     │     parentId: → Executive Team
        │     │
        │     ├── Executive Minister – English Ministries [executive-leadership, english]
        │     │     personName: "Minister Yanick"
        │     │     description: "Assists the Resident Pastor in providing executive oversight across all ministry systems, with a focus on English-language expressions"
        │     │     parentId: → Executive Team
        │     │
        │     ├── Weekend Experience Ministry [ministry-system, both]
        │     │     personName: ""  status: vacant
        │     │     description: "Coordinates all elements of the weekend worship service experience for both language congregations"
        │     │     parentId: → Executive Team
        │     │     children:
        │     │       - Worship Teams [department, both]
        │     │           description: "Leads congregational worship through music, song, and arts in French and English"
        │     │       - MC Music [department, both]
        │     │           description: "Produces and develops original music for Mont Carmel's worship culture"
        │     │       - French / English Production [department, both]
        │     │           description: "Manages audio, video, and lighting for all French and English services"
        │     │
        │     ├── Assimilation (Connection) [ministry-system, both]
        │     │     personName: ""  status: vacant
        │     │     description: "Helps first-time visitors and new members connect and integrate into the life of the church"
        │     │     parentId: → Executive Team
        │     │     children:
        │     │       - Guest Services [department, both]
        │     │           description: "Creates a warm and welcoming environment for all attendees on Sunday and at church events"
        │     │       - First-Time Follow-Up [department, both]
        │     │           description: "Reaches out intentionally to new visitors after their first visit to the church"
        │     │       - Next Steps [department, both]
        │     │           description: "Guides newcomers and members through defined spiritual growth and involvement pathways"
        │     │       - Membership & Integration [department, both]
        │     │           description: "Manages the membership process and supports the social integration of new members"
        │     │
        │     ├── Discipleship & Spiritual Formation [ministry-system, both]
        │     │     personName: ""  status: vacant
        │     │     description: "Develops mature disciples through teaching, community, prayer, and spiritual disciplines"
        │     │     parentId: → Executive Team
        │     │     children:
        │     │       - Small Groups [department, both]
        │     │           description: "Organizes and supports life groups, home cells, and community circles in both languages"
        │     │       - Prayer Teams [department, both]
        │     │           description: "Coordinates intercessory prayer ministries and equips the church in prayer"
        │     │       - Bible Study & Sacraments [department, both]
        │     │           description: "Facilitates systematic Bible teaching and oversees sacramental practices including baptism and communion"
        │     │       - Leadership Development [department, both]
        │     │           description: "Identifies, trains, and deploys emerging leaders across all ministry areas"
        │     │       - Prayer & Renewal Programs [department, both]
        │     │           description: "Coordinates extended prayer seasons, fasting initiatives, and spiritual renewal events"
        │     │
        │     ├── Next Generation Ministry [ministry-system, both]
        │     │     personName: ""  status: vacant
        │     │     description: "Ministers to the next generation — children, students, and young adults — in both languages"
        │     │     parentId: → Executive Team
        │     │     children:
        │     │       - Kids Ministry [department, both]
        │     │           description: "Nurtures the faith of children from birth through Grade 5 in a safe, engaging bilingual environment"
        │     │       - Students Ministry [department, both]
        │     │           description: "Disciples middle and high school students through relevant teaching and community"
        │     │       - Young Adults [department, both]
        │     │           description: "Engages adults ages 18–30 in intentional community, discipleship, and leadership"
        │     │
        │     ├── Pastoral Care & Community Life [ministry-system, both]
        │     │     personName: ""  status: vacant
        │     │     description: "Provides compassionate spiritual care and practical support to church members and their families"
        │     │     parentId: → Executive Team
        │     │     children:
        │     │       - Family Care [department, both]
        │     │           description: "Supports families through pastoral visits, prayer, and practical assistance"
        │     │       - Counseling [department, both]
        │     │           description: "Offers faith-based counseling and referral services to members in need"
        │     │       - Membership Care [department, both]
        │     │           description: "Follows up with members during significant life transitions and seasons of need"
        │     │       - Hospital Care [department, both]
        │     │           description: "Ministers to members and their families who are hospitalized or facing serious illness"
        │     │       - Special Events [department, both]
        │     │           description: "Plans and coordinates church-wide celebrations, memorials, and special occasions"
        │     │
        │     ├── Outreach & Mission [ministry-system, both]
        │     │     personName: ""  status: vacant
        │     │     description: "Extends the church's redemptive impact locally and globally through evangelism and service"
        │     │     parentId: → Executive Team
        │     │     children:
        │     │       - Evangelism [department, both]
        │     │           description: "Equips and mobilizes members to share their faith naturally in everyday life"
        │     │       - Community Outreach [department, both]
        │     │           description: "Serves the local community through practical acts of mercy and social engagement"
        │     │       - Global Missions [department, both]
        │     │           description: "Partners with missionaries, church planters, and global organizations to advance the Gospel"
        │     │
        │     └── Operations & Administration [ministry-system, both]
        │           personName: ""  status: vacant
        │           description: "Manages the operational, financial, and logistical infrastructure that supports the mission of the church"
        │           parentId: → Executive Team
        │           children:
        │             - Office Admin [department, both]
        │                 description: "Handles day-to-day administrative tasks and coordinates church office operations"
        │             - Finance [department, both]
        │                 description: "Manages the church budget, accounting, giving records, and financial reporting"
        │             - Facilities [department, both]
        │                 description: "Maintains and manages church buildings, equipment, and grounds"
        │             - Technology [department, both]
        │                 description: "Supports all technology infrastructure, digital tools, and media systems"
        │
        └── Church-Wide Initiatives [ministry-system, both]
              personName: ""  status: active
              description: "Special congregation-wide programs that unite the entire church body in focused spiritual activity"
              parentId: → Resident Pastor
              children:
                - 1 Week at the Feet of Jesus [program, both]
                    description: "An annual week of focused prayer, fasting, and worship held at the feet of Christ"
                - 21 Days Prayer Program [program, both]
                    description: "A church-wide 21-day fasting and prayer initiative that launches the new year"
```

**Notes on seed data:**
- "Senior Pastors" is the root node (`parentId: null`). There is exactly one root.
- "Executive Team" is a virtual structural node with no assigned person. Do not show it as vacant — use `status: 'active'` and leave `personName` as an empty string.
- Church-Wide Initiatives reports directly to Resident Pastor (not Executive Team) because these programs are congregation-wide and not ministry-system-level.
- Department names have been updated to match the org chart image: "Worship Teams", "MC Music", "French / English Production" (Weekend Experience); "First-Time Follow-Up", "Membership & Integration" (Assimilation); "Bible Study & Sacraments", "Prayer & Renewal Programs" (Discipleship).

---

## UX BEHAVIORS

- **Toast notifications:** Show on every save, delete, import, and export action. Use shadcn Sonner or Toast. Position: bottom-right.
- **Keyboard:** All modals must be closeable with the Escape key. Tab order must be logical within forms.
- **Focus management:** When a modal opens, focus the first input. When it closes, return focus to the trigger element.
- **Collapse/expand:** Collapsing a node hides its entire subtree from the visual chart. The connector line from the parent ends at the node's card. A collapsed node shows a "+" badge on its card indicating hidden children count.
- **Zoom:** Implement as 5 fixed steps: 50%, 75%, 100%, 125%, 150%. Show the current zoom level (e.g., "100%") between the zoom buttons.
- **Pan:** On mousedown on the canvas background (not on a node card), enable drag-to-pan. Show a grab cursor.
- **Filtering:** Filters are additive (AND logic). A node is visible if it matches ALL active filters. If a node is hidden by filter, its children are also hidden.
- **Search:** Search matches against `title`, `personName`, and `description` fields (case-insensitive). Matching nodes are highlighted. Non-matching nodes are dimmed.

---

## COMPONENT STRUCTURE (SUGGESTED)

```
src/
  components/
    layout/
      TopBar.tsx
      Sidebar.tsx
    orgchart/
      OrgChartCanvas.tsx       ← scrollable/pannable/zoomable container
      OrgChartNode.tsx         ← individual node card
      OrgChartConnectors.tsx   ← SVG overlay for lines
      NodeDetailSheet.tsx      ← right-side detail panel
      NodeFormModal.tsx        ← add/edit dialog
      ReassignParentModal.tsx  ← reassign parent dialog
      DeleteConfirmDialog.tsx
    listview/
      NodeListTable.tsx
    export/
      ExportPage.tsx
    settings/
      SettingsPage.tsx
  hooks/
    useNodes.ts          ← CRUD operations + localStorage
    useSettings.ts       ← app settings + localStorage
    useTranslation.ts    ← returns t[lang] strings
    useOrgTree.ts        ← tree computation (children lookup, subtree helpers)
  data/
    seedData.ts          ← default nodes array
    translations.ts      ← full EN/FR strings object
  types/
    index.ts             ← OrgNode, AppSettings, NodeCategory types
  App.tsx
```

---

## PRINT / PDF STYLES

Add this CSS block for `@media print`:

```css
@media print {
  body * { visibility: hidden; }
  #print-area, #print-area * { visibility: visible; }
  #print-area {
    position: absolute;
    left: 0; top: 0;
    width: 100%;
  }
  .no-print { display: none !important; }

  /* Print header */
  #print-header {
    display: block !important;
    text-align: center;
    margin-bottom: 24px;
    font-size: 18px;
    font-weight: 600;
  }

  /* Grayscale-friendly node cards */
  .org-node-card {
    border: 1px solid #333 !important;
    background: white !important;
    color: black !important;
  }
  .org-node-category-bar {
    background: #333 !important;
  }
}
```

The `#print-area` should wrap the full org chart canvas. The `#print-header` div (hidden by default) shows church name + generated date and becomes visible during print.

---

## FINAL NOTES FOR LOVABLE

- Generate all UUIDs using `crypto.randomUUID()` in seedData.ts
- The chart should render correctly with all ~48 seed nodes without overlapping or clipping
- Do not use `react-dnd`, `react-beautiful-dnd`, or any drag-and-drop library — node reorganization is done via the Reassign Parent modal
- All shadcn components should be imported from `@/components/ui/...`
- Export and Settings are full-page views, not modals — swap the main workspace content
- The app should be fully functional on first load with seed data pre-populated

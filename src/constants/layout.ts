// Layout height constants for org chart nodes.
// SCREEN values are used by OrgChartConnectors for the interactive chart.
// PRINT values are used by PrintableOrgChart for the print layout.
// Both sets must be kept in sync with the CSS/Tailwind classes that render
// the corresponding rows in EmbeddedDeptList and EmbeddedExecList.

export const SCREEN = {
  DEPT_ROW_HEIGHT: 26,
  SUBDEPT_ROW_HEIGHT: 18,
  SUBDEPT_CONTAINER_PADDING: 4,
  PROGRAM_ROW_HEIGHT: 26,
  PROGRAM_HEADER_HEIGHT: 24,
  EXEC_ROW_HEIGHT: 36,
  SENIOR_ROW_HEIGHT: 36,
  DARK_CARD_HEADER_HEIGHT: 68,
  LIST_PADDING: 12,
} as const;

export const PRINT = {
  DARK_CARD_HEADER_HEIGHT: 58,
  DEPT_ROW_HEIGHT: 22,
  SUBDEPT_ROW_HEIGHT: 16,
  SUBDEPT_CONTAINER_PADDING: 4,
  PROGRAM_ROW_HEIGHT: 22,
  PROGRAM_HEADER_HEIGHT: 20,
  EXEC_ROW_HEIGHT: 30,
  SENIOR_ROW_HEIGHT: 30,
  LIST_PADDING: 10,
} as const;

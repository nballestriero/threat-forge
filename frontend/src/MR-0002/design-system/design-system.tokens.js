/**
 * @file Shared MR-0002 design tokens and semantic icon tokens.
 *
 * @implementsRequirement MR-0002REQ-0022
 * @implementsRequirement MR-0002REQ-0023
 * @implementsRequirement MR-0002REQ-0025
 * @implementsRequirement MR-0002REQ-0039
 * @implementsRequirement MR-0002REQ-0040
 * @implementsRequirement MR-0002REQ-0061
 * @implementsRequirement MR-0002REQ-0062
 * @implementsRequirement MR-0002REQ-0063
 * @implementsRequirement MR-0002REQ-0064
 * @implementsRequirement MR-0003REQ-0013
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0010
 * @derivedFromDecision MR-0002/ADR-0025
 * @derivedFromDecision MR-0002/ADR-0026
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0011
 * @macroRequirement MR-0002
 *
 * The design system exposes semantic, stable tokens for shared frontend slices.
 * Feature pages must consume these tokens rather than inventing local layout,
 * icon, color or status vocabularies. The platform-only Child Projects and Governance
 * Plans navigation tokens are stable and capability-named for MR-0003 read-only
 * UI slices. The concrete icon glyph mapping is intentionally replaceable and
 * must remain hidden behind the shared Icon component. Shared color roles
 * are named semantically so stylesheet variables and later visual refinements
 * can stay aligned without page-local palettes.
 *
 * Side effects: none. This module exports immutable token maps only.
 */
export const shellNavigation = Object.freeze([
  {
    id: "project-documentation",
    label: "Project Documentation",
    icon: "navigation.projectDocumentation",
    iconTone: "documentation",
    capability: "project_model.documentation.read",
  },
  {
    id: "graph",
    label: "Graph Explorer",
    icon: "navigation.graph",
    iconTone: "model",
    capability: "project_model.graph.read",
    disabled: true,
    stateLabel: "Planned",
  },
  {
    id: "threat-analysis",
    label: "Threat Analysis",
    icon: "navigation.threatAnalysis",
    iconTone: "security",
    capability: "threat_analysis.read",
    disabled: true,
    stateLabel: "Planned",
  },
  {
    id: "child-projects",
    label: "Child Projects",
    icon: "navigation.childProjects",
    iconTone: "workspace",
    capability: "child_projects.view_operational_state",
    platformOnly: true,
  },
  {
    id: "child-governance-plans",
    label: "Governance Plans",
    icon: "navigation.governancePlans",
    iconTone: "governance",
    capability: "child_project_governance_plan.read",
    platformOnly: true,
  },
  {
    id: "reports",
    label: "Reports",
    icon: "navigation.reports",
    iconTone: "reporting",
    capability: "reports.read",
    disabled: true,
    stateLabel: "Planned",
  },
]);

export const iconTokens = Object.freeze({
  navigation: Object.freeze({
    projectDocumentation: "document-search",
    graph: "connected-nodes",
    threatAnalysis: "shield-analysis",
    childProjects: "project-board",
    governancePlans: "clipboard-check",
    reports: "bar-chart",
  }),
  action: Object.freeze({
    back: "arrow-left",
    filter: "filter",
    reset: "x",
    search: "search",
    open: "external-link",
  }),
  entity: Object.freeze({
    macro_requirement: "layers",
    requirement: "check-square",
    adr: "git-branch",
    taxonomy: "tags",
    document: "file-text",
    source: "code",
  }),
  status: Object.freeze({
    accepted: "check-circle",
    approved: "check-circle",
    active: "check-circle",
    pass: "check-circle",
    fail: "x",
    warning: "circle-dashed",
    planned: "clock",
    unsupported: "circle-help",
    not_applicable: "circle-dashed",
    draft: "circle-dashed",
    implemented: "badge-check",
    not_implemented: "clock",
    partially_implemented: "circle-dashed",
    unknown: "circle-help",
  }),
});

export const statusLabels = Object.freeze({
  accepted: "Accepted",
  approved: "Approved",
  active: "Active",
  implemented: "Implemented",
  not_implemented: "To do",
  partially_implemented: "Partial",
  unknown: "Unknown",
  not_applicable: "N/A",
  planned: "Planned",
  pass: "Pass",
  fail: "Fail",
  warning: "Warning",
  unsupported: "Unsupported",
});

export const semanticColorTokens = Object.freeze({
  canvas: Object.freeze({
    page: "--tf-color-canvas-page",
    topbar: "--tf-color-canvas-topbar",
  }),
  surface: Object.freeze({
    panel: "--tf-color-surface-panel",
    muted: "--tf-color-surface-muted",
    soft: "--tf-color-surface-soft",
    subtle: "--tf-color-surface-subtle",
  }),
  border: Object.freeze({
    default: "--tf-color-border-default",
    muted: "--tf-color-border-muted",
    soft: "--tf-color-border-soft",
    strong: "--tf-color-border-strong",
    focus: "--tf-color-border-focus",
  }),
  text: Object.freeze({
    primary: "--tf-color-text-primary",
    secondary: "--tf-color-text-secondary",
    muted: "--tf-color-text-muted",
    subtle: "--tf-color-text-subtle",
    inverse: "--tf-color-text-inverse",
  }),
  action: Object.freeze({
    primaryBackground: "--tf-color-action-primary-bg",
    primaryBorder: "--tf-color-action-primary-border",
    primaryText: "--tf-color-action-primary-text",
  }),
  focus: Object.freeze({
    border: "--tf-color-focus-border",
    ring: "--tf-color-focus-ring",
  }),
  shadow: Object.freeze({
    hairline: "--tf-shadow-hairline",
    overlay: "--tf-shadow-overlay",
  }),
  statusAccent: Object.freeze({
    neutral: "--tf-status-neutral-accent",
    success: "--tf-status-success-accent",
    warning: "--tf-status-warning-accent",
    danger: "--tf-status-danger-accent",
    info: "--tf-status-info-accent",
  }),
});


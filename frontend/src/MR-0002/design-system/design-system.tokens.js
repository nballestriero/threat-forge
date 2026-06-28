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
 * @implementsRequirement MR-0002REQ-0065
 * @implementsRequirement MR-0003REQ-0013
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0010
 * @derivedFromDecision MR-0002/ADR-0025
 * @derivedFromDecision MR-0002/ADR-0026
 * @derivedFromDecision MR-0002/ADR-0027
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
 * can stay aligned without page-local palettes. Status badge semantics also
 * map raw read-model values to compact tones, labels and icon tokens.
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
    success: "check-circle",
    pass: "check-circle",
    verified: "badge-check",
    implemented: "badge-check",
    fail: "x",
    rejected: "x",
    danger: "x",
    warning: "circle-dashed",
    info: "circle-help",
    neutral: "circle-dashed",
    planned: "clock",
    disabled: "circle-dashed",
    unsupported: "circle-help",
    not_applicable: "circle-dashed",
    draft: "circle-dashed",
    candidate: "circle-dashed",
    not_implemented: "clock",
    partially_implemented: "circle-dashed",
    unknown: "circle-help",
  }),
});

export const defaultStatusBadgeSemantic = Object.freeze({
  label: "Unknown",
  tone: "neutral",
  icon: "unknown",
});

export const statusBadgeSemantics = Object.freeze({
  accepted: Object.freeze({ label: "Accepted", tone: "success", icon: "accepted" }),
  approved: Object.freeze({ label: "Approved", tone: "success", icon: "approved" }),
  active: Object.freeze({ label: "Active", tone: "success", icon: "active" }),
  implemented: Object.freeze({ label: "Implemented", tone: "success", icon: "implemented" }),
  verified: Object.freeze({ label: "Verified", tone: "success", icon: "verified" }),
  pass: Object.freeze({ label: "Pass", tone: "success", icon: "pass" }),

  warning: Object.freeze({ label: "Warning", tone: "warning", icon: "warning" }),
  stale_warning: Object.freeze({ label: "Stale warning", tone: "warning", icon: "warning" }),
  ready_for_review: Object.freeze({ label: "Ready for review", tone: "warning", icon: "warning" }),
  needs_more_evidence: Object.freeze({ label: "Needs more evidence", tone: "warning", icon: "warning" }),
  partially_implemented: Object.freeze({ label: "Partial", tone: "warning", icon: "partially_implemented" }),

  fail: Object.freeze({ label: "Fail", tone: "danger", icon: "fail" }),
  rejected: Object.freeze({ label: "Rejected", tone: "danger", icon: "rejected" }),
  stale_blocking: Object.freeze({ label: "Stale blocking", tone: "danger", icon: "danger" }),

  planned: Object.freeze({ label: "Planned", tone: "planned", icon: "planned" }),
  not_implemented: Object.freeze({ label: "To do", tone: "planned", icon: "not_implemented" }),

  unsupported: Object.freeze({ label: "Unsupported", tone: "info", icon: "unsupported" }),
  candidate: Object.freeze({ label: "Candidate", tone: "info", icon: "candidate" }),

  draft: Object.freeze({ label: "Draft", tone: "neutral", icon: "draft" }),
  unknown: Object.freeze({ label: "Unknown", tone: "neutral", icon: "unknown" }),
  not_applicable: Object.freeze({ label: "N/A", tone: "neutral", icon: "not_applicable" }),
  disabled: Object.freeze({ label: "Disabled", tone: "disabled", icon: "disabled" }),
});

export const statusLabels = Object.freeze(
  Object.fromEntries(Object.entries(statusBadgeSemantics).map(([key, value]) => [key, value.label])),
);

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
    planned: "--tf-status-planned-accent",
    disabled: "--tf-status-disabled-accent",
  }),
  statusSurface: Object.freeze({
    neutralBackground: "--tf-status-neutral-bg",
    neutralBorder: "--tf-status-neutral-border",
    successBackground: "--tf-status-success-bg",
    successBorder: "--tf-status-success-border",
    warningBackground: "--tf-status-warning-bg",
    warningBorder: "--tf-status-warning-border",
    dangerBackground: "--tf-status-danger-bg",
    dangerBorder: "--tf-status-danger-border",
    infoBackground: "--tf-status-info-bg",
    infoBorder: "--tf-status-info-border",
    plannedBackground: "--tf-status-planned-bg",
    plannedBorder: "--tf-status-planned-border",
    disabledBackground: "--tf-status-disabled-bg",
    disabledBorder: "--tf-status-disabled-border",
  }),
});


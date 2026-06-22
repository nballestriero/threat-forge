/**
 * @file Shared MR-0002 design tokens and semantic icon tokens.
 *
 * @implementsRequirement MR-0002REQ-0022
 * @implementsRequirement MR-0002REQ-0023
 * @implementsRequirement MR-0002REQ-0025
 * @implementsRequirement MR-0002REQ-0039
 * @implementsRequirement MR-0002REQ-0040
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0010
 * @macroRequirement MR-0002
 *
 * The design system exposes semantic, stable tokens for shared frontend slices.
 * Feature pages must consume these tokens rather than inventing local layout,
 * icon or status vocabularies. The concrete icon glyph mapping is intentionally
 * replaceable and must remain hidden behind the shared Icon component.
 *
 * Side effects: none. This module exports immutable token maps only.
 */
export const shellNavigation = Object.freeze([
  { id: "project-documentation", label: "Project Documentation", icon: "navigation.projectDocumentation", capability: "project_model.documentation.read" },
  { id: "graph", label: "Graph Explorer", icon: "navigation.graph", capability: "project_model.graph.read", disabled: true },
  { id: "threat-analysis", label: "Threat Analysis", icon: "navigation.threatAnalysis", capability: "threat_analysis.read", disabled: true },
  { id: "child-projects", label: "Child Projects", icon: "navigation.childProjects", capability: "child_projects.read", platformOnly: true, disabled: true },
  { id: "reports", label: "Reports", icon: "navigation.reports", capability: "reports.read", disabled: true },
]);

export const iconTokens = Object.freeze({
  navigation: Object.freeze({
    projectDocumentation: "book-open",
    graph: "network",
    threatAnalysis: "shield",
    childProjects: "folder-tree",
    reports: "chart",
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
});

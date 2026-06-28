import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, SearchInput, SelectField, StatusBadge } from "../../MR-0002/design-system/components.jsx";
import { Icon } from "../../MR-0002/design-system/Icon.jsx";
import {
  buildGateStatusFilterOptions,
  filterGovernanceGateRows,
  formatGovernancePlanLabel,
  normalizePlanSummary,
} from "./child-project-governance-plan.state.js";

/**
 * @file Read-only Child Project Governance Plan React page.
 *
 * @implementsRequirement MR-0003REQ-0014
 * @implementsRequirement MR-0003REQ-0015
 * @implementsRequirement MR-0003REQ-0059
 * @implementsRequirement MR-0003REQ-0060
 * @implementsRequirement MR-0003REQ-0061
 * @implementsRequirement MR-0003REQ-0062
 * @implementsRequirement MR-0003REQ-0063
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0011
 * @macroRequirement MR-0003
 *
 * The page renders generated child project governance gate plans through an
 * injected frontend client port. It first presents a project list, then opens a
 * single selected platform/child-project detail on the same page with a back
 * action, project context, matching profile/target-scope gate plan,
 * capability states, gate status/reason/evidence and validation surfaces. It
 * remains read-only and consumes generated plan artifacts or their HTTP API
 * read model; it does not execute gates, read local artifact files directly,
 * mutate child projects, write SQLite state, edit registries, or implement
 * final RBAC administration.
 *
 * Side effects: loads read-only data through injected client ports and keeps
 * browser-only selection/filter state in React component state.
 */

const PLATFORM_PROJECT_ID = "platform-self";
const DEMO_CHILD_PROJECT_ID = "demo-child-project";

/**
 * Convert a nullable value to display text.
 *
 * @param {unknown} value - Candidate value.
 * @returns {string} Display value.
 */
function displayValue(value) {
  return value == null || value === "" ? "—" : String(value);
}

/**
 * Normalize strings for loose matching between project ids and target scopes.
 *
 * @param {unknown} value - Candidate string.
 * @returns {string} Normalized value.
 */
function normalizeMatchValue(value) {
  return String(value ?? "").trim().toLowerCase().replaceAll("-", "_");
}

/**
 * Render selected data-source information.
 *
 * @param {{dataSource?: Record<string, unknown>}} props - Data-source props.
 * @returns {import("react").JSX.Element|null} Data-source card or null.
 */
function DataSourceStatus({ dataSource }) {
  if (!dataSource) return null;

  return (
    <Card className="tf-data-source-card">
      <p className="tf-eyebrow">Data source</p>
      <strong>{dataSource.label ?? "Governance plan data source"}</strong>
      <p>{dataSource.message ?? "Reading governance plan artifacts through the configured frontend client port."}</p>
    </Card>
  );
}

/**
 * Render the always-visible study introduction for the governance gate plan page.
 *
 * @returns {import("react").JSX.Element} Study-oriented page guide.
 */
function GovernancePlanStudyIntro() {
  return (
    <Card className="tf-documentation-context-card">
      <p className="tf-eyebrow">Study guide</p>
      <strong>How to read Governance gate plans</strong>
      <p>
        This page explains which governance checks apply to the platform or a child project,
        what each check protects, and why the check was selected for the current profile and target scope.
      </p>
      <dl className="tf-detail-grid">
        <div>
          <dt>Capability</dt>
          <dd>The ability ThreatForge or the child project must have before a gate can be meaningful, such as reading governed documentation or validating requirement bodies.</dd>
        </div>
        <div>
          <dt>Validation surface</dt>
          <dd>The concrete part of the project that a gate checks, such as governed Markdown bodies, registries, graph relations, OpenAPI contracts, frontend build output or runtime tests.</dd>
        </div>
        <div>
          <dt>Why this gate?</dt>
          <dd>The rationale that connects project scope, governance profile, required capability, validation surface and threat-analysis readiness.</dd>
        </div>
      </dl>
      <p>
        This view is read-only: it helps study and audit the plan, but it does not execute gates, mutate repositories, or start a threat-analysis runtime.
      </p>
    </Card>
  );
}

/**
 * Render a visible hint when the selected detail source does not provide explanation payloads.
 *
 * @param {{explanation?: Record<string, unknown>}} props - Explanation availability props.
 * @returns {import("react").JSX.Element|null} Missing explanation notice.
 */
function ExplanationAvailabilityNotice({ explanation }) {
  if (explanation) return null;

  return (
    <Card className="tf-documentation-context-card">
      <p className="tf-eyebrow">Explanation payload</p>
      <strong>Gate explanations are not available from the current detail source</strong>
      <p>
        The static plan values below are still shown, but the expanded study cards require the read-only HTTP governance-plan API version that exposes the explanation view-model.
      </p>
    </Card>
  );
}

/**
 * Render compact plan statistics.
 *
 * @param {{items: Array<Record<string, unknown>>}} props - Summary props.
 * @returns {import("react").JSX.Element} Summary cards.
 */
function PlanSummaryCards({ items }) {
  const totalGates = (items ?? []).reduce((total, item) => total + Number(item?.gates_evaluated ?? 0), 0);
  const passPlans = (items ?? []).filter((item) => item?.result === "pass").length;

  return (
    <section className="tf-stats-grid" aria-label="Governance plan summary">
      <Card className="tf-stat-card">
        <span>Plans</span>
        <strong>{items.length}</strong>
      </Card>
      <Card className="tf-stat-card">
        <span>Gate rows</span>
        <strong>{totalGates}</strong>
      </Card>
      <Card className="tf-stat-card">
        <span>Pass result</span>
        <strong>{passPlans}</strong>
      </Card>
    </section>
  );
}

/**
 * Return a governance plan summary matching a project option.
 *
 * @param {Array<Record<string, unknown>>} items - Available plan summaries.
 * @param {Record<string, unknown>} option - Selected project option.
 * @returns {Record<string, unknown>|undefined} Matching plan summary.
 */
function findPlanForProjectOption(items, option) {
  if (!option) return undefined;
  const normalizedTargetScope = normalizeMatchValue(option.targetScope);
  const normalizedProfile = normalizeMatchValue(option.profile);
  const normalizedProjectId = normalizeMatchValue(option.id);

  const exactPair = (items ?? []).find((item) => (
    normalizeMatchValue(item?.target_scope) === normalizedTargetScope
    && normalizeMatchValue(item?.profile) === normalizedProfile
  ));
  if (exactPair) return exactPair;

  const exactTarget = (items ?? []).find((item) => normalizeMatchValue(item?.target_scope) === normalizedTargetScope);
  if (exactTarget) return exactTarget;

  const exactProfile = (items ?? []).find((item) => normalizeMatchValue(item?.profile) === normalizedProfile);
  if (exactProfile) return exactProfile;

  const projectTarget = (items ?? []).find((item) => normalizeMatchValue(item?.target_scope) === normalizedProjectId);
  if (projectTarget) return projectTarget;

  if (option.kind === "child-project") {
    return (items ?? []).find((item) => normalizeMatchValue(item?.target_scope).includes("child_project"));
  }

  return (items ?? [])[0];
}

/**
 * Return a readable governance profile for a child project state.
 *
 * @param {Record<string, unknown>} state - Child project operational state.
 * @returns {string} Governance profile id.
 */
function getChildProjectGovernanceProfile(state) {
  const project = state?.child_project ?? {};
  if (project.id === DEMO_CHILD_PROJECT_ID) return "demo_child_project_governance";
  const registeredProfile = String(project.project_model?.governance_profile ?? "").trim();
  if (!registeredProfile || registeredProfile === "threat-forge-standard-child-project") {
    return "documentation_only_child_project";
  }
  return registeredProfile;
}

/**
 * Build selectable platform/child project contexts for the governance plan page.
 *
 * @param {Array<Record<string, unknown>>} childProjectStates - Child project states.
 * @returns {Array<Record<string, unknown>>} Selectable project contexts.
 */
function buildProjectOptions(childProjectStates) {
  const platformOption = {
    id: PLATFORM_PROJECT_ID,
    kind: "platform",
    label: "Threat Forge platform",
    profile: "platform_self_governance",
    targetScope: "platform_self",
    state: null,
  };

  const childOptions = (childProjectStates ?? []).map((state) => {
    const project = state?.child_project ?? {};
    const id = String(project.id ?? "").trim();
    const isDemoProject = id === DEMO_CHILD_PROJECT_ID;
    return {
      id,
      kind: "child-project",
      label: String(project.name ?? id),
      profile: getChildProjectGovernanceProfile(state),
      targetScope: isDemoProject ? "demo_child_project" : "child_project",
      state,
    };
  }).filter((option) => option.id);

  return [platformOption, ...childOptions];
}

/**
 * Build lower-cased search text for one project option.
 *
 * @param {Record<string, unknown>} option - Project option.
 * @param {Record<string, unknown>|undefined} plan - Matching plan summary.
 * @returns {string} Search envelope.
 */
function getProjectSearchText(option, plan) {
  const project = option?.state?.child_project ?? {};
  const repository = project.repository ?? {};
  return [
    option?.id,
    option?.label,
    option?.kind,
    option?.profile,
    option?.targetScope,
    project.id,
    project.name,
    repository.url,
    repository.local_path,
    plan?.result,
  ].map((value) => String(value ?? "").toLowerCase()).join(" ");
}

/**
 * Filter project rows by search text.
 *
 * @param {Array<Record<string, unknown>>} options - Project options.
 * @param {Array<Record<string, unknown>>} plans - Plan summaries.
 * @param {string} search - Search term.
 * @returns {Array<Record<string, unknown>>} Filtered project options.
 */
function filterProjectOptions(options, plans, search) {
  const normalizedSearch = String(search ?? "").trim().toLowerCase();
  if (!normalizedSearch) return options;
  return (options ?? []).filter((option) => getProjectSearchText(option, findPlanForProjectOption(plans, option)).includes(normalizedSearch));
}

/**
 * Render selected project context and the matched gate-plan context.
 *
 * @param {{option?: Record<string, unknown>, selectedPlan?: Record<string, unknown>}} props - Project context props.
 * @returns {import("react").JSX.Element|null} Project card or null.
 */
function SelectedProjectCard({ option, selectedPlan }) {
  if (!option) return null;

  const state = option.state ?? {};
  const project = state.child_project ?? {};
  const repository = project.repository ?? {};
  const latestCheckRun = state.latest_check_run ?? {};
  const rows = option.kind === "platform" ? [
    ["Project", "Threat Forge platform"],
    ["Profile", option.profile],
    ["Target scope", option.targetScope],
    ["Selected plan", selectedPlan ? `${selectedPlan.profile} / ${selectedPlan.target_scope}` : "No matching plan"],
  ] : [
    ["Project id", project.id],
    ["Name", project.name],
    ["Repository", repository.url ?? repository.local_path],
    ["Default branch", repository.default_branch],
    ["Registered profile", project.project_model?.governance_profile],
    ["Planned profile", option.profile],
    ["Latest check", latestCheckRun.overall_status],
    ["Selected plan", selectedPlan ? `${selectedPlan.profile} / ${selectedPlan.target_scope}` : "No matching plan"],
  ];

  return (
    <Card className="tf-governance-project-context">
      <div className="tf-card-heading-row">
        <div>
          <p className="tf-eyebrow">Selected project</p>
          <h2>{displayValue(option.label)}</h2>
        </div>
        <StatusBadge value={String(selectedPlan?.result ?? latestCheckRun.overall_status ?? "unknown")} />
      </div>
      <dl className="tf-metadata-grid">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{displayValue(value)}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/**
 * Render the read-only project list used to choose one governance plan context.
 *
 * @param {{items: Array<Record<string, unknown>>, plans: Array<Record<string, unknown>>, onSelect: Function}} props - List props.
 * @returns {import("react").JSX.Element} List or empty state.
 */
function ProjectList({ items, plans, onSelect }) {
  if (items.length === 0) {
    return <EmptyState title="No projects match the current filters">Reset search to see all platform and child project contexts.</EmptyState>;
  }

  return (
    <div className="tf-entity-list tf-governance-project-list">
      {items.map((option) => {
        const plan = findPlanForProjectOption(plans, option);
        const status = String(plan?.result ?? option.state?.latest_check_run?.overall_status ?? "unknown");
        return (
          <button
            key={option.id}
            className="tf-entity-row tf-governance-project-row"
            type="button"
            onClick={() => onSelect(option.id)}
          >
            <span className="tf-entity-row__icon"><Icon token={option.kind === "platform" ? "navigation.documentation" : "navigation.childProjects"} /></span>
            <span className="tf-entity-row__main">
              <strong>{displayValue(option.label)}</strong>
              <span>{displayValue(option.profile)} · {displayValue(option.targetScope)}</span>
            </span>
            <span className="tf-entity-row__meta">
              <StatusBadge value={status} label={status} />
              <span className="tf-badge">{Number(plan?.gates_evaluated ?? 0)} gates</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Render capability state badges.
 *
 * @param {{states?: Record<string, unknown>}} props - Capability-state props.
 * @returns {import("react").JSX.Element|null} Capability card.
 */
function CapabilityStates({ states = {} }) {
  const entries = Object.entries(states ?? {}).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) return null;

  return (
    <Card>
      <h3>Capability states</h3>
      <div className="tf-chip-list">
        {entries.map(([capability, state]) => (
          <span className="tf-badge" key={capability}>{capability}: {displayValue(state)}</span>
        ))}
      </div>
    </Card>
  );
}

/**
 * Render detailed gate-plan summary cards.
 *
 * @param {{plan?: Record<string, unknown>}} props - Plan props.
 * @returns {import("react").JSX.Element|null} Summary cards.
 */
function DetailedPlanSummary({ plan }) {
  if (!plan) return null;
  const summaryRows = normalizePlanSummary(plan.summary ?? {});

  return (
    <section className="tf-stats-grid" aria-label="Selected gate plan summary">
      <Card className="tf-stat-card tf-stat-card--wide">
        <span>Profile</span>
        <strong>{displayValue(plan.profile)}</strong>
      </Card>
      <Card className="tf-stat-card tf-stat-card--wide">
        <span>Target scope</span>
        <strong>{displayValue(plan.target_scope)}</strong>
      </Card>
      <Card className="tf-stat-card">
        <span>Gates evaluated</span>
        <strong>{Number(plan.gates_evaluated ?? 0)}</strong>
      </Card>
      {summaryRows.map((row) => (
        <Card className="tf-stat-card" key={row.status}>
          <span>{formatGovernancePlanLabel(row.status)}</span>
          <strong>{row.count}</strong>
        </Card>
      ))}
    </section>
  );
}

/**
 * Render one gate row's list of values.
 *
 * @param {{values?: unknown[]}} props - Values props.
 * @returns {import("react").JSX.Element} Value list.
 */
function InlineValueList({ values = [] }) {
  const normalizedValues = Array.isArray(values) ? values : [];
  if (normalizedValues.length === 0) return <span>—</span>;

  return (
    <div className="tf-chip-list">
      {normalizedValues.map((value) => <span className="tf-badge" key={String(value)}>{String(value)}</span>)}
    </div>
  );
}

/**
 * Return a stable array for optional array-like values.
 *
 * @param {unknown} value - Candidate array.
 * @returns {unknown[]} Array value or empty array.
 */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Build a gate-id to explanation lookup from the backend explanation read model.
 *
 * @param {Record<string, unknown>|undefined} explanation - Plan explanation payload.
 * @returns {Record<string, Record<string, unknown>>} Explanation lookup by gate id.
 */
function buildGateExplanationMap(explanation) {
  return Object.fromEntries(asArray(explanation?.gates)
    .filter((gate) => gate && typeof gate === "object" && gate.id)
    .map((gate) => [String(gate.id), gate]));
}

/**
 * Render one explanatory paragraph when the value exists.
 *
 * @param {{label: string, value?: unknown}} props - Explanation props.
 * @returns {import("react").JSX.Element|null} Explanation block.
 */
function ExplanationParagraph({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{displayValue(value)}</dd>
    </div>
  );
}

/**
 * Render a compact explanation object as a study card.
 *
 * @param {{title: string, item?: Record<string, unknown>, extraRows?: Array<[string, unknown]>}} props - Concept props.
 * @returns {import("react").JSX.Element|null} Concept card.
 */
function ConceptExplanationCard({ title, item, extraRows = [] }) {
  if (!item) return null;

  return (
    <Card className="tf-stat-card tf-stat-card--wide">
      <p className="tf-eyebrow">{title}</p>
      <h3>{displayValue(item.label ?? item.id)}</h3>
      <dl className="tf-metadata-grid">
        <ExplanationParagraph label="Raw value" value={item.id} />
        <ExplanationParagraph label="Meaning" value={item.concept ?? item.description} />
        <ExplanationParagraph label="Why it matters" value={item.why_it_matters ?? item.why_it_mattered_for_selection} />
        <ExplanationParagraph label="Source registry" value={item.source_registry} />
        {extraRows.map(([label, value]) => <ExplanationParagraph key={label} label={label} value={value} />)}
      </dl>
    </Card>
  );
}

/**
 * Render the plan-level study guide returned by the governance explanation API.
 *
 * @param {{explanation?: Record<string, unknown>}} props - Plan explanation props.
 * @returns {import("react").JSX.Element|null} Guide card or null.
 */
function PlanStudyGuide({ explanation }) {
  if (!explanation) return null;

  return (
    <Card className="tf-documentation-context-card">
      <p className="tf-eyebrow">Study guide</p>
      <h3>How to read this governance gate plan</h3>
      <dl className="tf-metadata-grid">
        <ExplanationParagraph label="Purpose" value={explanation.purpose} />
        <ExplanationParagraph label="How to use it" value={explanation.usage} />
        <ExplanationParagraph label="Read-only boundary" value={explanation.limitations} />
      </dl>
      <div>
        <strong>Source registries</strong>
        <InlineValueList values={explanation.source_registries} />
      </div>
    </Card>
  );
}

/**
 * Render field-level explanations for raw technical values shown by the page.
 *
 * @param {{fieldExplanations?: Record<string, Record<string, unknown>>}} props - Field guide props.
 * @returns {import("react").JSX.Element|null} Field guide card.
 */
function FieldExplanationGuide({ fieldExplanations }) {
  const entries = Object.entries(fieldExplanations ?? {});
  if (entries.length === 0) return null;

  return (
    <Card>
      <p className="tf-eyebrow">Field guide</p>
      <h3>What the technical fields mean</h3>
      <div className="tf-governance-gate-list">
        {entries.map(([field, explanation]) => (
          <section key={field}>
            <h4>{displayValue(explanation.question ?? formatGovernancePlanLabel(field))}</h4>
            <dl className="tf-metadata-grid">
              <ExplanationParagraph label="Field" value={field} />
              <ExplanationParagraph label="Meaning" value={explanation.meaning} />
              <ExplanationParagraph label="Why it matters" value={explanation.why_it_matters} />
            </dl>
          </section>
        ))}
      </div>
    </Card>
  );
}

/**
 * Render plan-level concept explanations for profile, target scope and result.
 *
 * @param {{explanation?: Record<string, unknown>}} props - Explanation props.
 * @returns {import("react").JSX.Element|null} Concept grid.
 */
function PlanConceptExplanations({ explanation }) {
  if (!explanation) return null;

  return (
    <section className="tf-stats-grid" aria-label="Governance concept explanations">
      <ConceptExplanationCard
        title="Profile"
        item={explanation.profile}
        extraRows={[
          ["Target scope", explanation.profile?.target_scope],
          ["Baseline required", explanation.profile?.baseline_required],
          ["Required capabilities", asArray(explanation.profile?.required_capabilities).join(", ")],
        ]}
      />
      <ConceptExplanationCard title="Target scope" item={explanation.target_scope} />
      <ConceptExplanationCard title="Result" item={explanation.result} />
    </section>
  );
}

/**
 * Render explanations for one gate's required capabilities.
 *
 * @param {{items?: Array<Record<string, unknown>>}} props - Capability explanations.
 * @returns {import("react").JSX.Element|null} Capability explanation list.
 */
function CapabilityExplanationList({ items = [] }) {
  const capabilities = asArray(items);
  if (capabilities.length === 0) return null;

  return (
    <section>
      <h4>Quali capability richiede?</h4>
      <div className="tf-governance-gate-list">
        {capabilities.map((capability) => (
          <Card key={String(capability.id)}>
            <h4>{displayValue(capability.label ?? capability.id)}</h4>
            <dl className="tf-metadata-grid">
              <ExplanationParagraph label="Raw value" value={capability.id} />
              <ExplanationParagraph label="Meaning" value={capability.concept ?? capability.description} />
              <ExplanationParagraph label="Current state" value={capability.state?.label ?? capability.state?.id} />
              <ExplanationParagraph label="Why it matters" value={capability.why_it_matters} />
              <ExplanationParagraph label="Source registry" value={capability.source_registry} />
            </dl>
          </Card>
        ))}
      </div>
    </section>
  );
}

/**
 * Render explanations for one gate's validation surfaces.
 *
 * @param {{items?: Array<Record<string, unknown>>}} props - Validation surface explanations.
 * @returns {import("react").JSX.Element|null} Validation surface explanation list.
 */
function ValidationSurfaceExplanationList({ items = [] }) {
  const surfaces = asArray(items);
  if (surfaces.length === 0) return null;

  return (
    <section>
      <h4>Quale superficie valida?</h4>
      <div className="tf-governance-gate-list">
        {surfaces.map((surface) => (
          <Card key={String(surface.id)}>
            <h4>{displayValue(surface.label ?? surface.id)}</h4>
            <dl className="tf-metadata-grid">
              <ExplanationParagraph label="Raw value" value={surface.id} />
              <ExplanationParagraph label="Meaning" value={surface.concept ?? surface.description} />
              <ExplanationParagraph label="Evidence kind" value={surface.evidence_kind} />
              <ExplanationParagraph label="Command" value={surface.command} />
              <ExplanationParagraph label="Why it matters" value={surface.why_it_matters} />
              <ExplanationParagraph label="Source registry" value={surface.source_registry} />
            </dl>
          </Card>
        ))}
      </div>
    </section>
  );
}

/**
 * Render the expandable explanation for one generated gate.
 *
 * @param {{gate?: Record<string, unknown>, explanation?: Record<string, unknown>}} props - Gate explanation props.
 * @returns {import("react").JSX.Element|null} Gate explanation details.
 */
function GateExplanationDetails({ gate, explanation }) {
  if (!explanation) return null;

  const selection = explanation.selection_rationale ?? {};
  return (
    <details>
      <summary>Why this gate?</summary>
      <div className="tf-governance-gate-list">
        <section>
          <h4>What this gate checks</h4>
          <p>{displayValue(explanation.what_it_checks)}</p>
        </section>
        <section>
          <h4>Why it was selected</h4>
          <p>{displayValue(explanation.why_selected ?? gate?.reason)}</p>
          <dl className="tf-metadata-grid">
            <ExplanationParagraph label="Profile includes gate" value={String(Boolean(selection.profile_includes_gate))} />
            <ExplanationParagraph label="Target scope supported" value={String(Boolean(selection.target_scope_supported_by_gate))} />
            <ExplanationParagraph label="Profile" value={selection.profile} />
            <ExplanationParagraph label="Target scope" value={selection.target_scope} />
            <ExplanationParagraph label="Unsupported behavior" value={selection.unsupported_behavior} />
            <ExplanationParagraph label="Result when not applicable" value={selection.result_when_not_applicable} />
          </dl>
        </section>
        <ConceptExplanationCard title="Applicability class" item={explanation.applicability_class} />
        <ConceptExplanationCard title="Status" item={explanation.status} />
        <CapabilityExplanationList items={explanation.required_capabilities} />
        <ValidationSurfaceExplanationList items={explanation.validation_surfaces} />
        <section>
          <h4>Contribution to threat-analysis readiness</h4>
          <p>{displayValue(explanation.contributes_to_threat_analysis_readiness)}</p>
        </section>
      </div>
    </details>
  );
}

/**
 * Render detailed gate rows.
 *
 * @param {{gates: Array<Record<string, unknown>>}} props - Gate rows.
 * @returns {import("react").JSX.Element} Gate table/list.
 */
function GateRows({ gates, explanationsByGateId = {} }) {
  if (gates.length === 0) {
    return <EmptyState title="No gates match the current filters">Reset search or status filters to see all planned gates.</EmptyState>;
  }

  return (
    <div className="tf-governance-gate-list">
      {gates.map((gate) => {
        const explanation = explanationsByGateId[String(gate.id)] ?? undefined;
        return (
          <Card className="tf-governance-gate-card" key={String(gate.id)}>
            <div className="tf-governance-gate-card__header">
              <div>
                <p className="tf-eyebrow">{displayValue(gate.applicability_class)}</p>
                <h3>{displayValue(gate.label ?? gate.id)}</h3>
              </div>
              <StatusBadge value={String(gate.status ?? "unknown")} label={String(gate.status ?? "unknown")} />
            </div>
            <dl className="tf-metadata-grid">
              <div>
                <dt>Gate id</dt>
                <dd>{displayValue(gate.id)}</dd>
              </div>
              <div>
                <dt>Severity</dt>
                <dd>{displayValue(gate.severity)}</dd>
              </div>
              <div>
                <dt>Required capabilities</dt>
                <dd><InlineValueList values={gate.required_capabilities} /></dd>
              </div>
              <div>
                <dt>Validation surfaces</dt>
                <dd><InlineValueList values={gate.validation_surfaces} /></dd>
              </div>
            </dl>
            <p className="tf-governance-gate-card__reason">{displayValue(gate.reason)}</p>
            <div>
              <strong>Evidence</strong>
              <InlineValueList values={gate.evidence} />
            </div>
            <GateExplanationDetails gate={gate} explanation={explanation} />
          </Card>
        );
      })}
    </div>
  );
}

/**
 * Render a selected gate-plan detail.
 *
 * @param {{detail?: Record<string, unknown>, loading?: boolean, error?: string}} props - Detail props.
 * @returns {import("react").JSX.Element|null} Detail view.
 */
function GatePlanDetail({ detail, loading = false, error = "" }) {
  const [gateFilters, setGateFilters] = useState({ q: "", status: "" });
  const artifact = detail?.artifact ?? {};
  const plan = artifact.plan ?? undefined;
  const gates = Array.isArray(plan?.gates) ? plan.gates : [];
  const explanation = detail?.explanation ?? undefined;
  const gateExplanationsById = useMemo(() => buildGateExplanationMap(explanation), [explanation]);
  const gateStatusOptions = useMemo(() => buildGateStatusFilterOptions(gates), [gates]);
  const filteredGates = useMemo(
    () => filterGovernanceGateRows(gates, gateFilters, gateExplanationsById),
    [gates, gateFilters, gateExplanationsById],
  );

  useEffect(() => {
    setGateFilters({ q: "", status: "" });
  }, [plan?.profile, plan?.target_scope]);

  if (loading) return <EmptyState title="Loading gate plan">Reading the selected governance gate plan.</EmptyState>;
  if (error) return <EmptyState title="Unable to load gate plan">{error}</EmptyState>;
  if (!plan) return <EmptyState title="No matching governance plan">No generated plan exists yet for the selected project.</EmptyState>;

  return (
    <section className="tf-governance-plan-detail" aria-label="Selected governance gate plan">
      <div className="tf-detail-view__header tf-governance-plan-artifact-header">
        <div>
          <p className="tf-eyebrow">Generated artifact</p>
          <h2>{displayValue(plan.profile)} / {displayValue(plan.target_scope)}</h2>
          <p>{displayValue(detail?.artifact_path)} · {displayValue(artifact.generated_by)}</p>
        </div>
        <StatusBadge value={String(plan.result ?? "unknown")} label={String(plan.result ?? "unknown")} />
      </div>

      <ExplanationAvailabilityNotice explanation={explanation} />
      <PlanStudyGuide explanation={explanation} />
      <PlanConceptExplanations explanation={explanation} />
      <FieldExplanationGuide fieldExplanations={explanation?.field_explanations} />
      <DetailedPlanSummary plan={plan} />
      <CapabilityStates states={plan.capability_states} />

      <section className="tf-filter-bar" aria-label="Gate filters">
        <SearchInput
          value={gateFilters.q}
          onChange={(q) => setGateFilters((current) => ({ ...current, q }))}
          placeholder="Search gates, reasons, evidence"
        />
        <SelectField
          label="Gate status"
          value={gateFilters.status}
          values={gateStatusOptions}
          onChange={(status) => setGateFilters((current) => ({ ...current, status }))}
        />
        <Button onClick={() => setGateFilters({ q: "", status: "" })}>Reset</Button>
      </section>

      <GateRows gates={filteredGates} explanationsByGateId={gateExplanationsById} />
    </section>
  );
}

/**
 * Render the selected project/detail read flow.
 *
 * @param {{option?: Record<string, unknown>, plan?: Record<string, unknown>, detail?: Record<string, unknown>, loading?: boolean, error?: string, onBack: Function}} props - Detail props.
 * @returns {import("react").JSX.Element} Detail view.
 */
function ProjectGatePlanDetail({ option, plan, detail, loading, error, onBack }) {
  return (
    <section className="tf-detail-view tf-governance-project-detail" aria-label="Selected governance project">
      <div className="tf-detail-view__header">
        <div>
          <p className="tf-eyebrow">Selected project</p>
          <h2>{displayValue(option?.label)}</h2>
          <p>{displayValue(option?.profile)} · {displayValue(option?.targetScope)}</p>
        </div>
        <Button onClick={onBack}><Icon token="action.back" /> Back to projects</Button>
      </div>
      <SelectedProjectCard option={option} selectedPlan={plan} />
      <PlanSummaryCards items={plan ? [plan] : []} />
      <GatePlanDetail detail={detail} loading={loading} error={error} />
    </section>
  );
}

/**
 * Render the read-only governance plan page.
 *
 * @param {{client: {listGatePlans: Function, getGatePlan: Function, describeDataSource?: Function}, childProjectClient?: {listChildProjects: Function, getChildProject?: Function, describeDataSource?: Function}}} props - Page props.
 * @returns {import("react").JSX.Element} Page element.
 */
export function ChildProjectGovernancePlanPage({ client, childProjectClient }) {
  const [items, setItems] = useState([]);
  const [childProjectStates, setChildProjectStates] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [detail, setDetail] = useState(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [dataSource, setDataSource] = useState(() => client.describeDataSource?.());
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    setError("");
    client.listGatePlans()
      .then((payload) => {
        if (cancelled) return;
        const nextItems = Array.isArray(payload.items) ? payload.items : [];
        setItems(nextItems);
        setDataSource(payload.data_source ?? client.describeDataSource?.());
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => { cancelled = true; };
  }, [client]);

  useEffect(() => {
    if (!childProjectClient) return undefined;
    let cancelled = false;
    childProjectClient.listChildProjects()
      .then((payload) => {
        if (!cancelled) setChildProjectStates(Array.isArray(payload.items) ? payload.items : []);
      })
      .catch(() => {
        if (!cancelled) setChildProjectStates([]);
      });
    return () => { cancelled = true; };
  }, [childProjectClient]);

  const projectOptions = useMemo(() => buildProjectOptions(childProjectStates), [childProjectStates]);
  const filteredProjectOptions = useMemo(() => filterProjectOptions(projectOptions, items, projectSearch), [projectOptions, items, projectSearch]);
  const selectedProjectOption = useMemo(
    () => projectOptions.find((option) => option.id === selectedProjectId),
    [projectOptions, selectedProjectId],
  );
  const selectedProjectPlan = useMemo(() => findPlanForProjectOption(items, selectedProjectOption), [items, selectedProjectOption]);

  useEffect(() => {
    if (!selectedProjectPlan) {
      setDetail(null);
      setDetailError("");
      return undefined;
    }

    let cancelled = false;
    setLoadingDetail(true);
    setDetailError("");
    client.getGatePlan(selectedProjectPlan.profile, selectedProjectPlan.target_scope)
      .then((payload) => {
        if (cancelled) return;
        setDetail(payload);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setDetail(null);
        setDetailError(loadError instanceof Error ? loadError.message : String(loadError));
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => { cancelled = true; };
  }, [client, selectedProjectPlan]);

  return (
    <div className="tf-child-project-governance-plan-page">
      <section className="tf-page-title">
        <div>
          <p className="tf-eyebrow">Child project governance</p>
          <h1>Governance gate plans</h1>
          <p>Select a platform or child project, then study which governance gates apply, what each gate checks, and why it was selected.</p>
        </div>
        <span className="tf-count-pill">{projectOptions.length} projects</span>
      </section>

      <DataSourceStatus dataSource={dataSource} />
      <GovernancePlanStudyIntro />

      {loadingList ? (
        <EmptyState title="Loading governance plans">Reading generated gate-plan artifacts.</EmptyState>
      ) : error ? (
        <EmptyState title="Unable to load governance plans">{error}</EmptyState>
      ) : selectedProjectOption ? (
        <ProjectGatePlanDetail
          option={selectedProjectOption}
          plan={selectedProjectPlan}
          detail={detail}
          loading={loadingDetail}
          error={detailError}
          onBack={() => {
            setSelectedProjectId("");
            setDetail(null);
            setDetailError("");
          }}
        />
      ) : (
        <section className="tf-governance-plan-project-picker" aria-label="Project list">
          <div className="tf-card-heading-row">
            <div>
              <p className="tf-eyebrow">Projects</p>
              <h2>Select a project</h2>
              <p>Open one row to load the matching governance gate plan with field explanations and gate rationale.</p>
            </div>
            <span className="tf-count-pill">{filteredProjectOptions.length} / {projectOptions.length}</span>
          </div>
          <section className="tf-filter-bar" aria-label="Project filters">
            <SearchInput
              value={projectSearch}
              onChange={setProjectSearch}
              placeholder="Search project, profile, scope, repository"
            />
            <Button onClick={() => setProjectSearch("")}><Icon token="action.reset" /> Reset</Button>
          </section>
          <PlanSummaryCards items={items} />
          <ProjectList
            items={filteredProjectOptions}
            plans={items}
            onSelect={(projectId) => {
              setSelectedProjectId(String(projectId ?? ""));
              setProjectSearch("");
            }}
          />
        </section>
      )}
    </div>
  );
}

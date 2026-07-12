import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, SearchInput, SelectField, StatusBadge } from "../../MR-0002/design-system/components.jsx";
import { Icon } from "../../MR-0002/design-system/Icon.jsx";
import { InfoPopover } from "../../MR-0002/design-system/InfoPopover.jsx";
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
 * @implementsRequirement MR-0003REQ-0064
 * @implementsRequirement MR-0003REQ-0065
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
 * Build the short description shown before a gate is expanded.
 *
 * @param {Record<string, unknown>} gate - Gate row.
 * @param {Record<string, unknown>|undefined} explanation - Optional gate explanation.
 * @returns {string} Human-readable summary.
 */
function getGateShortDescription(gate, explanation) {
  return String(
    explanation?.what_it_checks
      ?? gate?.description
      ?? gate?.reason
      ?? "Open this gate to study what it checks and why it belongs to the selected project plan.",
  );
}

/**
 * Render a labelled array value only when it has content.
 *
 * @param {{label: string, values?: unknown[]}} props - Labelled values.
 * @returns {import("react").JSX.Element|null} Labelled value list.
 */
function ExplanationArrayBlock({ label, values = [] }) {
  const normalizedValues = asArray(values).filter((value) => value != null && value !== "");
  if (normalizedValues.length === 0) return null;

  return (
    <div>
      <dt>{label}</dt>
      <dd><InlineValueList values={normalizedValues} /></dd>
    </div>
  );
}

/**
 * Render raw ids and planner evidence as technical trace, not as the primary explanation.
 *
 * @param {{gate?: Record<string, unknown>, explanation?: Record<string, unknown>}} props - Trace props.
 * @returns {import("react").JSX.Element} Technical trace details.
 */
function TechnicalTraceDetails({ gate, explanation }) {
  const trace = explanation?.technical_trace ?? {};
  const rawEvidence = asArray(trace.raw_evidence_markers).length > 0 ? trace.raw_evidence_markers : gate?.evidence;
  const rawValidationSurfaces = asArray(trace.raw_validation_surface_ids).length > 0 ? trace.raw_validation_surface_ids : gate?.validation_surfaces;
  const rawCapabilities = asArray(trace.raw_capability_ids).length > 0 ? trace.raw_capability_ids : gate?.required_capabilities;

  return (
    <details>
      <summary>Technical trace</summary>
      <p className="tf-governance-gate-card__reason">
        Technical trace keeps the raw registry ids and planner evidence markers for auditability.
        These values are useful for maintainers, but the primary sections above explain their meaning in human language.
      </p>
      <dl className="tf-metadata-grid">
        <ExplanationParagraph label="Raw gate id" value={trace.raw_gate_id ?? gate?.id} />
        <ExplanationArrayBlock label="Raw capability ids" values={rawCapabilities} />
        <ExplanationArrayBlock label="Raw validation surface ids" values={rawValidationSurfaces} />
        <ExplanationArrayBlock label="Planner evidence markers" values={rawEvidence} />
      </dl>
    </details>
  );
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
 * Render a compact inline overview row whose details open only on demand.
 *
 * @param {{idPrefix: string, label: string, summary?: unknown, ariaLabel: string, children: import("react").ReactNode}} props - Overview row props.
 * @returns {import("react").JSX.Element} Compact overview row.
 */
function GovernanceOverviewInfoRow({ idPrefix, label, summary, ariaLabel, children }) {
  return (
    <article className="tf-governance-overview-row">
      <div className="tf-governance-overview-row__main">
        <span className="tf-governance-overview-row__label">{label}</span>
        <strong>{displayValue(summary)}</strong>
      </div>
      <InfoPopover id={idPrefix} ariaLabel={ariaLabel}>
        {children}
      </InfoPopover>
    </article>
  );
}

/**
 * Render the plan-level study guide returned by the governance explanation API inside an on-demand popover.
 *
 * @param {{explanation?: Record<string, unknown>}} props - Plan explanation props.
 * @returns {import("react").JSX.Element} Guide popover.
 */
function PlanStudyGuidePopover({ explanation }) {
  return (
    <div className="tf-taxonomy-field-popover" role="tooltip">
      <p className="tf-eyebrow">Study guide</p>
      <h4>How to read this governance gate plan</h4>
      <dl className="tf-metadata-grid">
        <ExplanationParagraph label="Purpose" value={explanation?.purpose} />
        <ExplanationParagraph label="How to use it" value={explanation?.usage} />
        <ExplanationParagraph label="Read-only boundary" value={explanation?.limitations} />
      </dl>
      <div>
        <strong>Source registries</strong>
        <InlineValueList values={explanation?.source_registries} />
      </div>
    </div>
  );
}

/**
 * Render one concept explanation inside an on-demand popover.
 *
 * @param {{title: string, item?: Record<string, unknown>, extraRows?: Array<[string, unknown]>}} props - Concept props.
 * @returns {import("react").JSX.Element|null} Concept popover.
 */
function ConceptExplanationPopover({ title, item, extraRows = [] }) {
  if (!item) return null;

  return (
    <div className="tf-taxonomy-field-popover" role="tooltip">
      <p className="tf-eyebrow">{title}</p>
      <h4>{displayValue(item.label ?? item.id)}</h4>
      <dl className="tf-metadata-grid">
        <ExplanationParagraph label="Raw value" value={item.id} />
        <ExplanationParagraph label="Meaning" value={item.concept ?? item.description} />
        <ExplanationParagraph label="Why it matters" value={item.why_it_matters ?? item.why_it_mattered_for_selection} />
        <ExplanationParagraph label="Source registry" value={item.source_registry} />
        {extraRows.map(([rowLabel, value]) => <ExplanationParagraph key={rowLabel} label={rowLabel} value={value} />)}
      </dl>
    </div>
  );
}

/**
 * Render field-level explanations for raw technical values shown by the page inside an on-demand popover.
 *
 * @param {{fieldExplanations?: Record<string, Record<string, unknown>>}} props - Field guide props.
 * @returns {import("react").JSX.Element|null} Field guide popover.
 */
function FieldExplanationGuidePopover({ fieldExplanations }) {
  const entries = Object.entries(fieldExplanations ?? {});
  if (entries.length === 0) return null;

  return (
    <div className="tf-taxonomy-field-popover" role="tooltip">
      <p className="tf-eyebrow">Field guide</p>
      <h4>What the technical fields mean</h4>
      <div className="tf-governance-overview-popover-sections">
        {entries.map(([field, explanation]) => (
          <section key={field}>
            <h5>{displayValue(explanation.question ?? formatGovernancePlanLabel(field))}</h5>
            <dl className="tf-metadata-grid">
              <ExplanationParagraph label="Field" value={field} />
              <ExplanationParagraph label="Meaning" value={explanation.meaning} />
              <ExplanationParagraph label="Why it matters" value={explanation.why_it_matters} />
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * Render plan-level study metadata as compact rows with information icons.
 *
 * @param {{explanation?: Record<string, unknown>}} props - Explanation props.
 * @returns {import("react").JSX.Element|null} Compact overview card.
 */
function PlanOverviewInfo({ explanation }) {
  if (!explanation) return null;

  return (
    <Card className="tf-documentation-context-card">
      <p className="tf-eyebrow">Plan overview</p>
      <h3>Read this plan progressively</h3>
      <p>
        Keep the page compact by reading the current profile, target scope and result first.
        Use the information icon when you want the full study explanation.
      </p>
      <div className="tf-governance-overview-list">
        <GovernanceOverviewInfoRow
          idPrefix="governance-study-guide"
          label="Study guide"
          summary="Read-only explanation"
          ariaLabel="Show study guide details"
        >
          <PlanStudyGuidePopover explanation={explanation} />
        </GovernanceOverviewInfoRow>
        <GovernanceOverviewInfoRow
          idPrefix="governance-profile"
          label="Profile"
          summary={explanation.profile?.label ?? explanation.profile?.id}
          ariaLabel="Show governance profile details"
        >
          <ConceptExplanationPopover
            title="Profile"
            item={explanation.profile}
            extraRows={[
              ["Target scope", explanation.profile?.target_scope],
              ["Baseline required", explanation.profile?.baseline_required],
              ["Required capabilities", asArray(explanation.profile?.required_capabilities).join(", ")],
            ]}
          />
        </GovernanceOverviewInfoRow>
        <GovernanceOverviewInfoRow
          idPrefix="governance-target-scope"
          label="Target scope"
          summary={explanation.target_scope?.label ?? explanation.target_scope?.id}
          ariaLabel="Show target scope details"
        >
          <ConceptExplanationPopover title="Target scope" item={explanation.target_scope} />
        </GovernanceOverviewInfoRow>
        <GovernanceOverviewInfoRow
          idPrefix="governance-result"
          label="Result"
          summary={explanation.result?.label ?? explanation.result?.id}
          ariaLabel="Show result details"
        >
          <ConceptExplanationPopover title="Result" item={explanation.result} />
        </GovernanceOverviewInfoRow>
        <GovernanceOverviewInfoRow
          idPrefix="governance-field-guide"
          label="Field guide"
          summary="Capability, validation surface and rationale"
          ariaLabel="Show field guide details"
        >
          <FieldExplanationGuidePopover fieldExplanations={explanation.field_explanations} />
        </GovernanceOverviewInfoRow>
      </div>
    </Card>
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
      <h4>Required capabilities</h4>
      <p className="tf-governance-gate-card__reason">
        These are the abilities the platform or child project must expose before the gate can be meaningful.
      </p>
      <div className="tf-governance-gate-list">
        {capabilities.map((capability) => (
          <Card key={String(capability.id)}>
            <h4>{displayValue(capability.label ?? capability.id)}</h4>
            <dl className="tf-metadata-grid">
              <ExplanationParagraph label="What it enables" value={capability.enables ?? capability.description} />
              <ExplanationParagraph label="Current state" value={capability.state?.label ?? capability.state?.id} />
              <ExplanationParagraph label="Why it matters" value={capability.why_it_matters} />
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
      <h4>Checked areas</h4>
      <p className="tf-governance-gate-card__reason">
        A checked area is the concrete repository, API, fixture, generated artifact, command or test surface that the gate uses for validation.
      </p>
      <div className="tf-governance-gate-list">
        {surfaces.map((surface) => (
          <Card key={String(surface.id)}>
            <h4>{displayValue(surface.label ?? surface.id)}</h4>
            <dl className="tf-metadata-grid">
              <ExplanationParagraph label="Area" value={surface.checked_area ?? surface.description} />
              <ExplanationParagraph label="Proof type" value={surface.evidence_kind} />
              <ExplanationParagraph label="Command" value={surface.command} />
              <ExplanationArrayBlock label="Artifacts checked" values={surface.checked_artifacts} />
              <ExplanationArrayBlock label="Paths checked" values={surface.checked_paths} />
              <ExplanationParagraph label="Why it matters" value={surface.why_it_matters} />
            </dl>
          </Card>
        ))}
      </div>
    </section>
  );
}

/**
 * Render one compact semantic section for an expanded governance gate.
 *
 * @param {{eyebrow: string, title: string, children: import("react").ReactNode}} props - Section props.
 * @returns {import("react").JSX.Element} Semantic gate section.
 */
function GateExplanationSection({ eyebrow, title, children }) {
  return (
    <section className="tf-governance-gate-section">
      <p className="tf-eyebrow">{eyebrow}</p>
      <h4>{title}</h4>
      {children}
    </section>
  );
}

/**
 * Render a collapsible semantic subsection so expanded gates stay readable.
 *
 * @param {{title: string, summary: string, children: import("react").ReactNode}} props - Details props.
 * @returns {import("react").JSX.Element} Collapsible gate subsection.
 */
function GateExplanationDisclosure({ title, summary, children }) {
  return (
    <details className="tf-governance-gate-disclosure">
      <summary>
        <span>{title}</span>
        <small>{summary}</small>
      </summary>
      <div>{children}</div>
    </details>
  );
}

/**
 * Render the expanded explanation for one generated gate using backend-provided semantics.
 *
 * @param {{gate?: Record<string, unknown>, explanation?: Record<string, unknown>}} props - Gate explanation props.
 * @returns {import("react").JSX.Element|null} Gate explanation details.
 */
function GateExplanationDetails({ gate, explanation }) {
  if (!explanation) return null;

  const selection = explanation.selection_rationale ?? {};
  const capabilities = asArray(explanation.required_capabilities);
  const surfaces = asArray(explanation.validation_surfaces);
  return (
    <div className="tf-governance-gate-explanation-flow">
      <GateExplanationSection eyebrow="1 · Selection" title="Why this gate?">
        <p>{displayValue(explanation.why_selected ?? gate?.reason)}</p>
        <dl className="tf-metadata-grid">
          <ExplanationParagraph label="Profile includes this gate" value={String(Boolean(selection.profile_includes_gate))} />
          <ExplanationParagraph label="Target scope supported" value={String(Boolean(selection.target_scope_supported_by_gate))} />
          <ExplanationParagraph label="Profile" value={selection.profile} />
          <ExplanationParagraph label="Target scope" value={selection.target_scope} />
        </dl>
      </GateExplanationSection>

      <GateExplanationSection eyebrow="2 · Validation" title="What does it check?">
        <p>{displayValue(explanation.what_it_checks ?? explanation.summary)}</p>
        <dl className="tf-metadata-grid">
          <ExplanationArrayBlock label="Objects checked" values={explanation.checked_objects} />
          <ExplanationArrayBlock label="Entity types checked" values={explanation.checked_entity_types} />
          <ExplanationArrayBlock label="Paths checked" values={explanation.checked_paths} />
        </dl>
      </GateExplanationSection>

      {surfaces.length > 0 ? (
        <GateExplanationDisclosure
          title="Checked areas"
          summary={`${surfaces.length} validation surface${surfaces.length === 1 ? "" : "s"}`}
        >
          <ValidationSurfaceExplanationList items={surfaces} />
        </GateExplanationDisclosure>
      ) : null}

      {capabilities.length > 0 ? (
        <GateExplanationDisclosure
          title="Required capabilities"
          summary={`${capabilities.length} required capabilit${capabilities.length === 1 ? "y" : "ies"}`}
        >
          <CapabilityExplanationList items={capabilities} />
        </GateExplanationDisclosure>
      ) : null}

      <GateExplanationSection eyebrow="3 · Expected outcome" title="Expected result">
        <p>{displayValue(explanation.expected_result ?? explanation.expected_verification_output)}</p>
      </GateExplanationSection>

      <GateExplanationSection eyebrow="4 · Threat analysis" title="Contribution to threat-analysis readiness">
        <p>{displayValue(explanation.contributes_to_threat_analysis_readiness)}</p>
      </GateExplanationSection>

      <GateExplanationDisclosure title="Planning status" summary={displayValue(explanation.status?.label ?? gate?.status)}>
        <dl className="tf-metadata-grid">
          <ExplanationParagraph label="Status" value={explanation.status?.label ?? explanation.status?.id ?? gate?.status} />
          <ExplanationParagraph label="Status meaning" value={explanation.status?.description ?? explanation.status?.concept} />
          <ExplanationParagraph label="Applicability" value={explanation.applicability_class?.label ?? explanation.applicability_class?.id ?? gate?.applicability_class} />
          <ExplanationParagraph label="Applicability meaning" value={explanation.applicability_class?.description ?? explanation.applicability_class?.concept} />
          <ExplanationParagraph label="Unsupported behavior" value={selection.unsupported_behavior} />
          <ExplanationParagraph label="Result when not applicable" value={selection.result_when_not_applicable} />
        </dl>
      </GateExplanationDisclosure>

      <TechnicalTraceDetails gate={gate} explanation={explanation} />
    </div>
  );
}

/**
 * Render detailed gate rows as compact expandable list items.
 *
 * @param {{gates: Array<Record<string, unknown>>, explanationsByGateId?: Record<string, Record<string, unknown>>}} props - Gate rows.
 * @returns {import("react").JSX.Element} Gate list.
 */
function GateRows({ gates, explanationsByGateId = {} }) {
  const [expandedGateIds, setExpandedGateIds] = useState(() => new Set());

  if (gates.length === 0) {
    return <EmptyState title="No gates match the current filters">Reset search or status filters to see all planned gates.</EmptyState>;
  }

  /**
   * Toggle one gate explanation in the current list.
   *
   * @param {unknown} gateId - Gate identifier.
   * @returns {void}
   */
  function toggleGate(gateId) {
    const normalizedGateId = String(gateId ?? "");
    setExpandedGateIds((current) => {
      const next = new Set(current);
      if (next.has(normalizedGateId)) next.delete(normalizedGateId);
      else next.add(normalizedGateId);
      return next;
    });
  }

  return (
    <div className="tf-governance-gate-list">
      {gates.map((gate) => {
        const gateId = String(gate.id ?? "");
        const explanation = explanationsByGateId[gateId] ?? undefined;
        const isExpanded = expandedGateIds.has(gateId);
        const description = getGateShortDescription(gate, explanation);
        return (
          <Card className="tf-governance-gate-card" key={gateId}>
            <button
              type="button"
              className="tf-entity-row tf-governance-gate-summary-row"
              onClick={() => toggleGate(gateId)}
              aria-expanded={isExpanded}
            >
              <span className="tf-entity-row__icon"><Icon token="navigation.documentation" /></span>
              <span className="tf-entity-row__main">
                <strong>{displayValue(gate.label ?? gate.id)}</strong>
                <span>{displayValue(description)}</span>
              </span>
              <span className="tf-entity-row__meta">
                <StatusBadge value={String(gate.status ?? "unknown")} label={String(gate.status ?? "unknown")} />
                <span className="tf-badge">{isExpanded ? "Hide details" : "Show details"}</span>
              </span>
            </button>

            {isExpanded ? (
              <div className="tf-governance-gate-card__details">
                {explanation ? (
                  <GateExplanationDetails gate={gate} explanation={explanation} />
                ) : (
                  <>
                    <p className="tf-governance-gate-card__reason">
                      This data source does not expose the taxonomy-backed explanation payload yet, so the UI can only show technical plan values.
                    </p>
                    <dl className="tf-metadata-grid">
                      <ExplanationParagraph label="Gate id" value={gate.id} />
                      <ExplanationParagraph label="Severity" value={gate.severity} />
                      <ExplanationParagraph label="Applicability class" value={gate.applicability_class} />
                      <ExplanationParagraph label="Why this gate is in the plan" value={gate.reason} />
                      <ExplanationArrayBlock label="Required capabilities" values={gate.required_capabilities} />
                      <ExplanationArrayBlock label="Validation surfaces" values={gate.validation_surfaces} />
                    </dl>
                    <TechnicalTraceDetails gate={gate} explanation={explanation} />
                  </>
                )}
              </div>
            ) : null}
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
      <PlanOverviewInfo explanation={explanation} />
      <DetailedPlanSummary plan={plan} />
      <CapabilityStates states={plan.capability_states} />

      <section className="tf-filter-bar" aria-label="Gate filters">
        <SearchInput
          value={gateFilters.q}
          onChange={(q) => setGateFilters((current) => ({ ...current, q }))}
          placeholder="Search gates, descriptions, reasons, verification evidence"
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

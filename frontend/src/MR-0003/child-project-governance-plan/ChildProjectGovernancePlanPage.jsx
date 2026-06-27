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
 * Render detailed gate rows.
 *
 * @param {{gates: Array<Record<string, unknown>>}} props - Gate rows.
 * @returns {import("react").JSX.Element} Gate table/list.
 */
function GateRows({ gates }) {
  if (gates.length === 0) {
    return <EmptyState title="No gates match the current filters">Reset search or status filters to see all planned gates.</EmptyState>;
  }

  return (
    <div className="tf-governance-gate-list">
      {gates.map((gate) => (
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
        </Card>
      ))}
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
  const gateStatusOptions = useMemo(() => buildGateStatusFilterOptions(gates), [gates]);
  const filteredGates = useMemo(() => filterGovernanceGateRows(gates, gateFilters), [gates, gateFilters]);

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

      <GateRows gates={filteredGates} />
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
          <p>Select a platform or child project, then inspect the generated gate plan and evidence.</p>
        </div>
        <span className="tf-count-pill">{projectOptions.length} projects</span>
      </section>

      <DataSourceStatus dataSource={dataSource} />

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
              <p>Open one row to load the matching governance gate plan on this page.</p>
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

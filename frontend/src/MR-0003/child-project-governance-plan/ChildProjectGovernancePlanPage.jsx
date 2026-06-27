import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, SearchInput, SelectField, StatusBadge } from "../../MR-0002/design-system/components.jsx";
import { Icon } from "../../MR-0002/design-system/Icon.jsx";
import {
  buildGatePlanResultFilterOptions,
  buildGateStatusFilterOptions,
  filterGatePlanSummaries,
  filterGovernanceGateRows,
  formatGovernancePlanLabel,
  getGatePlanKey,
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
 * injected frontend client port. It shows the available profile/target-scope
 * plans, selected plan summary, capability states, gate status/reason/evidence
 * and validation surfaces. It remains read-only and consumes generated plan
 * artifacts or their HTTP API read model; it does not execute gates, read local
 * artifact files directly, mutate child projects, write SQLite state, edit
 * registries, or implement final RBAC administration.
 *
 * Side effects: loads read-only data through the injected client port and keeps
 * browser-only selection/filter state in React component state.
 */

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
 * Render selected data-source information.
 *
 * @param {{dataSource?: Record<string, unknown>}} props - Data-source props.
 * @returns {import("react").JSX.Element|null} Data-source card or null.
 */
function DataSourceStatus({ dataSource }) {
  if (!dataSource) return null;

  return (
    <Card>
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
      <Card>
        <span>Plans</span>
        <strong>{items.length}</strong>
      </Card>
      <Card>
        <span>Gate rows</span>
        <strong>{totalGates}</strong>
      </Card>
      <Card>
        <span>Pass result</span>
        <strong>{passPlans}</strong>
      </Card>
    </section>
  );
}

/**
 * Render the read-only gate plan list.
 *
 * @param {{items: Array<Record<string, unknown>>, selectedKey?: string, onSelect: Function}} props - List props.
 * @returns {import("react").JSX.Element} List or empty state.
 */
function GatePlanList({ items, selectedKey, onSelect }) {
  if (items.length === 0) {
    return <EmptyState title="No governance plans">Generate gate plan artifacts and enable HTTP mode to view them here.</EmptyState>;
  }

  return (
    <div className="tf-entity-list">
      {items.map((item) => {
        const itemKey = getGatePlanKey(item);
        return (
          <button
            key={itemKey}
            className={`tf-entity-row tf-governance-plan-row ${itemKey === selectedKey ? "is-selected" : ""}`}
            type="button"
            onClick={() => onSelect(item)}
          >
            <span className="tf-entity-row__icon"><Icon token="navigation.governancePlans" /></span>
            <span className="tf-entity-row__main">
              <strong>{displayValue(item.profile)}</strong>
              <span>{displayValue(item.target_scope)} · {displayValue(item.artifact_path)}</span>
            </span>
            <span className="tf-entity-row__meta">
              <StatusBadge value={String(item.result ?? "unknown")} label={String(item.result ?? "unknown")} />
              <span className="tf-badge">{Number(item.gates_evaluated ?? 0)} gates</span>
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
      <Card>
        <span>Profile</span>
        <strong>{displayValue(plan.profile)}</strong>
      </Card>
      <Card>
        <span>Target scope</span>
        <strong>{displayValue(plan.target_scope)}</strong>
      </Card>
      <Card>
        <span>Gates evaluated</span>
        <strong>{Number(plan.gates_evaluated ?? 0)}</strong>
      </Card>
      {summaryRows.map((row) => (
        <Card key={row.status}>
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
  if (!plan) return <EmptyState title="Select a governance plan">Choose a profile/target-scope plan to inspect gate evidence.</EmptyState>;

  return (
    <section className="tf-detail-view tf-governance-plan-detail" aria-label="Selected governance gate plan">
      <div className="tf-detail-view__header">
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
 * Render the read-only governance plan page.
 *
 * @param {{client: {listGatePlans: Function, getGatePlan: Function, describeDataSource?: Function}}} props - Page props.
 * @returns {import("react").JSX.Element} Page element.
 */
export function ChildProjectGovernancePlanPage({ client }) {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({ q: "", result: "" });
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
        setSelectedItem((current) => current ?? nextItems[0] ?? null);
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
    if (!selectedItem) {
      setDetail(null);
      return undefined;
    }

    let cancelled = false;
    setLoadingDetail(true);
    setDetailError("");
    client.getGatePlan(selectedItem.profile, selectedItem.target_scope)
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
  }, [client, selectedItem]);

  const resultOptions = useMemo(() => buildGatePlanResultFilterOptions(items), [items]);
  const filteredItems = useMemo(() => filterGatePlanSummaries(items, filters), [items, filters]);
  const selectedKey = selectedItem ? getGatePlanKey(selectedItem) : "";

  return (
    <div className="tf-child-project-governance-plan-page">
      <section className="tf-page-title">
        <div>
          <p className="tf-eyebrow">Child project governance</p>
          <h1>Governance gate plans</h1>
          <p>Read-only view of generated gate plans before executor/orchestrator work.</p>
        </div>
        <span className="tf-count-pill">{filteredItems.length} / {items.length} plans</span>
      </section>

      <PlanSummaryCards items={items} />
      <DataSourceStatus dataSource={dataSource} />

      <section className="tf-filter-bar" aria-label="Governance plan filters">
        <SearchInput
          value={filters.q}
          onChange={(q) => setFilters((current) => ({ ...current, q }))}
          placeholder="Search profile, target scope, artifact"
        />
        <SelectField
          label="Plan result"
          value={filters.result}
          values={resultOptions}
          onChange={(result) => setFilters((current) => ({ ...current, result }))}
        />
        <Button onClick={() => setFilters({ q: "", result: "" })}>Reset</Button>
      </section>

      {loadingList ? (
        <EmptyState title="Loading governance plans">Reading generated gate-plan artifacts.</EmptyState>
      ) : error ? (
        <EmptyState title="Unable to load governance plans">{error}</EmptyState>
      ) : (
        <div className="tf-split-view">
          <section aria-label="Governance plan list">
            <GatePlanList items={filteredItems} selectedKey={selectedKey} onSelect={setSelectedItem} />
          </section>
          <GatePlanDetail detail={detail} loading={loadingDetail} error={detailError} />
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, SearchInput, SelectField, StatusBadge } from "../../MR-0002/design-system/components.jsx";
import { Icon } from "../../MR-0002/design-system/Icon.jsx";
import {
  buildChildProjectStatusFilterOptions,
  countChildProjectsByStatus,
  filterChildProjectOperationalStates,
  getChildProjectOverallStatus,
} from "./child-project-management.state.js";

/**
 * @file Read-only Child Projects management React page.
 *
 * @implementsRequirement MR-0003REQ-0012
 * @implementsRequirement MR-0003REQ-0013
 * @implementsRequirement MR-0003REQ-0014
 * @implementsRequirement MR-0003REQ-0015
 * @implementsRequirement MR-0003REQ-0025
 * @implementsRequirement MR-0003REQ-0026
 * @implementsRequirement MR-0003REQ-0028
 * @implementsRequirement MR-0003REQ-0070
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0005
 * @derivedFromDecision MR-0003/ADR-0016
 * @macroRequirement MR-0003
 *
 * The page renders the first platform-only Child Projects UI slice. It reads a
 * normalized operational-state view model through an injected frontend client
 * port, displays status filters, and shows one selected child project's registry
 * configuration, latest check details and local demo Project Model Explorer
 * launch guidance. It does not create projects, run validation gates, clone
 * repositories, inspect local filesystem paths, read child Project Model
 * sources, write SQLite records, or perform commit/push. The Project Model launch action passes the selected child project id to the shared documentation route so the composed frontend can use the project-scoped backend API.
 *
 * Side effects: loads read-only data through the injected client port and keeps
 * local browser UI state in React component state.
 */

/**
 * Render selected child-project data-source information.
 *
 * @param {{dataSource?: Record<string, unknown>}} props - Data-source props.
 * @returns {import("react").JSX.Element|null} Data-source card or null.
 */
function DataSourceStatus({ dataSource }) {
  if (!dataSource) return null;

  return (
    <Card>
      <p className="tf-eyebrow">Data source</p>
      <strong>{dataSource.label ?? "Child Projects data source"}</strong>
      <p>{dataSource.message ?? "Reading child project operational state through the configured frontend client port."}</p>
    </Card>
  );
}

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
 * Render repository location metadata.
 *
 * @param {{repository?: Record<string, unknown>}} props - Repository props.
 * @returns {import("react").JSX.Element} Repository display.
 */
function RepositoryLocation({ repository = {} }) {
  const primary = repository.kind === "git" ? repository.url : repository.local_path;
  return (
    <span>
      {displayValue(primary)} · {displayValue(repository.default_branch)}
    </span>
  );
}

/**
 * Render the read-only child project list.
 *
 * @param {{items: Array<Record<string, unknown>>, onSelect: Function}} props - List props.
 * @returns {import("react").JSX.Element} List or empty state.
 */
function ChildProjectList({ items, onSelect }) {
  if (items.length === 0) {
    return <EmptyState title="No child projects">Register a child project through the backend management workflow to see it here.</EmptyState>;
  }

  return (
    <div className="tf-entity-list">
      {items.map((state) => {
        const project = state.child_project ?? {};
        const repository = project.repository ?? {};
        const status = getChildProjectOverallStatus(state);

        return (
          <button key={project.id} className="tf-entity-row tf-child-project-row" type="button" onClick={() => onSelect(project.id)}>
            <span className="tf-entity-row__icon"><Icon token="navigation.childProjects" /></span>
            <span className="tf-entity-row__main">
              <strong>{project.name ?? project.id}</strong>
              <RepositoryLocation repository={repository} />
            </span>
            <span className="tf-entity-row__meta">
              <StatusBadge value={status} label={status} />
              <span className="tf-badge">{displayValue(project.project_model?.governance_profile)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Render child project lifecycle policy rows.
 *
 * @param {{policy?: Record<string, unknown>}} props - Policy props.
 * @returns {import("react").JSX.Element} Policy card.
 */
function LifecyclePolicyCard({ policy = {} }) {
  const rows = [
    ["Document-first required", policy.document_first_required],
    ["Code traceability required", policy.code_traceability_required],
    ["Threat-analysis pre-code", policy.threat_analysis_pre_code_required],
    ["Governed commit-push required", policy.governed_commit_push_required],
    ["Direct push allowed", policy.direct_push_allowed],
  ];

  return (
    <Card>
      <h3>Lifecycle policy</h3>
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
 * Render latest check-run details.
 *
 * @param {{checkRun?: Record<string, unknown>|null}} props - Check-run props.
 * @returns {import("react").JSX.Element} Check-run card.
 */
function LatestCheckRunCard({ checkRun }) {
  if (!checkRun) {
    return <EmptyState title="No check run recorded">The project is registered but has not been validated by child project gates yet.</EmptyState>;
  }

  const rows = [
    ["Checked at", checkRun.checked_at],
    ["Repository HEAD", checkRun.repository_head],
    ["Branch", checkRun.branch],
    ["Overall status", checkRun.overall_status],
  ];

  return (
    <Card>
      <h3>Latest check run</h3>
      <dl className="tf-metadata-grid">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{displayValue(value)}</dd>
          </div>
        ))}
      </dl>
      <div className="tf-child-project-gates" aria-label="Gate results">
        {(checkRun.gate_results ?? []).map((gate) => (
          <span key={`${gate.gate_name}-${gate.status}`} className="tf-badge">
            {gate.gate_name}: {gate.status}
          </span>
        ))}
      </div>
    </Card>
  );
}

/**
 * Render selected child-project operational state.
 *
 * @param {{detail: Record<string, unknown>, onBack: Function}} props - Detail props.
 * @returns {import("react").JSX.Element} Detail view.
 */
function ChildProjectDetail({ detail, onBack, onOpenProjectModel }) {
  const state = detail.child_project ? detail : detail.item ?? detail;
  const project = state.child_project ?? {};
  const repository = project.repository ?? {};
  const projectModel = project.project_model ?? {};
  const canOpenProjectModel = typeof onOpenProjectModel === "function";

  const rows = [
    ["ID", project.id],
    ["Name", project.name],
    ["Repository kind", repository.kind],
    ["Repository URL", repository.url],
    ["Local path", repository.local_path],
    ["Default branch", repository.default_branch],
    ["Project Model root", projectModel.root],
    ["Governance profile", projectModel.governance_profile],
    ["Archived", project.archived],
  ];

  return (
    <section className="tf-detail-view">
      <div className="tf-detail-view__header">
        <div>
          <p className="tf-eyebrow">Selected child project</p>
          <h2>{project.name ?? project.id}</h2>
          <p>{displayValue(project.id)}</p>
        </div>
        <Button onClick={onBack}><Icon token="action.back" /> Back to list</Button>
      </div>
      <Card>
        <h3>Registration</h3>
        <dl className="tf-metadata-grid">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{displayValue(value)}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <LifecyclePolicyCard policy={project.lifecycle_policy} />
      <LatestCheckRunCard checkRun={state.latest_check_run} />
      <ProjectModelExplorerLaunchCard project={project} onOpenProjectModel={canOpenProjectModel ? onOpenProjectModel : undefined} />
    </section>
  );
}


/**
 * Render local demo Project Model Explorer launch guidance.
 *
 * @param {{project?: Record<string, unknown>, onOpenProjectModel?: Function}} props - Launch guidance props.
 * @returns {import("react").JSX.Element|null} Guidance card or null.
 */
function ProjectModelExplorerLaunchCard({ project = {}, onOpenProjectModel }) {
  if (project.id !== "demo-child-project") return null;

  return (
    <Card>
      <p className="tf-eyebrow">Demo Project Model Explorer</p>
      <h3>Open this child Project Model</h3>
      <p>Open the selected child Project Model through the platform project-scoped Child Project Management API. The documentation page receives this child project id and does not reuse platform documents or a legacy global child documentation URL.</p>
      <div className="tf-command-list" aria-label="Demo Project Model Explorer launch commands">
        <code>npm run dev:ui-test:start</code>
        <code>VITE_CHILD_PROJECT_MANAGEMENT_SOURCE=http</code>
        <code>VITE_CHILD_PROJECT_MANAGEMENT_HTTP_BASE_URL=http://127.0.0.1:4175</code>
      </div>
      {typeof onOpenProjectModel === "function" ? (
        <Button onClick={() => onOpenProjectModel(project)}><Icon token="navigation.documentation" /> Open Project Documentation Explorer</Button>
      ) : null}
    </Card>
  );
}

/**
 * Render Child Projects page.
 *
 * @param {{client: {describeDataSource?: Function, listChildProjects: Function, getChildProject: Function}, onOpenProjectModel?: Function}} props - Page props.
 * @returns {import("react").JSX.Element} Child Projects page.
 */
export function ChildProjectsPage({ client, onOpenProjectModel }) {
  const [model, setModel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [state, setState] = useState({ q: "", status: "", selectedId: "" });

  useEffect(() => {
    let disposed = false;
    client.listChildProjects().then((nextModel) => {
      if (!disposed) setModel(nextModel);
    }).catch((nextError) => {
      if (!disposed) setError(nextError);
    });
    return () => { disposed = true; };
  }, [client]);

  useEffect(() => {
    if (!state.selectedId) {
      setDetail(null);
      return undefined;
    }

    let disposed = false;
    client.getChildProject(state.selectedId).then((nextDetail) => {
      if (!disposed) setDetail(nextDetail);
    }).catch((nextError) => {
      if (!disposed) setError(nextError);
    });
    return () => { disposed = true; };
  }, [client, state.selectedId]);

  const items = model?.items ?? [];
  const filteredItems = useMemo(() => filterChildProjectOperationalStates(items, state), [items, state]);
  const counts = useMemo(() => countChildProjectsByStatus(items), [items]);
  const statusOptions = useMemo(() => buildChildProjectStatusFilterOptions(items), [items]);

  if (error) {
    return <EmptyState title="Unable to load child projects">{error.message}</EmptyState>;
  }

  if (!model) {
    return <EmptyState title="Loading Child Projects">Reading platform child project operational state through the frontend client port.</EmptyState>;
  }

  return (
    <div className="tf-child-projects-page">
      <div className="tf-page-title">
        <div>
          <p className="tf-eyebrow">MR-0003 · read-only</p>
          <h1>Child Projects</h1>
          <p>Review governed child project registrations and their latest lifecycle check status.</p>
        </div>
        <div className="tf-count-pill">{filteredItems.length} / {items.length} projects</div>
      </div>

      <DataSourceStatus dataSource={model.data_source ?? client.describeDataSource?.()} />

      <section className="tf-filter-bar" aria-label="Child project filters">
        <SearchInput value={state.q} onChange={(q) => setState((current) => ({ ...current, q, selectedId: "" }))} placeholder="Search project, repo, branch..." />
        <SelectField
          label="Status"
          value={state.status}
          values={statusOptions}
          onChange={(status) => setState((current) => ({ ...current, status, selectedId: "" }))}
        />
        <Button onClick={() => setState({ q: "", status: "", selectedId: "" })}><Icon token="action.reset" /> Reset</Button>
      </section>

      {state.selectedId ? (
        detail ? <ChildProjectDetail detail={detail} onBack={() => setState((current) => ({ ...current, selectedId: "" }))} onOpenProjectModel={onOpenProjectModel} /> : <EmptyState title="Loading child project">Reading selected operational state through the client port.</EmptyState>
      ) : (
        <>
          <div className="tf-stats-grid">
            <Card><strong>{items.length}</strong><span>Total registered</span></Card>
            <Card><strong>{counts.pass ?? 0}</strong><span>Passing</span></Card>
            <Card><strong>{counts.fail ?? 0}</strong><span>Failing</span></Card>
            <Card><strong>{counts.warning ?? 0}</strong><span>Warnings</span></Card>
          </div>
          <ChildProjectList items={filteredItems} onSelect={(selectedId) => setState((current) => ({ ...current, selectedId }))} />
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, MarkdownBody, SearchInput, SelectField, StatusBadge } from "../design-system/components.jsx";
import { Icon } from "../design-system/Icon.jsx";
import { countItemsByKind, filterDocumentationItems } from "./project-documentation-explorer.state.js";

/**
 * @file Read-only Project Documentation Explorer React page.
 *
 * @implementsRequirement MR-0002REQ-0002
 * @implementsRequirement MR-0002REQ-0007
 * @implementsRequirement MR-0002REQ-0008
 * @implementsRequirement MR-0002REQ-0026
 * @implementsRequirement MR-0002REQ-0035
 * @implementsRequirement MR-0002REQ-0036
 * @implementsRequirement MR-0002REQ-0037
 * @implementsRequirement MR-0002REQ-0041
 * @derivedFromDecision MR-0002/ADR-0001
 * @derivedFromDecision MR-0002/ADR-0002
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0008
 * @derivedFromDecision MR-0002/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0010
 * @macroRequirement MR-0002
 *
 * The page implements the manually validated list/detail interaction: filters
 * stay at the top, the list is hidden when a record is selected, and registry
 * metadata appears above body Markdown in the detail view. The page uses only a
 * client port and normalized view-model data. It does not read source files,
 * registries, graph files, generated pages, Git state or filesystem paths.
 *
 * Side effects: loads data through the injected client port and stores UI state
 * in React component state. It does not mutate project-model records or perform
 * write operations.
 */

/**
 * Render filter controls from backend-provided filter facets.
 *
 * @param {{filters: Array<Record<string, unknown>>, state: Record<string, unknown>, onSearch: Function, onFilter: Function, onReset: Function}} props - Filter props.
 * @returns {import("react").JSX.Element} Filter bar.
 */
function FilterBar({ filters, state, onSearch, onFilter, onReset }) {
  return (
    <section className="tf-filter-bar" aria-label="Documentation filters">
      <SearchInput value={state.q} onChange={onSearch} placeholder="Search id, title, status..." />
      {filters.map((filter) => (
        <SelectField
          key={filter.id}
          label={filter.label}
          value={state.filters[filter.id] ?? ""}
          values={filter.values ?? []}
          onChange={(value) => onFilter(filter.id, value)}
        />
      ))}
      <Button onClick={onReset}><Icon token="action.reset" /> Reset</Button>
    </section>
  );
}

/**
 * Render the filtered entity list.
 *
 * @param {{items: Array<Record<string, unknown>>, onSelect: Function}} props - List props.
 * @returns {import("react").JSX.Element} Entity list.
 */
function EntityList({ items, onSelect }) {
  if (items.length === 0) return <EmptyState title="No documentation entities">Try relaxing the filters.</EmptyState>;

  return (
    <div className="tf-entity-list">
      {items.map((item) => (
        <button key={item.id} className="tf-entity-row" type="button" onClick={() => onSelect(item.id)}>
          <span className="tf-entity-row__icon"><Icon token={`entity.${item.kind}`} /></span>
          <span className="tf-entity-row__main">
            <strong>{item.id}</strong>
            <span>{item.title}</span>
          </span>
          <span className="tf-entity-row__meta">
            <StatusBadge value={item.implementation_state} />
            <StatusBadge value={item.acceptance_state} />
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Render selected entity metadata and body.
 *
 * @param {{detail: Record<string, unknown>, onBack: Function}} props - Detail props.
 * @returns {import("react").JSX.Element} Detail panel.
 */
function EntityDetail({ detail, onBack }) {
  const item = detail.item ?? {};
  const body = detail.body ?? {};
  const metadataRows = [
    ["ID", item.id],
    ["Kind", item.kind],
    ["Macro requirement", item.macro_requirement_id],
    ["Status", item.status],
    ["Requirement type", item.requirement_type],
    ["Priority", item.priority],
    ["Implementation", item.implementation_state],
    ["Acceptance", item.acceptance_state],
    ["Body path", body.path],
  ].filter(([, value]) => value != null && value !== "");

  return (
    <section className="tf-detail-view">
      <div className="tf-detail-view__header">
        <div>
          <p className="tf-eyebrow">Selected entity</p>
          <h2>{item.id}</h2>
          <p>{item.title}</p>
        </div>
        <Button onClick={onBack}><Icon token="action.back" /> Back to list</Button>
      </div>
      <Card>
        <h3>Registry data</h3>
        <dl className="tf-metadata-grid">
          {metadataRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{String(value)}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card>
        <h3>Governed body</h3>
        <MarkdownBody markdown={body.content_markdown} />
      </Card>
    </section>
  );
}

/**
 * Render the Project Documentation Explorer page.
 *
 * @param {{client: {loadDocumentation: Function, loadDocumentationEntity: Function}}} props - Page props.
 * @returns {import("react").JSX.Element} Explorer page.
 */
export function ProjectDocumentationExplorerPage({ client }) {
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);
  const [state, setState] = useState({ q: "", filters: {}, selectedId: "" });
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let disposed = false;
    client.loadDocumentation().then((nextModel) => {
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
    client.loadDocumentationEntity(state.selectedId).then((nextDetail) => {
      if (!disposed) setDetail(nextDetail);
    }).catch((nextError) => {
      if (!disposed) setError(nextError);
    });
    return () => { disposed = true; };
  }, [client, state.selectedId]);

  const filteredItems = useMemo(() => filterDocumentationItems(model?.items ?? [], state), [model, state]);
  const countsByKind = useMemo(() => countItemsByKind(filteredItems), [filteredItems]);

  if (error) {
    return <EmptyState title="Unable to load explorer data">{error.message}</EmptyState>;
  }

  if (!model) {
    return <EmptyState title="Loading Project Documentation Explorer">Reading normalized view-model data through the frontend client port.</EmptyState>;
  }

  return (
    <div className="tf-documentation-explorer">
      <div className="tf-page-title">
        <div>
          <p className="tf-eyebrow">MR-0002 · read-only</p>
          <h1>Project Documentation Explorer</h1>
          <p>Filter governed documentation, open one entity, then read registry metadata followed by body content.</p>
        </div>
        <div className="tf-count-pill">{filteredItems.length} / {model.summary?.total_items ?? model.items.length} items</div>
      </div>

      <FilterBar
        filters={model.filters ?? []}
        state={state}
        onSearch={(q) => setState((current) => ({ ...current, q, selectedId: "" }))}
        onFilter={(id, value) => setState((current) => ({ ...current, filters: { ...current.filters, [id]: value }, selectedId: "" }))}
        onReset={() => setState({ q: "", filters: {}, selectedId: "" })}
      />

      {state.selectedId ? (
        detail ? <EntityDetail detail={detail} onBack={() => setState((current) => ({ ...current, selectedId: "" }))} /> : <EmptyState title="Loading detail">Reading body-backed detail through the client port.</EmptyState>
      ) : (
        <>
          <div className="tf-stats-grid">
            {Object.entries(countsByKind).map(([kind, count]) => <Card key={kind}><strong>{count}</strong><span>{kind}</span></Card>)}
          </div>
          <EntityList items={filteredItems} onSelect={(selectedId) => setState((current) => ({ ...current, selectedId }))} />
        </>
      )}
    </div>
  );
}

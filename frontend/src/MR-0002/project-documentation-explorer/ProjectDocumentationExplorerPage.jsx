import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, MarkdownBody, SearchInput, SelectField, StatusBadge } from "../design-system/components.jsx";
import { Icon } from "../design-system/Icon.jsx";
import { InfoPopover } from "../design-system/InfoPopover.jsx";
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
 * @implementsRequirement MR-0002REQ-0049
 * @implementsRequirement MR-0002REQ-0056
 * @implementsRequirement MR-0002REQ-0058
 * @derivedFromDecision MR-0002/ADR-0001
 * @derivedFromDecision MR-0002/ADR-0002
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0008
 * @derivedFromDecision MR-0002/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0010
 * @derivedFromDecision MR-0002/ADR-0016
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
 * Render the selected Project Documentation Explorer data-source state.
 *
 * @param {{dataSource?: Record<string, unknown>}} props - Data-source props.
 * @returns {import("react").JSX.Element|null} Data-source status card.
 */
function DataSourceStatus({ dataSource }) {
  if (!dataSource) return null;

  const selected = dataSource.selected_source ?? "unknown";
  const effective = dataSource.effective_source ?? selected;
  const isFallback = Boolean(dataSource.fallback);

  return (
    <Card>
      <p className="tf-eyebrow">Data source</p>
      <strong>{dataSource.label ?? `Using ${effective}`}</strong>
      <p>{dataSource.message ?? `Selected source: ${selected}. Effective source: ${effective}.`}</p>
      {isFallback && dataSource.failure_message ? (
        <p>Live HTTP failure: {String(dataSource.failure_message)}</p>
      ) : null}
    </Card>
  );
}

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
 * Render a labeled list of string values when values are available.
 *
 * @param {{title: string, values?: unknown[]}} props - List props.
 * @returns {import("react").JSX.Element|null} Rendered list or null.
 */
function OptionalValueList({ title, values }) {
  const normalized = Array.isArray(values) ? values.map((value) => String(value ?? "").trim()).filter(Boolean) : [];
  if (normalized.length === 0) return null;

  return (
    <div>
      <dt>{title}</dt>
      <dd>{normalized.join(", ")}</dd>
    </div>
  );
}

/**
 * Render a help popover containing full meaning for one taxonomy value.
 *
 * @param {{value: Record<string, unknown>}} props - Taxonomy value props.
 * @returns {import("react").JSX.Element} Taxonomy value help popover.
 */
function TaxonomyValueHelpPopover({ value }) {
  const ui = value.ui && typeof value.ui === "object" ? value.ui : null;
  const securityAnalysis = value.security_analysis && typeof value.security_analysis === "object" ? value.security_analysis : null;

  return (
    <div className="tf-taxonomy-field-popover" role="tooltip">
      <p className="tf-eyebrow">Taxonomy value details</p>
      <h4>{value.label ?? value.id}</h4>
      <p>Raw id: {value.id}</p>
      {value.description ? <p>{String(value.description)}</p> : null}
      {value.function ? <p><strong>Function:</strong> {String(value.function)}</p> : null}
      <dl className="tf-taxonomy-field-popover__meta">
        {ui?.icon_token ? <div><dt>Icon token</dt><dd>{String(ui.icon_token)}</dd></div> : null}
        {ui?.color_token ? <div><dt>Color token</dt><dd>{String(ui.color_token)}</dd></div> : null}
        {ui?.graph_shape_token ? <div><dt>Graph shape</dt><dd>{String(ui.graph_shape_token)}</dd></div> : null}
        {ui?.graph_edge_style_token ? <div><dt>Graph edge style</dt><dd>{String(ui.graph_edge_style_token)}</dd></div> : null}
        <OptionalValueList title="Applies to" values={securityAnalysis?.applies_to} />
        {securityAnalysis?.analysis_hint ? <div><dt>Analysis hint</dt><dd>{String(securityAnalysis.analysis_hint)}</dd></div> : null}
      </dl>
    </div>
  );
}

/**
 * Render UI and security-analysis metadata for one taxonomy value as compact row with on-demand details.
 *
 * @param {{value: Record<string, unknown>}} props - Taxonomy value props.
 * @returns {import("react").JSX.Element} Taxonomy value card.
 */
function TaxonomyValueCard({ value }) {
  return (
    <article className="tf-taxonomy-value-card">
      <div className="tf-taxonomy-value-card__main">
        <strong>{value.label ?? value.id}</strong>
        <span>Raw id: {value.id}</span>
      </div>
      <InfoPopover
        id={`taxonomy-value-${value.id ?? "value"}`}
        ariaLabel={`Show details for taxonomy value ${value.label ?? value.id}`}
      >
        <TaxonomyValueHelpPopover value={value} />
      </InfoPopover>
    </article>
  );
}

/**
 * Render taxonomy value explanations for selected taxonomy entities.
 *
 * @param {{taxonomy?: Record<string, unknown>|null}} props - Taxonomy detail props.
 * @returns {import("react").JSX.Element|null} Taxonomy explanation card or null.
 */
function TaxonomyDetail({ taxonomy }) {
  if (!taxonomy) return null;
  const values = Array.isArray(taxonomy.values) ? taxonomy.values : [];

  return (
    <Card>
      <p className="tf-eyebrow">Taxonomy explanation</p>
      <h3>{taxonomy.title ?? taxonomy.id}</h3>
      <p>
        This section explains the governed values in this taxonomy. The text comes from the backend view-model,
        which is derived from the taxonomy registry; the frontend only renders the supplied meaning.
      </p>
      <dl className="tf-metadata-grid">
        <div><dt>Taxonomy id</dt><dd>{taxonomy.id}</dd></div>
        <div><dt>Values</dt><dd>{taxonomy.value_count ?? values.length}</dd></div>
        {taxonomy.source_path ? <div><dt>Source registry</dt><dd>{taxonomy.source_path}</dd></div> : null}
      </dl>
      {values.length > 0 ? (
        <div className="tf-entity-list">
          {values.map((value) => <TaxonomyValueCard key={value.id} value={value} />)}
        </div>
      ) : (
        <p>No taxonomy values are registered for this taxonomy.</p>
      )}
    </Card>
  );
}



/**
 * Render one allowed value for a taxonomy-backed document field inside an on-demand help popover.
 *
 * @param {{value: Record<string, unknown>}} props - Value explanation props.
 * @returns {import("react").JSX.Element} Allowed value row.
 */
function TaxonomyFieldAllowedValue({ value }) {
  return (
    <li className={value.current ? "tf-taxonomy-field-popover__value is-current" : "tf-taxonomy-field-popover__value"}>
      <span className="tf-taxonomy-field-popover__value-title">
        <strong>{value.label ?? value.id}</strong>
        {value.current ? <span className="tf-badge">Current</span> : null}
      </span>
      <span className="tf-taxonomy-field-popover__value-id">{value.id}</span>
      {value.description ? <span>{String(value.description)}</span> : null}
      {value.function ? <span><strong>Function:</strong> {String(value.function)}</span> : null}
    </li>
  );
}

/**
 * Render the hover/focus/click help popover for one taxonomy-backed document field.
 *
 * @param {{field: Record<string, unknown>, allowedValues: Array<Record<string, unknown>>, currentValue: Record<string, unknown>|null}} props - Popover props.
 * @returns {import("react").JSX.Element} Field help popover.
 */
function TaxonomyFieldHelpPopover({ field, allowedValues, currentValue }) {
  return (
    <div className="tf-taxonomy-field-popover" role="tooltip">
      <p className="tf-eyebrow">Field details</p>
      <h4>{field.label ?? field.field}</h4>
      {field.description ? <p>{String(field.description)}</p> : null}
      {currentValue ? (
        <div className="tf-taxonomy-field-popover__current">
          <span>Current value</span>
          <strong>{currentValue.label ?? currentValue.id}</strong>
          <small>Raw value: {currentValue.id}</small>
        </div>
      ) : null}
      {allowedValues.length > 0 ? (
        <>
          <h5>Allowed values</h5>
          <ul className="tf-taxonomy-field-popover__values">
            {allowedValues.map((value) => <TaxonomyFieldAllowedValue key={value.id} value={value} />)}
          </ul>
        </>
      ) : (
        <p>No allowed values are available for this field.</p>
      )}
      <dl className="tf-taxonomy-field-popover__meta">
        {field.source_taxonomy ? <div><dt>Source taxonomy</dt><dd>{String(field.source_taxonomy)}</dd></div> : null}
        {field.source ? <div><dt>Source</dt><dd>{String(field.source)}</dd></div> : null}
      </dl>
    </div>
  );
}

/**
 * Render current value for one controlled document field while keeping allowed values available on demand.
 *
 * @param {{field: Record<string, unknown>}} props - Field explanation props.
 * @returns {import("react").JSX.Element} Compact field explanation card.
 */
function TaxonomyFieldCard({ field }) {
  const allowedValues = Array.isArray(field.allowed_values) ? field.allowed_values : [];
  const currentValue = field.current_value && typeof field.current_value === "object" ? field.current_value : null;

  return (
    <article className="tf-taxonomy-field-card">
      <div className="tf-taxonomy-field-card__main">
        <span className="tf-taxonomy-field-card__label">{field.label ?? field.field}</span>
        <span className="tf-taxonomy-field-card__value">{currentValue?.label ?? currentValue?.id ?? "No current value"}</span>
      </div>
      <InfoPopover
        id={`taxonomy-field-${field.field ?? "field"}`}
        ariaLabel={`Show allowed values for ${field.label ?? field.field}`}
      >
        <TaxonomyFieldHelpPopover field={field} allowedValues={allowedValues} currentValue={currentValue} />
      </InfoPopover>
    </article>
  );
}
/**
 * Render taxonomy-backed field explanations for selected documentation details.
 *
 * @param {{fields?: Array<Record<string, unknown>>}} props - Field explanation props.
 * @returns {import("react").JSX.Element|null} Field explanation section.
 */
function TaxonomyFieldsDetail({ fields }) {
  const normalized = Array.isArray(fields) ? fields : [];
  if (normalized.length === 0) return null;

  return (
    <Card>
      <p className="tf-eyebrow">Taxonomy fields</p>
      <h3>Current values and allowed values</h3>
      <p>
        These fields use controlled values supplied by the backend view-model. The page stays compact by showing the
        current value first; use the information icon to inspect allowed values and their meaning on demand.
      </p>
      <div className="tf-taxonomy-fields-list">
        {normalized.map((field) => <TaxonomyFieldCard key={field.field} field={field} />)}
      </div>
    </Card>
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
    ["Taxonomy values", item.taxonomy_value_count],
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
      <TaxonomyDetail taxonomy={detail.taxonomy} />
      <TaxonomyFieldsDetail fields={detail.taxonomy_fields} />
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
export function ProjectDocumentationExplorerPage({ client, context, onBack }) {
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
        <div className="tf-page-title__actions">
          <div className="tf-count-pill">{filteredItems.length} / {model.summary?.total_items ?? model.items.length} items</div>
          {typeof onBack === "function" ? <Button onClick={onBack}><Icon token="action.back" /> Back</Button> : null}
        </div>
      </div>

      {context ? (
        <Card className="tf-documentation-context-card">
          <p className="tf-eyebrow">Documentation context</p>
          <strong>{context.label ?? "Project Model"}</strong>
          <p>{context.description ?? "Selected Project Documentation Explorer source."}</p>
        </Card>
      ) : null}

      <DataSourceStatus dataSource={model.data_source ?? client.describeDataSource?.()} />

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

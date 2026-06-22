#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProjectDocumentationExplorerModule } from "./project-documentation-explorer.module.mjs";

/**
 * @file Static renderer for the Project Documentation Explorer validation prototype.
 *
 * @implementsRequirement MR-0002REQ-0026
 * @implementsRequirement MR-0002REQ-0030
 * @implementsRequirement MR-0002REQ-0031
 * @implementsRequirement MR-0002REQ-0035
 * @implementsRequirement MR-0002REQ-0036
 * @implementsRequirement MR-0002REQ-0037
 * @implementsRequirement MR-0002REQ-0038
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0007
 * @derivedFromDecision MR-0002/ADR-0008
 * @derivedFromDecision MR-0002/ADR-0009
 * @macroRequirement MR-0002
 *
 * This renderer generates a local static preview from the governed backend
 * Project Documentation Explorer module. It keeps filters in the top area, shows
 * a list as the default view, and opens a full-width detail view below the
 * filters. The detail view shows registry metadata first and the governed
 * Markdown body returned by the backend detail view-model underneath.
 *
 * Side effects: reads project-model data through the module composition root and
 * writes artifacts/project-documentation-explorer/index.html. It does not mutate
 * governed documentation, start an HTTP server, implement authentication, read
 * YAML/Markdown/Git/filesystem data from browser code, implement dynamic RBAC,
 * or implement Base Analysis runtime/storage/API.
 */

const scriptPath = fileURLToPath(import.meta.url);
const defaultRootDir = path.resolve(path.dirname(scriptPath), "..", "..", "..", "..");
const rootDir = process.env.TF_REPOSITORY_ROOT ? path.resolve(process.env.TF_REPOSITORY_ROOT) : defaultRootDir;
const outputDir = process.env.TF_PROJECT_DOCUMENTATION_EXPLORER_PROTOTYPE_DIR
  ? path.resolve(process.env.TF_PROJECT_DOCUMENTATION_EXPLORER_PROTOTYPE_DIR)
  : path.join(rootDir, "artifacts", "project-documentation-explorer");
const outputPath = path.join(outputDir, "index.html");

/**
 * Escapes text for safe HTML text-node rendering.
 *
 * @param {unknown} value - Value to escape.
 * @returns {string} Escaped text.
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Escapes a JSON payload so it can be embedded inside a script tag.
 *
 * @param {unknown} value - JSON-serializable value.
 * @returns {string} Escaped JSON string.
 */
function escapeJsonForScript(value) {
  return JSON.stringify(value, null, 2).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
}

/**
 * Creates the static prototype HTML document.
 *
 * @param {Record<string, unknown>} collection - Documentation explorer collection view-model.
 * @param {Record<string, unknown>} detailsById - Detail view-models keyed by entity id.
 * @param {Record<string, unknown>} metadata - Generation metadata.
 * @returns {string} HTML document.
 */
function renderHtml(collection, detailsById, metadata) {
  const title = "Project Documentation Explorer Prototype";
  const payload = { collection, detailsById, metadata };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --tf-bg: #ffffff;
      --tf-panel: #f7f7f7;
      --tf-border: #d9d9d9;
      --tf-text: #111111;
      --tf-muted: #666666;
      --tf-strong: #000000;
      --tf-hover: #eeeeee;
      --tf-selected: #e8e8e8;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--tf-bg);
      color: var(--tf-text);
      font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    header {
      border-bottom: 1px solid var(--tf-border);
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
    }

    h1 {
      margin: 0;
      font-size: 20px;
      letter-spacing: -0.02em;
    }

    h2 {
      margin: 0 0 10px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--tf-muted);
    }

    h3 {
      margin: 0 0 8px;
      font-size: 16px;
    }

    .subtle { color: var(--tf-muted); }

    .shell {
      display: block;
      min-height: calc(100vh - 76px);
    }

    aside {
      min-width: 0;
      border-bottom: 1px solid var(--tf-border);
      background: var(--tf-panel);
      padding: 16px 24px;
      position: sticky;
      top: 0;
      z-index: 2;
    }

    main, section.detail {
      min-width: 0;
      padding: 20px 24px;
      max-width: 1280px;
      margin: 0 auto;
      width: 100%;
    }

    section.detail {
      background: var(--tf-bg);
    }

    .hidden { display: none !important; }

    .status-line {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
    }

    .pill {
      border: 1px solid var(--tf-border);
      border-radius: 999px;
      padding: 4px 8px;
      background: #fff;
      color: var(--tf-text);
      font-size: 12px;
      white-space: nowrap;
    }

    .toolbar {
      display: grid;
      grid-template-columns: minmax(220px, 2fr) repeat(5, minmax(140px, 1fr)) auto;
      gap: 12px;
      align-items: end;
    }

    label {
      display: grid;
      gap: 5px;
      font-size: 12px;
      color: var(--tf-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    input, select {
      width: 100%;
      border: 1px solid var(--tf-border);
      background: #fff;
      color: var(--tf-text);
      padding: 8px 9px;
      border-radius: 6px;
      font: inherit;
      text-transform: none;
      letter-spacing: normal;
    }

    button {
      border: 1px solid var(--tf-border);
      background: #fff;
      color: var(--tf-text);
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      font: inherit;
    }

    button:hover, .row:hover { background: var(--tf-hover); }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }

    .stat, .row, .detail-card {
      border: 1px solid var(--tf-border);
      border-radius: 8px;
      background: #fff;
    }

    .stat { padding: 12px; }
    .stat strong { display: block; font-size: 22px; }

    .list {
      display: grid;
      gap: 8px;
    }

    .row {
      padding: 12px;
      cursor: pointer;
      display: grid;
      grid-template-columns: minmax(180px, 260px) minmax(260px, 1fr) repeat(3, minmax(120px, 160px));
      gap: 10px;
      align-items: start;
    }

    .row strong {
      display: block;
      color: var(--tf-strong);
      overflow-wrap: anywhere;
    }

    .row small {
      color: var(--tf-muted);
      display: block;
    }

    .view-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }

    .detail-card {
      padding: 14px;
      margin-bottom: 12px;
      overflow-wrap: anywhere;
    }

    dl {
      display: grid;
      grid-template-columns: 180px minmax(0, 1fr);
      gap: 6px 12px;
      margin: 0;
    }

    dt {
      color: var(--tf-muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    dd { margin: 0; min-width: 0; }

    pre.markdown-body {
      margin: 0;
      padding: 14px;
      border: 1px solid var(--tf-border);
      border-radius: 8px;
      background: #fff;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    }

    .empty {
      color: var(--tf-muted);
      border: 1px dashed var(--tf-border);
      border-radius: 8px;
      padding: 14px;
      background: #fff;
    }

    @media (max-width: 1120px) {
      .toolbar { grid-template-columns: repeat(2, minmax(180px, 1fr)); }
    }

    @media (max-width: 780px) {
      header { display: block; }
      .status-line { justify-content: flex-start; margin-top: 12px; }
      aside, main, section.detail { padding: 16px; }
      .toolbar { grid-template-columns: 1fr; }
      .row { grid-template-columns: 1fr; }
      .stats { grid-template-columns: 1fr; }
      .view-header { display: block; }
      .view-header button { margin-top: 12px; width: 100%; }
      dl { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${escapeHtml(title)}</h1>
      <div class="subtle">Filters remain on top. Selecting a record opens registry metadata and governed Markdown body below.</div>
    </div>
    <div class="status-line" id="status-line"></div>
  </header>

  <div class="shell">
    <aside>
      <h2>Filters</h2>
      <div class="toolbar" id="filters"></div>
    </aside>

    <main id="list-view">
      <div class="view-header">
        <div>
          <h2>Documentation entities</h2>
          <div class="subtle">Select one record to open a focused read-only detail view.</div>
        </div>
      </div>
      <div class="stats" id="stats"></div>
      <div class="list" id="list"></div>
    </main>

    <section class="detail hidden" id="detail-view">
      <div class="view-header">
        <div>
          <h2>Selected entity</h2>
          <div class="subtle">Registry data appears first; governed Markdown body appears underneath when present.</div>
        </div>
        <button type="button" id="back-to-list">Back to list</button>
      </div>
      <div id="detail"></div>
    </section>
  </div>

  <script id="project-documentation-explorer-payload" type="application/json">${escapeJsonForScript(payload)}</script>
  <script>
    const payload = JSON.parse(document.getElementById("project-documentation-explorer-payload").textContent);
    const model = payload.collection;
    const detailsById = payload.detailsById;
    const metadata = payload.metadata;
    const state = {
      q: "",
      selectedId: "",
      filters: {
        mr: "",
        kind: "",
        status: "",
        requirement_type: "",
        implementation_state: "",
        acceptance_state: ""
      }
    };

    function escapeText(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    function matches(item) {
      const text = [item.id, item.title, item.macro_requirement_id, item.status, item.requirement_type, item.implementation_state, item.acceptance_state]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");
      if (state.q && !text.includes(state.q.toLowerCase())) return false;
      return Object.entries(state.filters).every(([key, value]) => !value || String(item[key] ?? "") === value);
    }

    function filteredItems() {
      return model.items.filter(matches);
    }

    function renderStatusLine() {
      document.getElementById("status-line").innerHTML = [
        \`<span class="pill">generated: \${escapeText(metadata.generated_at)}</span>\`,
        \`<span class="pill">items: \${escapeText(model.summary.total_items)}</span>\`,
        \`<span class="pill">capability: \${escapeText(model.access.required_capability)}</span>\`
      ].join("");
    }

    function optionsFor(facetId) {
      const facet = model.filters.find((candidate) => candidate.id === facetId);
      return facet?.values ?? [];
    }

    function renderSelect(facetId, label) {
      const options = optionsFor(facetId);
      return \`<label>\${escapeText(label)}<select data-filter="\${escapeText(facetId)}"><option value="">All</option>\${options
        .map((option) => \`<option value="\${escapeText(option.value)}" \${state.filters[facetId] === option.value ? "selected" : ""}>\${escapeText(option.label)} (\${escapeText(option.count)})</option>\`)
        .join("")}</select></label>\`;
    }

    function renderFilters() {
      document.getElementById("filters").innerHTML = [
        \`<label>Search<input id="search" value="\${escapeText(state.q)}" placeholder="id, title, MR, status"></label>\`,
        renderSelect("mr", "MR"),
        renderSelect("kind", "Kind"),
        renderSelect("status", "Status"),
        renderSelect("implementation_state", "Implementation"),
        renderSelect("acceptance_state", "Acceptance"),
        \`<button type="button" id="reset">Reset</button>\`
      ].join("");

      document.getElementById("search").addEventListener("input", (event) => {
        state.q = event.target.value;
        state.selectedId = "";
        render();
      });
      document.querySelectorAll("select[data-filter]").forEach((select) => {
        select.addEventListener("change", (event) => {
          state.filters[event.target.dataset.filter] = event.target.value;
          state.selectedId = "";
          render();
        });
      });
      document.getElementById("reset").addEventListener("click", () => {
        state.q = "";
        Object.keys(state.filters).forEach((key) => { state.filters[key] = ""; });
        state.selectedId = "";
        render();
      });
    }

    function renderStats(items) {
      const counts = items.reduce((acc, item) => {
        acc[item.kind] = (acc[item.kind] ?? 0) + 1;
        return acc;
      }, {});
      document.getElementById("stats").innerHTML = [
        \`<div class="stat"><strong>\${escapeText(items.length)}</strong><span class="subtle">Filtered items</span></div>\`,
        \`<div class="stat"><strong>\${escapeText(Object.keys(counts).length)}</strong><span class="subtle">Kinds in result</span></div>\`,
        \`<div class="stat"><strong>\${escapeText(model.filters.length)}</strong><span class="subtle">Backend facets</span></div>\`
      ].join("");
    }

    function renderList(items) {
      if (items.length === 0) {
        document.getElementById("list").innerHTML = \`<div class="empty">No documentation entities match the current filters.</div>\`;
        return;
      }
      document.getElementById("list").innerHTML = items.map((item) => \`
        <article class="row" data-id="\${escapeText(item.id)}">
          <div><strong>\${escapeText(item.id)}</strong><small>\${escapeText(item.kind)}</small></div>
          <div><strong>\${escapeText(item.title)}</strong><small>\${escapeText(item.macro_requirement_id || "")}</small></div>
          <div><small>Status</small>\${escapeText(item.status || "")}</div>
          <div><small>Implementation</small>\${escapeText(item.implementation_state)}</div>
          <div><small>Acceptance</small>\${escapeText(item.acceptance_state)}</div>
        </article>
      \`).join("");
      document.querySelectorAll(".row[data-id]").forEach((row) => {
        row.addEventListener("click", () => {
          state.selectedId = row.dataset.id;
          render();
        });
      });
    }

    function renderMetadata(item) {
      const rows = [
        ["ID", item.id],
        ["Title", item.title],
        ["Kind", item.kind],
        ["Macro requirement", item.macro_requirement_id || ""],
        ["Status", item.status || ""],
        ["Requirement type", item.requirement_type || ""],
        ["Implementation", item.implementation_state],
        ["Acceptance", item.acceptance_state],
        ["Source references", (item.source_references || []).map((ref) => \`\${ref.kind}: \${ref.path || ref.id || ""}\`).join("\\n")]
      ];
      return \`<div class="detail-card"><h3>Registry data</h3><dl>\${rows.map(([key, value]) => \`<dt>\${escapeText(key)}</dt><dd>\${escapeText(value)}</dd>\`).join("")}</dl></div>\`;
    }

    function renderBody(detail) {
      const body = detail?.body;
      if (!body) return \`<div class="detail-card"><h3>Body</h3><div class="empty">No governed body path is associated with this entity.</div></div>\`;
      if (!body.available) return \`<div class="detail-card"><h3>Body</h3><div class="empty">Body not available: \${escapeText(body.missing_reason || "unknown")}</div></div>\`;
      return \`<div class="detail-card"><h3>Body</h3><div class="subtle">\${escapeText(body.path)}</div></div><pre class="markdown-body">\${escapeText(body.content_markdown)}</pre>\`;
    }

    function renderRelations(title, relations) {
      if (!relations || relations.length === 0) return "";
      return \`<div class="detail-card"><h3>\${escapeText(title)}</h3>\${relations.map((relation) => \`<div>\${escapeText(relation.subject)} — \${escapeText(relation.predicate)} → \${escapeText(relation.object)}</div>\`).join("")}</div>\`;
    }

    function renderDetail(items) {
      const item = items.find((candidate) => candidate.id === state.selectedId);
      if (!item) {
        document.getElementById("detail").innerHTML = \`<div class="empty">No entity selected.</div>\`;
        return;
      }
      const detail = detailsById[item.id] || { item, body: null, incoming_relations: [], outgoing_relations: [] };
      document.getElementById("detail").innerHTML = [
        renderMetadata(item),
        renderBody(detail),
        renderRelations("Outgoing graph relations", detail.outgoing_relations),
        renderRelations("Incoming graph relations", detail.incoming_relations)
      ].join("");
    }

    function render() {
      const items = filteredItems();
      const hasSelection = Boolean(state.selectedId && items.some((item) => item.id === state.selectedId));
      renderStatusLine();
      renderFilters();
      document.getElementById("list-view").classList.toggle("hidden", hasSelection);
      document.getElementById("detail-view").classList.toggle("hidden", !hasSelection);
      if (hasSelection) {
        renderDetail(items);
        document.getElementById("back-to-list").onclick = () => {
          state.selectedId = "";
          render();
        };
      } else {
        renderStats(items);
        renderList(items);
      }
    }

    render();
  </script>
</body>
</html>`;
}

const principal = { authenticated: true, role: "registered_user" };
const module = createProjectDocumentationExplorerModule({ rootDir });
const collection = await module.controller.listDocumentation({ principal, query: {} });
const detailsById = {};

for (const item of collection.items) {
  detailsById[item.id] = await module.controller.getDocumentationEntity({ principal, id: item.id });
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, renderHtml(collection, detailsById, {
  generated_at: new Date().toISOString(),
  root_dir: rootDir,
}), "utf8");

console.log(`Project Documentation Explorer prototype generated: ${outputPath}`);
console.log(`Items: ${collection.summary.total_items}`);
console.log(`Details with body: ${Object.values(detailsById).filter((detail) => detail.body?.available).length}`);

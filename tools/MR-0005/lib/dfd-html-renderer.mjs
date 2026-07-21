/**
 * @file Deterministic static HTML and SVG DFD renderer.
 *
 * @implementsRequirement MR-0005ADR-0001REQ-0003
 * @derivedFromDecision MR-0005/ADR-0001
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Renders one valid renderer-neutral DFD semantic projection as a self-contained
 * static HTML document containing an embedded SVG diagram and accessible
 * traceability metadata.
 *
 * The renderer does not read or write files, interpret BAE meaning, alter
 * canonical records or add layout information to the semantic projection.
 */

const NODE_ROLES = new Set([
  "external_entity",
  "process",
  "data_store",
]);

const FORBIDDEN_SEMANTIC_MEMBERS = new Set([
  "x",
  "y",
  "width",
  "height",
  "position",
  "coordinates",
  "layout",
  "style",
  "styles",
  "color",
  "fill",
  "stroke",
  "class",
  "className",
  "html",
  "svg",
]);

const LAYOUT = Object.freeze({
  minimumWidth: 1100,
  marginX: 72,
  headerHeight: 130,
  footerSpace: 80,
  nodeWidth: 240,
  nodeHeight: 104,
  nodeGapX: 120,
  nodeGapY: 150,
  maximumColumns: 4,
});

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isRecord(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {Record<string, unknown>}
 */
function requireRecord(value, label) {
  if (!isRecord(value)) {
    throw new Error(`${label} must be a mapping.`);
  }

  return value;
}

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {unknown[]}
 */
function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be a list.`);
  }

  return value;
}

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {string}
 */
function requireSingleLine(value, label) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  if (/\r|\n/u.test(normalized)) {
    throw new Error(`${label} must be a single-line string.`);
  }

  return normalized;
}

/**
 * @param {unknown} left
 * @param {unknown} right
 * @returns {number}
 */
function compare(left, right) {
  const first = String(left);
  const second = String(right);

  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}

/**
 * @param {unknown} value
 * @returns {string}
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
 * Rejects renderer-owned members anywhere inside the semantic projection.
 *
 * @param {unknown} value
 * @param {string} location
 * @returns {void}
 */
function rejectRendererMembers(value, location = "projection") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      rejectRendererMembers(entry, `${location}[${index}]`);
    });
    return;
  }

  if (!isRecord(value)) return;

  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_SEMANTIC_MEMBERS.has(key)) {
      throw new Error(
        `${location} contains renderer-owned member ${key}.`,
      );
    }

    rejectRendererMembers(entry, `${location}.${key}`);
  }
}

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {string[]}
 */
function normalizeIdentityList(value, label) {
  const identities = requireArray(value, label).map(
    (entry, index) =>
      requireSingleLine(entry, `${label}[${index}]`),
  );

  if (new Set(identities).size !== identities.length) {
    throw new Error(`${label} must not contain duplicate identities.`);
  }

  return [...identities].sort(compare);
}

/**
 * @param {Record<string, unknown>[]} records
 * @param {string} label
 * @returns {void}
 */
function requireUniqueRecordIds(records, label) {
  const identities = records.map((record) => record.id);

  if (new Set(identities).size !== identities.length) {
    throw new Error(`${label} contains duplicate identities.`);
  }
}

/**
 * @param {unknown} value
 * @param {number} index
 * @returns {Record<string, unknown>}
 */
function normalizeNode(value, index) {
  const node = requireRecord(value, `projection.nodes[${index}]`);
  const role = requireSingleLine(
    node.role,
    `projection.nodes[${index}].role`,
  );

  if (!NODE_ROLES.has(role)) {
    throw new Error(
      `projection.nodes[${index}].role is unsupported: ${role}.`,
    );
  }

  return {
    id: requireSingleLine(
      node.id,
      `projection.nodes[${index}].id`,
    ),
    role,
    title: requireSingleLine(
      node.title,
      `projection.nodes[${index}].title`,
    ),
    contributing_bae_ids: normalizeIdentityList(
      node.contributing_bae_ids,
      `projection.nodes[${index}].contributing_bae_ids`,
    ),
    contributing_relation_ids: normalizeIdentityList(
      node.contributing_relation_ids,
      `projection.nodes[${index}].contributing_relation_ids`,
    ),
  };
}

/**
 * @param {unknown} value
 * @param {number} index
 * @returns {Record<string, unknown>}
 */
function normalizeFlow(value, index) {
  const flow = requireRecord(value, `projection.flows[${index}]`);

  return {
    id: requireSingleLine(
      flow.id,
      `projection.flows[${index}].id`,
    ),
    title: requireSingleLine(
      flow.title,
      `projection.flows[${index}].title`,
    ),
    source_node_id: requireSingleLine(
      flow.source_node_id,
      `projection.flows[${index}].source_node_id`,
    ),
    target_node_id: requireSingleLine(
      flow.target_node_id,
      `projection.flows[${index}].target_node_id`,
    ),
    crossed_boundary_ids: normalizeIdentityList(
      flow.crossed_boundary_ids,
      `projection.flows[${index}].crossed_boundary_ids`,
    ),
    contributing_bae_ids: normalizeIdentityList(
      flow.contributing_bae_ids,
      `projection.flows[${index}].contributing_bae_ids`,
    ),
    contributing_relation_ids: normalizeIdentityList(
      flow.contributing_relation_ids,
      `projection.flows[${index}].contributing_relation_ids`,
    ),
  };
}

/**
 * @param {unknown} value
 * @param {number} index
 * @returns {Record<string, unknown>}
 */
function normalizeBoundary(value, index) {
  const boundary = requireRecord(
    value,
    `projection.boundaries[${index}]`,
  );

  return {
    id: requireSingleLine(
      boundary.id,
      `projection.boundaries[${index}].id`,
    ),
    title: requireSingleLine(
      boundary.title,
      `projection.boundaries[${index}].title`,
    ),
    contributing_bae_ids: normalizeIdentityList(
      boundary.contributing_bae_ids,
      `projection.boundaries[${index}].contributing_bae_ids`,
    ),
    contributing_relation_ids: normalizeIdentityList(
      boundary.contributing_relation_ids,
      `projection.boundaries[${index}].contributing_relation_ids`,
    ),
  };
}

/**
 * @param {unknown} value
 * @param {number} index
 * @returns {Record<string, unknown>}
 */
function normalizeUnprojectedBae(value, index) {
  const record = requireRecord(
    value,
    `projection.unprojected_baes[${index}]`,
  );

  return {
    bae_id: requireSingleLine(
      record.bae_id,
      `projection.unprojected_baes[${index}].bae_id`,
    ),
    title: requireSingleLine(
      record.title,
      `projection.unprojected_baes[${index}].title`,
    ),
    reason: requireSingleLine(
      record.reason,
      `projection.unprojected_baes[${index}].reason`,
    ),
  };
}

/**
 * Creates a detached normalized representation without mutating the input.
 *
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function normalizeProjection(value) {
  rejectRendererMembers(value);

  const projection = requireRecord(value, "projection");
  const source = requireRecord(projection.source, "projection.source");
  const schemaVersion = Number(projection.schema_version);

  if (
    !Number.isInteger(schemaVersion) ||
    schemaVersion < 1
  ) {
    throw new Error(
      "projection.schema_version must be a positive integer.",
    );
  }

  const normalized = {
    schema_version: schemaVersion,
    projection_id: requireSingleLine(
      projection.projection_id,
      "projection.projection_id",
    ),
    source: {
      registry_id: requireSingleLine(
        source.registry_id,
        "projection.source.registry_id",
      ),
      registry_path: requireSingleLine(
        source.registry_path,
        "projection.source.registry_path",
      ),
    },
    nodes: requireArray(
      projection.nodes,
      "projection.nodes",
    )
      .map(normalizeNode)
      .sort((left, right) => compare(left.id, right.id)),
    flows: requireArray(
      projection.flows,
      "projection.flows",
    )
      .map(normalizeFlow)
      .sort((left, right) => compare(left.id, right.id)),
    boundaries: requireArray(
      projection.boundaries,
      "projection.boundaries",
    )
      .map(normalizeBoundary)
      .sort((left, right) => compare(left.id, right.id)),
    unprojected_baes: requireArray(
      projection.unprojected_baes,
      "projection.unprojected_baes",
    )
      .map(normalizeUnprojectedBae)
      .sort((left, right) =>
        compare(left.bae_id, right.bae_id)
      ),
  };

  requireUniqueRecordIds(normalized.nodes, "projection.nodes");
  requireUniqueRecordIds(normalized.flows, "projection.flows");
  requireUniqueRecordIds(
    normalized.boundaries,
    "projection.boundaries",
  );

  const nodeIds = new Set(
    normalized.nodes.map((node) => node.id),
  );
  const boundaryIds = new Set(
    normalized.boundaries.map((boundary) => boundary.id),
  );

  for (const flow of normalized.flows) {
    if (!nodeIds.has(flow.source_node_id)) {
      throw new Error(
        `Flow ${flow.id} references unknown source node ${flow.source_node_id}.`,
      );
    }

    if (!nodeIds.has(flow.target_node_id)) {
      throw new Error(
        `Flow ${flow.id} references unknown target node ${flow.target_node_id}.`,
      );
    }

    for (const boundaryId of flow.crossed_boundary_ids) {
      if (!boundaryIds.has(boundaryId)) {
        throw new Error(
          `Flow ${flow.id} references unknown boundary ${boundaryId}.`,
        );
      }
    }
  }

  return normalized;
}

/**
 * @param {string} value
 * @param {number} maximumLength
 * @returns {string[]}
 */
function wrapLabel(value, maximumLength = 28) {
  const words = String(value).trim().split(/\s+/u);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (
      candidate.length <= maximumLength ||
      current.length === 0
    ) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) lines.push(current);

  if (lines.length <= 2) return lines;

  const second = lines.slice(1).join(" ");
  const shortened =
    second.length > maximumLength - 1
      ? `${second.slice(0, maximumLength - 2).trimEnd()}…`
      : second;

  return [lines[0], shortened];
}

/**
 * @param {string[]} identities
 * @returns {string}
 */
function identityAttribute(identities) {
  return escapeHtml(identities.join(","));
}

/**
 * @param {Record<string, unknown>} record
 * @returns {string}
 */
function traceAttributes(record) {
  return [
    `data-contributing-bae-ids="${identityAttribute(
      record.contributing_bae_ids ?? [],
    )}"`,
    `data-contributing-relation-ids="${identityAttribute(
      record.contributing_relation_ids ?? [],
    )}"`,
  ].join(" ");
}

/**
 * @param {Record<string, unknown>[]} nodes
 * @returns {{
 *   width: number,
 *   height: number,
 *   positions: Map<string, {
 *     x: number,
 *     y: number,
 *     centerX: number,
 *     centerY: number
 *   }>
 * }}
 */
function createLayout(nodes) {
  const nodeCount = nodes.length;
  const columns =
    nodeCount === 0
      ? 1
      : Math.min(
          LAYOUT.maximumColumns,
          nodeCount <= LAYOUT.maximumColumns
            ? nodeCount
            : Math.ceil(Math.sqrt(nodeCount)),
        );

  const rows = Math.max(1, Math.ceil(nodeCount / columns));

  const calculatedWidth =
    LAYOUT.marginX * 2 +
    columns * LAYOUT.nodeWidth +
    Math.max(0, columns - 1) * LAYOUT.nodeGapX;

  const width = Math.max(
    LAYOUT.minimumWidth,
    calculatedWidth,
  );

  const height =
    LAYOUT.headerHeight +
    rows * LAYOUT.nodeHeight +
    Math.max(0, rows - 1) * LAYOUT.nodeGapY +
    LAYOUT.footerSpace;

  const positions = new Map();

  for (let row = 0; row < rows; row += 1) {
    const start = row * columns;
    const rowNodes = nodes.slice(start, start + columns);
    const usableWidth =
      width - 2 * LAYOUT.marginX - LAYOUT.nodeWidth;

    rowNodes.forEach((node, column) => {
      const centerX =
        rowNodes.length === 1
          ? width / 2
          : LAYOUT.marginX +
            LAYOUT.nodeWidth / 2 +
            column * (usableWidth / (rowNodes.length - 1));

      const y =
        LAYOUT.headerHeight +
        row * (LAYOUT.nodeHeight + LAYOUT.nodeGapY);

      positions.set(node.id, {
        x: centerX - LAYOUT.nodeWidth / 2,
        y,
        centerX,
        centerY: y + LAYOUT.nodeHeight / 2,
      });
    });
  }

  return {
    width,
    height,
    positions,
  };
}

/**
 * @param {{centerX: number, centerY: number}} source
 * @param {{centerX: number, centerY: number}} target
 * @returns {{x1: number, y1: number, x2: number, y2: number}}
 */
function calculateFlowAnchors(source, target) {
  const deltaX = target.centerX - source.centerX;
  const deltaY = target.centerY - source.centerY;

  if (deltaX === 0 && deltaY === 0) {
    return {
      x1: source.centerX,
      y1: source.centerY,
      x2: target.centerX,
      y2: target.centerY,
    };
  }

  const halfWidth = LAYOUT.nodeWidth / 2;
  const halfHeight = LAYOUT.nodeHeight / 2;

  const horizontalScale =
    deltaX === 0
      ? Number.POSITIVE_INFINITY
      : halfWidth / Math.abs(deltaX);

  const verticalScale =
    deltaY === 0
      ? Number.POSITIVE_INFINITY
      : halfHeight / Math.abs(deltaY);

  const scale = Math.min(horizontalScale, verticalScale);

  return {
    x1: source.centerX + deltaX * scale,
    y1: source.centerY + deltaY * scale,
    x2: target.centerX - deltaX * scale,
    y2: target.centerY - deltaY * scale,
  };
}

/**
 * @param {Record<string, unknown>} boundary
 * @param {number} index
 * @param {number} count
 * @param {{width: number, height: number}} layout
 * @returns {string}
 */
function renderBoundary(boundary, index, count, layout) {
  const usableWidth = layout.width - 2 * LAYOUT.marginX;
  const x =
    LAYOUT.marginX +
    ((index + 1) * usableWidth) / (count + 1);

  return [
    `<g class="dfd-boundary"`,
    ` data-dfd-element-id="${escapeHtml(boundary.id)}"`,
    ` ${traceAttributes(boundary)}>`,
    `<title>${escapeHtml(boundary.title)} — ${escapeHtml(
      boundary.id,
    )}</title>`,
    `<line x1="${x}" y1="94" x2="${x}" y2="${
      layout.height - 36
    }" />`,
    `<text x="${x + 10}" y="112">${escapeHtml(
      boundary.title,
    )}</text>`,
    `<text class="identity" x="${x + 10}" y="132">${escapeHtml(
      boundary.id,
    )}</text>`,
    `</g>`,
  ].join("");
}

/**
 * @param {Record<string, unknown>} node
 * @param {{x: number, y: number, centerX: number, centerY: number}} position
 * @returns {string}
 */
function renderNode(node, position) {
  const titleLines = wrapLabel(node.title);
  const titleStartY =
    position.y + 47 - ((titleLines.length - 1) * 9);

  const title = titleLines
    .map(
      (line, index) =>
        `<tspan x="${position.centerX}" dy="${
          index === 0 ? 0 : 19
        }">${escapeHtml(line)}</tspan>`,
    )
    .join("");

  const dataStoreDecoration =
    node.role === "data_store"
      ? [
          `<line class="data-store-line"`,
          ` x1="${position.x + 14}"`,
          ` y1="${position.y + 17}"`,
          ` x2="${position.x + LAYOUT.nodeWidth - 14}"`,
          ` y2="${position.y + 17}" />`,
          `<line class="data-store-line"`,
          ` x1="${position.x + 14}"`,
          ` y1="${position.y + LAYOUT.nodeHeight - 17}"`,
          ` x2="${position.x + LAYOUT.nodeWidth - 14}"`,
          ` y2="${position.y + LAYOUT.nodeHeight - 17}" />`,
        ].join("")
      : "";

  return [
    `<g class="dfd-node role-${escapeHtml(node.role)}"`,
    ` data-dfd-element-id="${escapeHtml(node.id)}"`,
    ` data-dfd-role="${escapeHtml(node.role)}"`,
    ` ${traceAttributes(node)}>`,
    `<title>${escapeHtml(node.title)} — ${escapeHtml(
      node.id,
    )}</title>`,
    `<rect x="${position.x}" y="${position.y}"`,
    ` width="${LAYOUT.nodeWidth}"`,
    ` height="${LAYOUT.nodeHeight}" rx="${
      node.role === "process" ? 28 : 8
    }" />`,
    dataStoreDecoration,
    `<text class="role" x="${position.centerX}"`,
    ` y="${position.y + 20}">${escapeHtml(
      node.role.replaceAll("_", " "),
    )}</text>`,
    `<text class="title" x="${position.centerX}"`,
    ` y="${titleStartY}">${title}</text>`,
    `<text class="identity" x="${position.centerX}"`,
    ` y="${position.y + LAYOUT.nodeHeight - 11}">${escapeHtml(
      node.id,
    )}</text>`,
    `</g>`,
  ].join("");
}

/**
 * @param {Record<string, unknown>} flow
 * @param {Map<string, Record<string, number>>} positions
 * @returns {string}
 */
function renderFlow(flow, positions) {
  const source = positions.get(flow.source_node_id);
  const target = positions.get(flow.target_node_id);

  const anchors = calculateFlowAnchors(source, target);
  const labelX = (anchors.x1 + anchors.x2) / 2;
  const labelY = (anchors.y1 + anchors.y2) / 2 - 12;
  const labelWidth = Math.max(
    120,
    Math.min(300, flow.title.length * 7 + 28),
  );

  return [
    `<g class="dfd-flow"`,
    ` data-dfd-element-id="${escapeHtml(flow.id)}"`,
    ` data-source-node-id="${escapeHtml(flow.source_node_id)}"`,
    ` data-target-node-id="${escapeHtml(flow.target_node_id)}"`,
    ` data-crossed-boundary-ids="${identityAttribute(
      flow.crossed_boundary_ids,
    )}"`,
    ` ${traceAttributes(flow)}>`,
    `<title>${escapeHtml(flow.title)} — ${escapeHtml(
      flow.id,
    )}</title>`,
    `<line x1="${anchors.x1}" y1="${anchors.y1}"`,
    ` x2="${anchors.x2}" y2="${anchors.y2}"`,
    ` marker-end="url(#dfd-arrow)" />`,
    `<rect class="flow-label-background"`,
    ` x="${labelX - labelWidth / 2}"`,
    ` y="${labelY - 17}"`,
    ` width="${labelWidth}" height="38" rx="7" />`,
    `<text class="flow-title" x="${labelX}" y="${labelY}">${escapeHtml(
      flow.title,
    )}</text>`,
    `<text class="flow-identity" x="${labelX}"`,
    ` y="${labelY + 14}">${escapeHtml(flow.id)}</text>`,
    `</g>`,
  ].join("");
}

/**
 * @param {string[]} values
 * @returns {string}
 */
function renderIdentityList(values) {
  if (values.length === 0) {
    return '<span class="empty">none</span>';
  }

  return values
    .map((value) => `<code>${escapeHtml(value)}</code>`)
    .join(" ");
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} kind
 * @returns {string}
 */
function renderTraceCard(record, kind) {
  const identity = record.id ?? record.bae_id;
  const relationSection =
    kind === "unprojected"
      ? ""
      : [
          `<dt>BAE identities</dt>`,
          `<dd>${renderIdentityList(
            record.contributing_bae_ids,
          )}</dd>`,
          `<dt>Relation identities</dt>`,
          `<dd>${renderIdentityList(
            record.contributing_relation_ids,
          )}</dd>`,
        ].join("");

  const flowSection =
    kind === "flow"
      ? [
          `<dt>Source</dt><dd><code>${escapeHtml(
            record.source_node_id,
          )}</code></dd>`,
          `<dt>Target</dt><dd><code>${escapeHtml(
            record.target_node_id,
          )}</code></dd>`,
          `<dt>Crossed boundaries</dt>`,
          `<dd>${renderIdentityList(
            record.crossed_boundary_ids,
          )}</dd>`,
        ].join("")
      : "";

  const unprojectedSection =
    kind === "unprojected"
      ? [
          `<dt>Reason</dt>`,
          `<dd><code>${escapeHtml(record.reason)}</code></dd>`,
        ].join("")
      : "";

  return [
    `<article class="trace-card"`,
    ` data-trace-kind="${escapeHtml(kind)}"`,
    ` data-trace-id="${escapeHtml(identity)}">`,
    `<h3>${escapeHtml(record.title)}</h3>`,
    `<p><code>${escapeHtml(identity)}</code></p>`,
    `<dl>`,
    flowSection,
    relationSection,
    unprojectedSection,
    `</dl>`,
    `</article>`,
  ].join("");
}

/**
 * Renders one deterministic self-contained HTML document.
 *
 * @param {unknown} projection
 * @param {{title?: string}} [options]
 * @returns {string}
 */
export function renderDfdHtml(projection, options = {}) {
  const normalized = normalizeProjection(projection);
  const renderOptions = requireRecord(options, "options");

  const documentTitle =
    renderOptions.title === undefined
      ? "ThreatForge Data Flow Diagram"
      : requireSingleLine(renderOptions.title, "options.title");

  const layout = createLayout(normalized.nodes);

  const boundaries = normalized.boundaries
    .map((boundary, index) =>
      renderBoundary(
        boundary,
        index,
        normalized.boundaries.length,
        layout,
      ),
    )
    .join("");

  const flows = normalized.flows
    .map((flow) => renderFlow(flow, layout.positions))
    .join("");

  const nodes = normalized.nodes
    .map((node) =>
      renderNode(node, layout.positions.get(node.id)),
    )
    .join("");

  const traceCards = [
    ...normalized.nodes.map((node) =>
      renderTraceCard(node, "node"),
    ),
    ...normalized.flows.map((flow) =>
      renderTraceCard(flow, "flow"),
    ),
    ...normalized.boundaries.map((boundary) =>
      renderTraceCard(boundary, "boundary"),
    ),
    ...normalized.unprojected_baes.map((record) =>
      renderTraceCard(record, "unprojected"),
    ),
  ].join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(documentTitle)}</title>
<style>
:root {
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f4f4f5;
  color: #18181b;
}
* { box-sizing: border-box; }
body { margin: 0; background: #f4f4f5; }
main {
  width: min(1500px, calc(100% - 32px));
  margin: 24px auto;
}
header, .diagram-panel, .traceability {
  background: #ffffff;
  border: 1px solid #d4d4d8;
  border-radius: 14px;
}
header { padding: 22px 26px; margin-bottom: 16px; }
h1, h2, h3, p { margin-top: 0; }
header p { margin-bottom: 6px; color: #52525b; }
code {
  display: inline-block;
  margin: 2px 3px 2px 0;
  padding: 2px 6px;
  border-radius: 5px;
  background: #f4f4f5;
  overflow-wrap: anywhere;
}
.diagram-panel {
  padding: 12px;
  overflow-x: auto;
}
svg {
  display: block;
  width: 100%;
  min-width: 820px;
  height: auto;
  background: #fafafa;
  border-radius: 10px;
}
.dfd-boundary line {
  stroke: #71717a;
  stroke-width: 3;
  stroke-dasharray: 12 9;
}
.dfd-boundary text {
  font-size: 14px;
  font-weight: 700;
  fill: #3f3f46;
}
.dfd-boundary .identity {
  font-size: 11px;
  font-weight: 500;
  fill: #71717a;
}
.dfd-node rect {
  fill: #ffffff;
  stroke: #18181b;
  stroke-width: 2.5;
}
.dfd-node.role-external_entity rect {
  fill: #f4f4f5;
}
.dfd-node.role-process rect {
  fill: #ffffff;
  stroke-width: 3;
}
.dfd-node.role-data_store rect {
  fill: #fafafa;
}
.data-store-line {
  stroke: #18181b;
  stroke-width: 1.5;
}
.dfd-node text {
  text-anchor: middle;
  pointer-events: none;
}
.dfd-node .role {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  fill: #71717a;
}
.dfd-node .title {
  font-size: 16px;
  font-weight: 700;
  fill: #18181b;
}
.dfd-node .identity {
  font-size: 11px;
  fill: #52525b;
}
.dfd-flow line {
  stroke: #18181b;
  stroke-width: 2.5;
}
.flow-label-background {
  fill: #ffffff;
  stroke: #d4d4d8;
}
.dfd-flow text {
  text-anchor: middle;
  pointer-events: none;
}
.flow-title {
  font-size: 13px;
  font-weight: 700;
  fill: #18181b;
}
.flow-identity {
  font-size: 10px;
  fill: #71717a;
}
.traceability {
  margin-top: 16px;
  padding: 22px 26px;
}
.traceability > p { color: #52525b; }
.trace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}
.trace-card {
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  padding: 14px;
}
.trace-card h3 {
  margin-bottom: 6px;
  font-size: 15px;
}
.trace-card dl {
  display: grid;
  grid-template-columns: minmax(92px, 0.35fr) 1fr;
  gap: 7px 10px;
  margin-bottom: 0;
  font-size: 13px;
}
.trace-card dt { font-weight: 700; }
.trace-card dd { margin: 0; }
.empty { color: #71717a; font-style: italic; }
</style>
</head>
<body>
<main data-projection-id="${escapeHtml(
    normalized.projection_id,
  )}">
<header>
<h1>${escapeHtml(documentTitle)}</h1>
<p><strong>Projection:</strong> <code>${escapeHtml(
    normalized.projection_id,
  )}</code></p>
<p><strong>Source registry:</strong> <code>${escapeHtml(
    normalized.source.registry_id,
  )}</code></p>
<p><strong>Source path:</strong> <code>${escapeHtml(
    normalized.source.registry_path,
  )}</code></p>
</header>
<section class="diagram-panel" aria-labelledby="diagram-heading">
<h2 id="diagram-heading">Diagram</h2>
<svg viewBox="0 0 ${layout.width} ${layout.height}"
 role="img"
 aria-labelledby="diagram-title diagram-description"
 data-projection-id="${escapeHtml(normalized.projection_id)}">
<title id="diagram-title">${escapeHtml(documentTitle)}</title>
<desc id="diagram-description">Deterministic renderer-neutral DFD projection containing ${
    normalized.nodes.length
  } nodes, ${normalized.flows.length} directed flows and ${
    normalized.boundaries.length
  } boundaries.</desc>
<defs>
<marker id="dfd-arrow" markerWidth="10" markerHeight="10"
 refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#18181b"></path>
</marker>
</defs>
${boundaries}
${flows}
${nodes}
</svg>
</section>
<section class="traceability" aria-labelledby="trace-heading">
<h2 id="trace-heading">Traceability</h2>
<p>Semantic identities remain available independently from diagram layout.</p>
<div class="trace-grid">${traceCards}</div>
</section>
</main>
</body>
</html>
`;
}
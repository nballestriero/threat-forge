#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..", "..");
const projectModelDir = path.join(rootDir, "docs", "reference", "project-model");
const registersDir = path.join(projectModelDir, "registers");
const outputDir = path.join(rootDir, "artifacts", "project-model");

const taxonomiesPath = path.join(registersDir, "taxonomies.registry.yml");
const graphControlRegistriesDir = path.join(rootDir, "backend", "tools", "MR-0000", "registries");
const graphPredicatesPath = path.join(graphControlRegistriesDir, "spo-predicates.registry.yml");
const graphNodeTypesPath = path.join(graphControlRegistriesDir, "graph-node-types.registry.yml");
const graphIndexPath = path.join(registersDir, "graph.index.yml");
const macroRequirementsPath = path.join(registersDir, "macro-requirements.registry.yml");
const requirementsDir = path.join(registersDir, "requirements");
const decisionsDir = path.join(registersDir, "decisions");

fs.mkdirSync(outputDir, { recursive: true });

function readText(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function jsonForScript(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

function resolveProjectPath(projectPath) {
  const normalized = normalizeProjectPath(projectPath);
  return normalized ? path.join(rootDir, normalized) : "";
}

function relativeProjectPath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function slugFile(filePath) {
  return normalizeProjectPath(filePath)
    .replace(/^docs\/reference\/project-model\//, "")
    .replaceAll("/", "__")
    .replaceAll(".", "_");
}

function filePageForPath(projectPath) {
  const normalized = normalizeProjectPath(projectPath);
  return normalized ? `file-${slugFile(normalized)}.html` : "";
}

function stripQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseScalar(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "[]") return [];
  if (trimmed === "{}") return {};
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  return stripQuotes(trimmed);
}

function countIndent(line) {
  return line.match(/^ */)?.[0].length ?? 0;
}

function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");

  function getParent(indent) {
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    return stack[stack.length - 1].value;
  }

  function nextMeaningfulLine(startIndex) {
    for (let i = startIndex + 1; i < lines.length; i += 1) {
      if (lines[i].trim() && !lines[i].trimStart().startsWith("#")) return lines[i];
    }
    return "";
  }

  function readBlock(startIndex, baseIndent) {
    const block = [];
    let i = startIndex;
    while (i + 1 < lines.length) {
      const next = lines[i + 1];
      const nextIndent = countIndent(next);
      if (next.trim() && nextIndent <= baseIndent) break;
      i += 1;
      const sliceAt = Math.min(baseIndent + 2, next.length);
      block.push(next.slice(sliceAt));
    }
    return { text: block.join("\n").replace(/\n$/, ""), nextIndex: i };
  }

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;

    const indent = countIndent(raw);
    const trimmed = raw.trim();

    if (trimmed.startsWith("- ")) {
      const parent = getParent(indent);
      if (!Array.isArray(parent)) continue;

      const itemText = trimmed.slice(2).trim();
      const colonIndex = itemText.indexOf(":");

      if (colonIndex === -1) {
        parent.push(parseScalar(itemText));
        continue;
      }

      const key = itemText.slice(0, colonIndex).trim();
      const rawValue = itemText.slice(colonIndex + 1).trim();
      const obj = {};
      parent.push(obj);

      if (rawValue === "|") {
        const block = readBlock(index, indent);
        obj[key] = block.text;
        index = block.nextIndex;
      } else if (rawValue === "") {
        const nextLine = nextMeaningfulLine(index);
        const value = nextLine.trim().startsWith("- ") ? [] : {};
        obj[key] = value;
        stack.push({ indent, value: obj });
        stack.push({ indent: indent + 2, value });
      } else {
        obj[key] = parseScalar(rawValue);
        stack.push({ indent, value: obj });
      }
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();
    const parent = getParent(indent);

    if (rawValue === "|") {
      const block = readBlock(index, indent);
      parent[key] = block.text;
      index = block.nextIndex;
    } else if (rawValue === "") {
      const nextLine = nextMeaningfulLine(index);
      const value = nextLine.trim().startsWith("- ") ? [] : {};
      parent[key] = value;
      stack.push({ indent, value });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  }

  return root;
}

function readYaml(filePath) {
  return parseYaml(readText(filePath));
}

function resolveList(parsed, preferredKey, fallbackKey) {
  if (Array.isArray(parsed[preferredKey])) return parsed[preferredKey];
  if (fallbackKey && Array.isArray(parsed[fallbackKey])) return parsed[fallbackKey];
  return [];
}

function collectTaxonomies() {
  const rows = [];

  if (fs.existsSync(taxonomiesPath)) {
    const parsed = readYaml(taxonomiesPath);
    const taxonomies = parsed.taxonomies && typeof parsed.taxonomies === "object" ? parsed.taxonomies : {};

    for (const [group, entries] of Object.entries(taxonomies)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        rows.push({
          group,
          id: entry.id ?? "",
          name: entry.name ?? "",
          function: entry.function ?? "",
          forward_label: entry.forward_label ?? "",
          inverse_label: entry.inverse_label ?? "",
          subject_type: entry.subject_type ?? "",
          object_type: entry.object_type ?? "",
          description: entry.description ?? "",
          source_file: relativeProjectPath(taxonomiesPath),
        });
      }
    }
  }

  if (fs.existsSync(graphNodeTypesPath)) {
    const parsed = readYaml(graphNodeTypesPath);
    for (const entry of resolveList(parsed, "node_type")) {
      rows.push({
        group: "node_type",
        id: entry.id ?? "",
        name: entry.name ?? "",
        function: "",
        forward_label: "",
        inverse_label: "",
        subject_type: "",
        object_type: "",
        description: entry.description ?? "",
        source_file: relativeProjectPath(graphNodeTypesPath),
      });
    }
  }

  if (fs.existsSync(graphPredicatesPath)) {
    const parsed = readYaml(graphPredicatesPath);
    for (const entry of resolveList(parsed, "spo_predicate")) {
      rows.push({
        group: "spo_predicate",
        id: entry.id ?? "",
        name: entry.name ?? "",
        function: entry.function ?? "",
        forward_label: entry.forward_label ?? "",
        inverse_label: entry.inverse_label ?? "",
        subject_type: entry.subject_type ?? "",
        object_type: entry.object_type ?? "",
        description: entry.description ?? "",
        source_file: relativeProjectPath(graphPredicatesPath),
      });
    }
  }

  return rows;
}

function collectPredicateLabels() {
  const labels = {};
  for (const row of collectTaxonomies()) {
    if (row.group !== "spo_predicate") continue;
    labels[row.id] = {
      forward_label: row.forward_label ?? "",
      inverse_label: row.inverse_label ?? "",
    };
  }
  return labels;
}

function collectGraphEntries() {
  const parsed = readYaml(graphIndexPath);
  return resolveList(parsed, "graphs", "parts");
}

function collectGraphNodes() {
  const rows = [];

  for (const graphEntry of collectGraphEntries()) {
    const absolute = resolveProjectPath(graphEntry.path);
    const graph = readYaml(absolute);
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];

    for (const node of nodes) {
      const displayType = node.type ?? node.node_type ?? "";
      const filePath = node.path ?? node.body_path ?? "";
      rows.push({
        id: node.id ?? "",
        type: displayType,
        node_type: node.node_type ?? displayType,
        label: node.label ?? node.name ?? "",
        registry_path: node.registry_path ?? "",
        body_path: node.body_path ?? filePath,
        path: filePath,
        graph_id: graph.graph_id ?? graphEntry.graph_id ?? "",
        macro_requirement_id: graph.macro_requirement_id ?? graphEntry.macro_requirement_id ?? "",
        source_file: relativeProjectPath(absolute),
      });
    }
  }

  return rows;
}

function graphNodesByType(type) {
  return collectGraphNodes().filter((node) => node.type === type && node.registry_path);
}

function listYamlFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const rows = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      rows.push(...listYamlFiles(fullPath));
    } else if (entry.isFile() && /\.ya?ml$/u.test(entry.name)) {
      rows.push(fullPath);
    }
  }
  return rows.sort();
}

function collectMacroRequirementRecords() {
  const parsed = readYaml(macroRequirementsPath);
  return resolveList(parsed, "macro_requirements");
}

function collectMacroRequirements() {
  const sourceFile = fs.existsSync(macroRequirementsPath) ? relativeProjectPath(macroRequirementsPath) : "";

  return collectMacroRequirementRecords().map((registry) => {
    const bodyPath = registry.body_path ?? "";
    return {
      id: registry.id ?? "",
      name: registry.name ?? registry.title ?? "",
      type: registry.type ?? "",
      status: registry.status ?? "",
      registry_path: sourceFile,
      body_path: bodyPath,
      decisions_registry_path: registry.decisions_registry_path ?? "",
      decisions_registry_page: filePageForPath(registry.decisions_registry_path ?? ""),
      source_page: filePageForPath(sourceFile),
      body_page: filePageForPath(bodyPath),
      body: readText(resolveProjectPath(bodyPath)),
      source_file: sourceFile,
    };
  });
}

function collectRequirements() {
  const rows = [];

  for (const registryAbsolute of listYamlFiles(requirementsDir)) {
    const registry = readYaml(registryAbsolute);
    const sourceFile = relativeProjectPath(registryAbsolute);
    const requirements = Array.isArray(registry.requirements) ? registry.requirements : [registry];

    for (const requirement of requirements) {
      const id = requirement.id ?? "";
      if (!id) continue;
      const bodyPath = requirement.body_path ?? requirement.detail_document ?? "";
      rows.push({
        derived_id: id,
        id,
        title: requirement.title ?? requirement.name ?? "",
        type: requirement.type ?? "",
        macro_requirement_id: requirement.macro_requirement_id ?? registry.macro_requirement_id ?? "",
        applies_to_requirement_id: requirement.applies_to_requirement_id ?? "",
        derived_from_decision_id: requirement.derived_from_decision_id ?? "",
        relation_type: requirement.relation_type ?? "",
        status: requirement.status ?? "",
        implementation_status: requirement.implementation_status ?? "",
        priority: requirement.priority ?? "",
        detail_document: bodyPath,
        body_path: bodyPath,
        source_page: filePageForPath(sourceFile),
        body_page: filePageForPath(bodyPath),
        body: readText(resolveProjectPath(bodyPath)),
        source_file: sourceFile,
      });
    }
  }

  return rows;
}

function collectDecisions() {
  const rows = [];

  for (const registryAbsolute of listYamlFiles(decisionsDir)) {
    const registry = readYaml(registryAbsolute);
    const sourceFile = relativeProjectPath(registryAbsolute);
    const decisions = Array.isArray(registry.decisions) ? registry.decisions : [registry];

    for (const decision of decisions) {
      const bodyPath = decision.body_path ?? "";
      const id = decision.id ?? "";
      if (!id) continue;
      rows.push({
        id,
        title: decision.title ?? "",
        status: decision.status ?? "",
        author: decision.author ?? "",
        date: decision.date ?? "",
        macro_requirement_id: decision.macro_requirement_id ?? registry.macro_requirement_id ?? "",
        body_path: bodyPath,
        source_page: filePageForPath(sourceFile),
        body_page: filePageForPath(bodyPath),
        body: readText(resolveProjectPath(bodyPath)),
        source_file: sourceFile,
      });
    }
  }

  return rows;
}

function collectGraphRelations() {
  const rows = [];
  const labels = collectPredicateLabels();
  const nodesById = new Map(collectGraphNodes().map((node) => [node.id, node]));

  for (const graphEntry of collectGraphEntries()) {
    const absolute = resolveProjectPath(graphEntry.path);
    const graph = readYaml(absolute);
    const relations = Array.isArray(graph.spo_relations) ? graph.spo_relations : [];

    for (const relation of relations) {
      const subject = relation.subject ?? "";
      const object = relation.object ?? "";
      const predicate = relation.predicate ?? "";
      const subjectNode = nodesById.get(subject);
      const objectNode = nodesById.get(object);
      rows.push({
        subject,
        subject_label: subjectNode?.label ?? "",
        subject_type: subjectNode?.type ?? "",
        predicate,
        forward_label: labels[predicate]?.forward_label ?? "",
        inverse_label: labels[predicate]?.inverse_label ?? "",
        object,
        object_label: objectNode?.label ?? "",
        object_type: objectNode?.type ?? "",
        graph_id: graph.graph_id ?? graphEntry.graph_id ?? "",
        macro_requirement_id: graph.macro_requirement_id ?? graphEntry.macro_requirement_id ?? "",
        source_file: relativeProjectPath(absolute),
      });
    }
  }

  return rows;
}

function uniqueAbsoluteFiles(files) {
  const seen = new Set();
  const result = [];
  for (const filePath of files.filter(Boolean)) {
    const absolute = path.resolve(filePath);
    if (seen.has(absolute)) continue;
    seen.add(absolute);
    result.push(absolute);
  }
  return result;
}

function collectFiles() {
  const graphEntries = collectGraphEntries();
  const graphFiles = graphEntries.map((entry) => resolveProjectPath(entry.path)).filter(Boolean);
  const requirementRecords = collectRequirements();
  const decisionRecords = collectDecisions();
  const macroRequirementRecords = collectMacroRequirementRecords();

  const requirementRegistryFiles = listYamlFiles(requirementsDir);
  const decisionRegistryFiles = listYamlFiles(decisionsDir);
  const bodyFiles = [
    ...macroRequirementRecords.map((row) => row.body_path).filter(Boolean).map(resolveProjectPath),
    ...requirementRecords.map((row) => row.body_path).filter(Boolean).map(resolveProjectPath),
    ...decisionRecords.map((row) => row.body_path).filter(Boolean).map(resolveProjectPath),
  ];

  const groups = [
    { label: "Taxonomies registry", files: fs.existsSync(taxonomiesPath) ? [taxonomiesPath] : [] },
    { label: "Macro requirements registry", files: fs.existsSync(macroRequirementsPath) ? [macroRequirementsPath] : [] },
    { label: "Requirement registries", files: requirementRegistryFiles },
    { label: "Decision registries", files: decisionRegistryFiles },
    { label: "Graph index", files: fs.existsSync(graphIndexPath) ? [graphIndexPath] : [] },
    {
      label: "Graph control registries",
      files: [graphNodeTypesPath, graphPredicatesPath].filter((filePath) => fs.existsSync(filePath)),
    },
    { label: "Graph registries", files: graphFiles },
    { label: "Body files", files: bodyFiles },
  ];

  return groups.map((group) => ({
    label: group.label,
    files: uniqueAbsoluteFiles(group.files).map((filePath) => ({
      path: relativeProjectPath(filePath),
      exists: fs.existsSync(filePath),
      page: filePageForPath(relativeProjectPath(filePath)),
      content: readText(filePath),
    })),
  }));
}

function markdownToHtml(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let inList = false;
  let paragraph = [];

  function flushParagraph() {
    if (paragraph.length) {
      html.push(`<p>${escapeHtml(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }

  function closeList() {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      closeList();
      html.push(`<h4>${escapeHtml(trimmed.slice(4))}</h4>`);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      closeList();
      html.push(`<h3>${escapeHtml(trimmed.slice(3))}</h3>`);
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph();
      closeList();
      html.push(`<h2>${escapeHtml(trimmed.slice(2))}</h2>`);
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushParagraph();
      if (!inList) html.push("<ul>");
      inList = true;
      html.push(`<li>${escapeHtml(trimmed.slice(2))}</li>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();
  return html.join("\n");
}

function uniqueValues(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}

function writePage(fileName, title, body) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root {
  color-scheme: light dark;
  --bg: #f6f7f9;
  --panel: #ffffff;
  --text: #17202a;
  --muted: #5f6b7a;
  --border: #d9dee7;
  --accent: #2f5f9f;
  --code: #f0f3f7;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #111418;
    --panel: #171c22;
    --text: #eef2f6;
    --muted: #a6b0bd;
    --border: #313946;
    --accent: #8bb7ff;
    --code: #222a33;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
}
header, main { max-width: 1180px; margin: 0 auto; padding: 24px; }
nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}
nav a, .button-link {
  color: var(--accent);
  text-decoration: none;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 7px 11px;
  background: var(--panel);
}
.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px;
  margin: 14px 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 14px;
}
.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
  align-items: end;
  margin: 18px 0;
}
label { display: grid; gap: 5px; font-size: 0.9rem; color: var(--muted); }
input, select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 9px;
  background: var(--panel);
  color: var(--text);
}
table {
  width: 100%;
  border-collapse: collapse;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}
th, td {
  text-align: left;
  vertical-align: top;
  padding: 10px;
  border-bottom: 1px solid var(--border);
}
th { color: var(--muted); font-weight: 650; }
code, pre { background: var(--code); border-radius: 8px; }
code { padding: 2px 5px; }
pre {
  padding: 14px;
  overflow-x: auto;
  border: 1px solid var(--border);
}
.badge {
  display: inline-block;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px 8px;
  color: var(--muted);
  font-size: 0.85rem;
}
.muted { color: var(--muted); }
.count { font-weight: 700; }
.empty { color: var(--muted); font-style: italic; }
.article-body h2 { margin-top: 0; }
.article-body h3, .article-body h4 { margin-bottom: 8px; }

.graph-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin: 12px 0;
}
.graph-toolbar button {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 12px;
  background: var(--panel);
  color: var(--text);
  cursor: pointer;
}
.graph-toolbar button[aria-pressed="true"] {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(64, 179, 255, 0.18);
}
.graph-canvas {
  width: 100%;
  height: min(82vh, 920px);
  min-height: 560px;
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  background: var(--panel);
  touch-action: none;
}
.graph-canvas svg {
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
}
.graph-canvas svg.dragging { cursor: grabbing; }
.graph-node circle {
  fill: var(--panel);
  stroke: var(--accent);
  stroke-width: 2.5px;
}
.graph-node text { fill: var(--text); pointer-events: none; }
.graph-node .node-id { font-weight: 700; font-size: 13px; }
.graph-node .node-label { fill: var(--muted); font-size: 11px; }
.graph-node .node-type { fill: var(--muted); font-size: 10px; }
.graph-edge { stroke: var(--muted); stroke-width: 1.8px; fill: none; }
.graph-edge.inverse.comparison { stroke-dasharray: 6 5; }
.graph-edge-label {
  fill: var(--text);
  font-size: 11px;
  paint-order: stroke;
  stroke: var(--panel);
  stroke-width: 4px;
  stroke-linejoin: round;
}
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(title)}</h1>
  <p class="muted">Generated from <code>docs/reference/project-model</code>. Filters are empty by default, so each page shows all available content until you filter it.</p>
  <nav>
    <a href="index.html">Home</a>
    <a href="macro-requirements.html">Macro Requirements</a>
    <a href="requirements.html">Requirements</a>
    <a href="adr.html">ADR</a>
    <a href="graph.html">Graph SPO</a>
    <a href="taxonomies.html">Taxonomies</a>
    <a href="files.html">Files</a>
  </nav>
</header>
<main>
${body}
</main>
</body>
</html>`;

  fs.writeFileSync(path.join(outputDir, fileName), html, "utf8");
}

function renderHome(data) {
  writePage("index.html", "Threat Forge Project Model", `
<section class="grid">
  <article class="card">
    <h2>Macro Requirements</h2>
    <p class="count">${data.macroRequirements.length}</p>
    <p class="muted">Top-level macro requirements with compact registry records and body files.</p>
    <p><a class="button-link" href="macro-requirements.html">Open macro requirements</a></p>
  </article>
  <article class="card">
    <h2>Requirements</h2>
    <p class="count">${data.requirements.length}</p>
    <p class="muted">Compact requirement records discovered from registers/requirements.</p>
    <p><a class="button-link" href="requirements.html">Open requirements</a></p>
  </article>
  <article class="card">
    <h2>ADR</h2>
    <p class="count">${data.decisions.length}</p>
    <p class="muted">Architecture decision records discovered from decision registries with body files.</p>
    <p><a class="button-link" href="adr.html">Open ADR</a></p>
  </article>
  <article class="card">
    <h2>Graph SPO</h2>
    <p class="count">${data.graph.relations.length}</p>
    <p class="muted">Canonical nodes and subject-predicate-object relations.</p>
    <p><a class="button-link" href="graph.html">Open graph</a></p>
  </article>
  <article class="card">
    <h2>Taxonomies</h2>
    <p class="count">${data.taxonomies.length}</p>
    <p class="muted">Controlled values from the taxonomies registry.</p>
    <p><a class="button-link" href="taxonomies.html">Open taxonomies</a></p>
  </article>
</section>
`);
}

function renderMacroRequirements(rows) {
  const statuses = uniqueValues(rows, "status");
  const rowsForClient = rows.map((row) => ({ ...row, body_html: markdownToHtml(row.body) }));
  const pageData = jsonForScript(rowsForClient);

  writePage("macro-requirements.html", "Macro Requirements", `
<section class="card">
  <h2>Filters</h2>
  <div class="filters">
    <label>Text
      <input id="textFilter" type="search" placeholder="Search id, name, body">
    </label>
    <label>Status
      <select id="statusFilter"><option value="">All statuses</option>${statuses.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")}</select>
    </label>
  </div>
</section>
<section>
  <h2>Macro requirement records <span class="badge" id="count"></span></h2>
  <div id="cards"></div>
</section>
<script>
const rows = ${pageData};
function esc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function includesText(row, text) {
  if (!text) return true;
  return [row.id, row.name, row.status, row.registry_path, row.body_path, row.body].join(" ").toLowerCase().includes(text.toLowerCase());
}
function render() {
  const text = document.getElementById("textFilter").value.trim();
  const status = document.getElementById("statusFilter").value;
  const filtered = rows.filter((row) => includesText(row, text) && (!status || row.status === status));

  document.getElementById("count").textContent = filtered.length + " / " + rows.length;
  const cards = filtered.map((row) =>
    "<article class=\\"card\\">" +
    "<h2><code>" + esc(row.id) + "</code> — " + esc(row.name) + "</h2>" +
    "<p><span class=\\"badge\\">" + esc(row.status) + "</span></p>" +
    "<p class=\\"muted\\">Registry: " + (row.source_page ? "<a href=\\\"" + esc(row.source_page) + "\\\"><code>" + esc(row.registry_path || row.source_file) + "</code></a>" : "<code>" + esc(row.registry_path || row.source_file) + "</code>") + "</p>" +
    "<p class=\\"muted\\">Body: " + (row.body_page ? "<a href=\\\"" + esc(row.body_page) + "\\\"><code>" + esc(row.body_path) + "</code></a>" : "<code>" + esc(row.body_path) + "</code>") + "</p>" +
    "<div class=\\"article-body\\">" + row.body_html + "</div>" +
    "</article>"
  ).join("");

  document.getElementById("cards").innerHTML = filtered.length
    ? cards
    : "<article class=\\"card\\"><p class=\\"empty\\">No macro requirements match the active filters.</p></article>";
}
["textFilter","statusFilter"].forEach((id) => {
  document.getElementById(id).addEventListener(id === "textFilter" ? "input" : "change", render);
});
render();
</script>
`);
}

function renderTaxonomies(rows) {
  const groups = uniqueValues(rows, "group");
  const pageData = jsonForScript(rows);
  writePage("taxonomies.html", "Taxonomies", `
<section class="card">
  <h2>Filters</h2>
  <div class="filters">
    <label>Text
      <input id="textFilter" type="search" placeholder="Search id, function, description">
    </label>
    <label>Group
      <select id="groupFilter">
        <option value="">All groups</option>
        ${groups.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join("")}
      </select>
    </label>
  </div>
</section>
<section class="card">
  <h2>Entries <span class="badge" id="count"></span></h2>
  <div id="table"></div>
</section>
<script>
const rows = ${pageData};
function esc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function includesText(row, text) {
  if (!text) return true;
  return Object.values(row).join(" ").toLowerCase().includes(text.toLowerCase());
}
function render() {
  const text = document.getElementById("textFilter").value.trim();
  const group = document.getElementById("groupFilter").value;
  const filtered = rows.filter((row) => includesText(row, text) && (!group || row.group === group));

  document.getElementById("count").textContent = filtered.length + " / " + rows.length;
  const body = filtered.map((row) =>
    "<tr>" +
    "<td><code>" + esc(row.group) + "</code></td>" +
    "<td><code>" + esc(row.id) + "</code></td>" +
    "<td>" + esc(row.name) + "</td>" +
    "<td>" + esc(row.function) + "</td>" +
    "<td>" + esc(row.forward_label) + "</td>" +
    "<td>" + esc(row.inverse_label) + "</td>" +
    "<td>" + esc(row.description) + "</td>" +
    "</tr>"
  ).join("");

  document.getElementById("table").innerHTML = filtered.length
    ? "<table><thead><tr><th>Group</th><th>ID</th><th>Name</th><th>Function</th><th>Forward</th><th>Inverse</th><th>Description</th></tr></thead><tbody>" + body + "</tbody></table>"
    : "<p class=\\"empty\\">No taxonomy entries match the active filters.</p>";
}
document.getElementById("textFilter").addEventListener("input", render);
document.getElementById("groupFilter").addEventListener("change", render);
render();
</script>
`);
}

function renderRequirements(rows) {
  const macros = uniqueValues(rows, "macro_requirement_id");
  const statuses = uniqueValues(rows, "status");
  const rowsForClient = rows.map((row) => ({ ...row, body_html: markdownToHtml(row.body) }));
  const pageData = jsonForScript(rowsForClient);

  writePage("requirements.html", "Requirements", `
<section class="card">
  <h2>Filters</h2>
  <div class="filters">
    <label>Text
      <input id="textFilter" type="search" placeholder="Search id, title, body">
    </label>
    <label>Macro requirement
      <select id="macroFilter"><option value="">All macro requirements</option>${macros.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")}</select>
    </label>
    <label>Status
      <select id="statusFilter"><option value="">All statuses</option>${statuses.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")}</select>
    </label>
  </div>
</section>
<section>
  <h2>Requirement records <span class="badge" id="count"></span></h2>
  <div id="cards"></div>
</section>
<script>
const rows = ${pageData};
function esc(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function includesText(row, text) {
  if (!text) return true;
  return [row.id, row.title, row.status, row.priority, row.macro_requirement_id, row.derived_from_decision_id, row.body_path, row.body].join(' ').toLowerCase().includes(text.toLowerCase());
}
function badge(value) {
  return value ? '<span class="badge">' + esc(value) + '</span> ' : '';
}
function render() {
  const text = document.getElementById('textFilter').value.trim();
  const macro = document.getElementById('macroFilter').value;
  const status = document.getElementById('statusFilter').value;
  const filtered = rows.filter((row) =>
    includesText(row, text) &&
    (!macro || row.macro_requirement_id === macro) &&
    (!status || row.status === status)
  );

  document.getElementById('count').textContent = filtered.length + ' / ' + rows.length;
  const cards = filtered.map((row) =>
    '<article class="card">' +
    '<h2><code>' + esc(row.id) + '</code> — ' + esc(row.title) + '</h2>' +
    '<p>' + badge(row.status) + badge(row.priority) + badge(row.macro_requirement_id) + badge(row.derived_from_decision_id) + '</p>' +
    '<p class="muted">Registry: ' + (row.source_page ? '<a href="' + esc(row.source_page) + '"><code>' + esc(row.source_file) + '</code></a>' : '<code>' + esc(row.source_file) + '</code>') + '</p>' +
    '<p class="muted">Body: ' + (row.body_page ? '<a href="' + esc(row.body_page) + '"><code>' + esc(row.body_path) + '</code></a>' : '<code>' + esc(row.body_path) + '</code>') + '</p>' +
    '<div class="article-body">' + row.body_html + '</div>' +
    '</article>'
  ).join('');

  document.getElementById('cards').innerHTML = filtered.length
    ? cards
    : '<article class="card"><p class="empty">No requirements match the active filters.</p></article>';
}
['textFilter','macroFilter','statusFilter'].forEach((id) => {
  document.getElementById(id).addEventListener(id === 'textFilter' ? 'input' : 'change', render);
});
render();
</script>
`);
}

function renderAdr(rows) {
  const macros = uniqueValues(rows, "macro_requirement_id");
  const statuses = uniqueValues(rows, "status");
  const authors = uniqueValues(rows, "author");
  const rowsForClient = rows.map((row) => ({ ...row, body_html: markdownToHtml(row.body) }));
  const pageData = jsonForScript(rowsForClient);

  writePage("adr.html", "ADR", `
<section class="card">
  <h2>Filters</h2>
  <div class="filters">
    <label>Text
      <input id="textFilter" type="search" placeholder="Search id, title, body">
    </label>
    <label>Macro requirement
      <select id="macroFilter"><option value="">All macro requirements</option>${macros.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")}</select>
    </label>
    <label>Status
      <select id="statusFilter"><option value="">All statuses</option>${statuses.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")}</select>
    </label>
    <label>Author
      <select id="authorFilter"><option value="">All authors</option>${authors.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")}</select>
    </label>
  </div>
</section>
<section>
  <h2>ADR records <span class="badge" id="count"></span></h2>
  <div id="cards"></div>
</section>
<script>
const rows = ${pageData};
function esc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function includesText(row, text) {
  if (!text) return true;
  return [row.id, row.title, row.status, row.author, row.date, row.macro_requirement_id, row.body_path, row.body].join(" ").toLowerCase().includes(text.toLowerCase());
}
function render() {
  const text = document.getElementById("textFilter").value.trim();
  const macro = document.getElementById("macroFilter").value;
  const status = document.getElementById("statusFilter").value;
  const author = document.getElementById("authorFilter").value;
  const filtered = rows.filter((row) =>
    includesText(row, text) &&
    (!macro || row.macro_requirement_id === macro) &&
    (!status || row.status === status) &&
    (!author || row.author === author)
  );

  document.getElementById("count").textContent = filtered.length + " / " + rows.length;
  const cards = filtered.map((row) =>
    "<article class=\\"card\\">" +
    "<h2><code>" + esc(row.id) + "</code> — " + esc(row.title) + "</h2>" +
    "<p><span class=\\"badge\\">" + esc(row.status) + "</span> " +
    "<span class=\\"badge\\">" + esc(row.author) + "</span> " +
    "<span class=\\"badge\\">" + esc(row.date) + "</span> " +
    "<span class=\\"badge\\">" + esc(row.macro_requirement_id) + "</span></p>" +
    "<p class=\\"muted\\">Registry: " + (row.source_page ? "<a href=\\\"" + esc(row.source_page) + "\\\"><code>" + esc(row.source_file) + "</code></a>" : "<code>" + esc(row.source_file) + "</code>") + "</p>" +
    "<p class=\\"muted\\">Body: " + (row.body_page ? "<a href=\\\"" + esc(row.body_page) + "\\\"><code>" + esc(row.body_path) + "</code></a>" : "<code>" + esc(row.body_path) + "</code>") + "</p>" +
    "<div class=\\"article-body\\">" + row.body_html + "</div>" +
    "</article>"
  ).join("");

  document.getElementById("cards").innerHTML = filtered.length
    ? cards
    : "<article class=\\"card\\"><p class=\\"empty\\">No ADR records match the active filters.</p></article>";
}
["textFilter","macroFilter","statusFilter","authorFilter"].forEach((id) => {
  document.getElementById(id).addEventListener(id === "textFilter" ? "input" : "change", render);
});
render();
</script>
`);

  writePage("decisions.html", "Decisions alias", `
<section class="card">
  <h2>Decisions moved to ADR</h2>
  <p>The canonical page is <a href="adr.html">ADR</a>.</p>
  <p><a class="button-link" href="adr.html">Open ADR</a></p>
</section>
`);
}

function renderGraph(graphData) {
  const nodes = graphData.nodes;
  const rows = graphData.relations;
  const visualData = jsonForScript({ nodes, relations: rows });

  const nodeBody = nodes.map((node) => `
    <tr>
      <td><code>${escapeHtml(node.id)}</code></td>
      <td>${escapeHtml(node.label)}</td>
      <td><code>${escapeHtml(node.type)}</code></td>
      <td><code>${escapeHtml(node.path)}</code></td>
      <td><code>${escapeHtml(node.graph_id)}</code></td>
      <td><code>${escapeHtml(node.macro_requirement_id)}</code></td>
      <td><code>${escapeHtml(node.source_file)}</code></td>
    </tr>`).join("");

  const relationBody = rows.map((row) => `
    <tr>
      <td><code>${escapeHtml(row.subject)}</code><br><span class="muted">${escapeHtml(row.subject_label)}</span></td>
      <td><code>${escapeHtml(row.subject_type)}</code></td>
      <td><code>${escapeHtml(row.predicate)}</code><br><span class="muted">${escapeHtml(row.forward_label)}</span></td>
      <td><code>${escapeHtml(row.object)}</code><br><span class="muted">${escapeHtml(row.object_label)}</span></td>
      <td><code>${escapeHtml(row.object_type)}</code></td>
      <td>${escapeHtml(row.inverse_label)}</td>
      <td><code>${escapeHtml(row.graph_id)}</code></td>
      <td><code>${escapeHtml(row.macro_requirement_id)}</code></td>
      <td><code>${escapeHtml(row.source_file)}</code></td>
    </tr>`).join("");

  const nodesTable = nodes.length
    ? `<table>
        <thead><tr><th>ID</th><th>Label</th><th>Type</th><th>Path</th><th>Graph ID</th><th>Macro requirement</th><th>Source</th></tr></thead>
        <tbody>${nodeBody}</tbody>
      </table>`
    : `<p class="empty">No graph nodes found. Check <code>docs/reference/project-model/registers/graph.index.yml</code>.</p>`;

  const relationsTable = rows.length
    ? `<table>
        <thead><tr><th>Subject</th><th>Subject type</th><th>Predicate</th><th>Object</th><th>Object type</th><th>Inverse label</th><th>Graph ID</th><th>Macro requirement</th><th>Source</th></tr></thead>
        <tbody>${relationBody}</tbody>
      </table>`
    : `<p class="empty">No SPO relations found. Check <code>spo_relations</code> in graph registry files.</p>`;

  writePage("graph.html", "Graph SPO relations", `
<section class="grid">
  <article class="card">
    <h2>Graph nodes</h2>
    <p class="count">${nodes.length}</p>
  </article>
  <article class="card">
    <h2>SPO relations</h2>
    <p class="count">${rows.length}</p>
  </article>
</section>

<section class="card">
  <h2>Visual graph</h2>
  <p class="muted">Drag the canvas to pan. Use the mouse wheel or the buttons to zoom. Filter the rendered relation readings without changing the canonical graph data.</p>
  <div class="graph-toolbar" aria-label="Graph relation reading filters">
    <button type="button" id="canonicalOnly" aria-pressed="true">Canonical only</button>
    <button type="button" id="inverseOnly" aria-pressed="false">Inverse only</button>
    <button type="button" id="bothViews" aria-pressed="false">Canonical + inverse</button>
    <span class="badge" id="graphMode">canonical only</span>
    <span class="badge" id="visibleRelations"></span>
  </div>
  <div class="graph-toolbar" aria-label="Graph zoom controls">
    <button type="button" id="zoomIn">Zoom in</button>
    <button type="button" id="zoomOut">Zoom out</button>
    <button type="button" id="zoomReset">Reset</button>
    <span class="badge" id="zoomLevel">100%</span>
  </div>
  <div class="graph-canvas" id="graphCanvas">
    <svg id="graphSvg" viewBox="0 0 2200 1250" role="img" aria-label="Project model knowledge graph">
      <defs>
        <marker id="graphArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="currentColor"></path>
        </marker>
      </defs>
      <g id="graphViewport"></g>
    </svg>
  </div>
</section>

<section class="card">
  <h2>Nodes</h2>
  ${nodesTable}
</section>

<section class="card">
  <h2>SPO relations</h2>
  ${relationsTable}
</section>
<script>
const graphData = ${visualData};
const svg = document.getElementById("graphSvg");
const viewport = document.getElementById("graphViewport");
const zoomLevel = document.getElementById("zoomLevel");
const graphMode = document.getElementById("graphMode");
const visibleRelations = document.getElementById("visibleRelations");
const canonicalOnlyButton = document.getElementById("canonicalOnly");
const inverseOnlyButton = document.getElementById("inverseOnly");
const bothViewsButton = document.getElementById("bothViews");
const ns = "http://www.w3.org/2000/svg";
const width = 2200;
const height = 1250;
const nodeRadius = 50;
let transform = { x: 0, y: 0, scale: 1 };
let relationReadingFilter = "canonical";
let dragStart = null;

function setAttributes(element, attributes) {
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function appendSvg(parent, name, attributes = {}) {
  const element = document.createElementNS(ns, name);
  setAttributes(element, attributes);
  parent.appendChild(element);
  return element;
}

function renderTransform() {
  viewport.setAttribute("transform", "translate(" + transform.x + " " + transform.y + ") scale(" + transform.scale + ")");
  zoomLevel.textContent = Math.round(transform.scale * 100) + "%";
}

function typeRank(type) {
  const ranks = {
    MacroRequirement: 0,
    ADR: 1,
    Requirement: 2,
    Tool: 3,
    Contract: 4,
    Registry: 4,
    Document: 5,
    Component: 5,
  };
  return Object.prototype.hasOwnProperty.call(ranks, type) ? ranks[type] : 6;
}

function visualNodeKey(node) {
  return [node.graph_id || node.macro_requirement_id || "graph", node.id].join("::");
}

function visualRelationEndpointKey(relation, endpointId) {
  return [relation.graph_id || relation.macro_requirement_id || "graph", endpointId].join("::");
}

function compareGraphNodes(a, b) {
  return (a.macro_requirement_id || "").localeCompare(b.macro_requirement_id || "") ||
    (a.graph_id || "").localeCompare(b.graph_id || "") ||
    a.id.localeCompare(b.id);
}

function layerY(rank) {
  const rows = {
    0: 120,
    1: 350,
    2: 660,
    3: 970,
    4: 1125,
    5: 1125,
  };
  return rows[rank] || 1125;
}

/**
 * Builds a deterministic layered graph layout for the project model HTML page.
 *
 * Traceability:
 * - Macro requirement: MR-0000
 * - Origin ADR: MR-0000/ADR-0001
 * - Implements requirement: MR-0000REQ-0002
 */
function buildLayout(nodes) {
  const groups = new Map();

  for (const node of [...nodes].sort((a, b) => typeRank(a.type) - typeRank(b.type) || compareGraphNodes(a, b))) {
    const rank = typeRank(node.type);
    if (!groups.has(rank)) groups.set(rank, []);
    groups.get(rank).push(node);
  }

  const positions = new Map();
  const left = 120;
  const right = width - 120;

  for (const [rank, group] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = [...group].sort(compareGraphNodes);
    const step = sorted.length > 1 ? (right - left) / (sorted.length - 1) : 0;

    sorted.forEach((node, index) => {
      positions.set(visualNodeKey(node), {
        x: sorted.length > 1 ? left + step * index : width / 2,
        y: layerY(rank),
      });
    });
  }

  return positions;
}

function shortLabel(value, maxLength) {
  const text = String(value ?? "");
  return text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text;
}

function createCanonicalReading(relation) {
  const canonicalLabel = relation.forward_label || relation.predicate;
  const inverseLabel = relation.inverse_label || relation.predicate;

  return {
    source: relation.subject,
    target: relation.object,
    sourceKey: visualRelationEndpointKey(relation, relation.subject),
    targetKey: visualRelationEndpointKey(relation, relation.object),
    label: canonicalLabel,
    readingType: "canonical",
    title:
      "canonical: " + relation.subject + " " + canonicalLabel + " " + relation.object +
      " / inverse: " + relation.object + " " + inverseLabel + " " + relation.subject,
  };
}

function createInverseReading(relation) {
  const canonicalLabel = relation.forward_label || relation.predicate;
  const inverseLabel = relation.inverse_label || relation.predicate;

  return {
    source: relation.object,
    target: relation.subject,
    sourceKey: visualRelationEndpointKey(relation, relation.object),
    targetKey: visualRelationEndpointKey(relation, relation.subject),
    label: inverseLabel,
    readingType: "inverse",
    title:
      "inverse: " + relation.object + " " + inverseLabel + " " + relation.subject +
      " / canonical: " + relation.subject + " " + canonicalLabel + " " + relation.object,
  };
}

function buildRelationReadings(relations) {
  return relations.flatMap((relation) => [
    createCanonicalReading(relation),
    createInverseReading(relation),
  ]);
}

function getVisibleRelationReadings(relations) {
  const allReadings = buildRelationReadings(relations);

  if (relationReadingFilter === "both") {
    return allReadings;
  }

  return allReadings.filter((reading) => reading.readingType === relationReadingFilter);
}

function setRelationReadingFilter(nextFilter) {
  relationReadingFilter = nextFilter;
  renderGraph();
}

function renderDirectionControls(visibleCount) {
  canonicalOnlyButton.setAttribute("aria-pressed", relationReadingFilter === "canonical" ? "true" : "false");
  inverseOnlyButton.setAttribute("aria-pressed", relationReadingFilter === "inverse" ? "true" : "false");
  bothViewsButton.setAttribute("aria-pressed", relationReadingFilter === "both" ? "true" : "false");

  const labelByFilter = {
    canonical: "canonical only",
    inverse: "inverse only",
    both: "canonical + inverse",
  };
  graphMode.textContent = labelByFilter[relationReadingFilter] || relationReadingFilter;
  visibleRelations.textContent = visibleCount + " rendered relation readings";
}

function clearGraph() {
  while (viewport.firstChild) {
    viewport.removeChild(viewport.firstChild);
  }
}

function renderGraph() {
  clearGraph();
  const positions = buildLayout(graphData.nodes);
  const visibleRelationReadings = getVisibleRelationReadings(graphData.relations);

  const edgeLayer = appendSvg(viewport, "g", { "aria-label": "Relations" });
  const labelLayer = appendSvg(viewport, "g", { "aria-label": "Relation labels" });
  const nodeLayer = appendSvg(viewport, "g", { "aria-label": "Nodes" });

  visibleRelationReadings.forEach((visualRelation, index) => {
    const source = positions.get(visualRelation.sourceKey);
    const target = positions.get(visualRelation.targetKey);
    if (!source || !target) return;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const startX = source.x + (dx / length) * nodeRadius;
    const startY = source.y + (dy / length) * nodeRadius;
    const endX = target.x - (dx / length) * (nodeRadius + 10);
    const endY = target.y - (dy / length) * (nodeRadius + 10);
    const offsetBase = relationReadingFilter === "both" ? 20 : 14;
    const offset = ((index % 5) - 2) * offsetBase;
    const normalX = -dy / length;
    const normalY = dx / length;
    const controlX = (startX + endX) / 2 + normalX * offset;
    const controlY = (startY + endY) / 2 + normalY * offset;
    const labelX = (startX + endX + controlX) / 3;
    const labelY = (startY + endY + controlY) / 3;
    const comparisonClass = relationReadingFilter === "both" ? " comparison" : "";

    const path = appendSvg(edgeLayer, "path", {
      class: "graph-edge " + visualRelation.readingType + comparisonClass,
      d: "M" + startX + "," + startY + " Q" + controlX + "," + controlY + " " + endX + "," + endY,
      "marker-end": "url(#graphArrow)",
      "data-reading-type": visualRelation.readingType,
      "data-source": visualRelation.source,
      "data-target": visualRelation.target,
      "data-label": visualRelation.label,
    });
    const title = appendSvg(path, "title");
    title.textContent = visualRelation.title;

    const label = appendSvg(labelLayer, "text", {
      class: "graph-edge-label " + visualRelation.readingType + comparisonClass,
      x: labelX,
      y: labelY,
      "text-anchor": "middle",
      "data-reading-type": visualRelation.readingType,
      "data-source": visualRelation.source,
      "data-target": visualRelation.target,
    });
    label.textContent = visualRelation.label;
  });

  graphData.nodes.forEach((node) => {
    const position = positions.get(visualNodeKey(node));
    if (!position) return;
    const group = appendSvg(nodeLayer, "g", {
      class: "graph-node",
      transform: "translate(" + position.x + " " + position.y + ")",
      tabindex: "0",
    });
    const title = appendSvg(group, "title");
    title.textContent = node.id + " — " + node.label + " [" + node.type + "]";
    appendSvg(group, "circle", { r: nodeRadius });
    const idText = appendSvg(group, "text", { class: "node-id", y: -12, "text-anchor": "middle" });
    idText.textContent = shortLabel(node.id, 22);
    const labelText = appendSvg(group, "text", { class: "node-label", y: 8, "text-anchor": "middle" });
    labelText.textContent = shortLabel(node.label, 28);
    const typeText = appendSvg(group, "text", { class: "node-type", y: 27, "text-anchor": "middle" });
    typeText.textContent = node.type;
  });

  renderDirectionControls(visibleRelationReadings.length);
  renderTransform();
}

function zoomAt(scaleFactor, centerX = width / 2, centerY = height / 2) {
  const nextScale = Math.max(0.35, Math.min(3.5, transform.scale * scaleFactor));
  const ratio = nextScale / transform.scale;
  transform.x = centerX - (centerX - transform.x) * ratio;
  transform.y = centerY - (centerY - transform.y) * ratio;
  transform.scale = nextScale;
  renderTransform();
}

function resetZoom() {
  transform = { x: 0, y: 0, scale: 1 };
  renderTransform();
}

canonicalOnlyButton.addEventListener("click", () => setRelationReadingFilter("canonical"));
inverseOnlyButton.addEventListener("click", () => setRelationReadingFilter("inverse"));
bothViewsButton.addEventListener("click", () => setRelationReadingFilter("both"));

document.getElementById("zoomIn").addEventListener("click", () => zoomAt(1.2));
document.getElementById("zoomOut").addEventListener("click", () => zoomAt(1 / 1.2));
document.getElementById("zoomReset").addEventListener("click", resetZoom);

svg.addEventListener("wheel", (event) => {
  event.preventDefault();
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());
  zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, svgPoint.x, svgPoint.y);
}, { passive: false });

svg.addEventListener("pointerdown", (event) => {
  svg.setPointerCapture(event.pointerId);
  svg.classList.add("dragging");
  dragStart = { clientX: event.clientX, clientY: event.clientY, x: transform.x, y: transform.y };
});

svg.addEventListener("pointermove", (event) => {
  if (!dragStart) return;
  transform.x = dragStart.x + event.clientX - dragStart.clientX;
  transform.y = dragStart.y + event.clientY - dragStart.clientY;
  renderTransform();
});

svg.addEventListener("pointerup", () => {
  svg.classList.remove("dragging");
  dragStart = null;
});

svg.addEventListener("pointercancel", () => {
  svg.classList.remove("dragging");
  dragStart = null;
});

renderGraph();
</script>
`);
}

function renderFiles(groups) {
  const flatFiles = groups.flatMap((group) => group.files.map((file) => ({ ...file, group: group.label })));
  const pageData = jsonForScript(flatFiles);

  writePage("files.html", "Project model files", `
<section class="card">
  <h2>Filters</h2>
  <div class="filters">
    <label>Text
      <input id="textFilter" type="search" placeholder="Search file path or group">
    </label>
    <label>Group
      <select id="groupFilter">
        <option value="">All groups</option>
        ${groups.map((group) => `<option value="${escapeHtml(group.label)}">${escapeHtml(group.label)}</option>`).join("")}
      </select>
    </label>
  </div>
</section>
<section class="card">
  <h2>Files <span class="badge" id="count"></span></h2>
  <div id="files"></div>
</section>
<script>
const rows = ${pageData};
function esc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function includesText(row, text) {
  if (!text) return true;
  return [row.group, row.path].join(" ").toLowerCase().includes(text.toLowerCase());
}
function render() {
  const text = document.getElementById("textFilter").value.trim();
  const group = document.getElementById("groupFilter").value;
  const filtered = rows.filter((row) => includesText(row, text) && (!group || row.group === group));
  document.getElementById("count").textContent = filtered.length + " / " + rows.length;

  const body = filtered.map((row) =>
    "<tr>" +
    "<td>" + esc(row.group) + "</td>" +
    "<td><a href=\\"" + esc(row.page) + "\\"><code>" + esc(row.path) + "</code></a></td>" +
    "<td>" + (row.exists ? "exists" : "missing") + "</td>" +
    "</tr>"
  ).join("");

  document.getElementById("files").innerHTML = filtered.length
    ? "<table><thead><tr><th>Group</th><th>Path</th><th>Status</th></tr></thead><tbody>" + body + "</tbody></table>"
    : "<p class=\\"empty\\">No files match the active filters.</p>";
}
["textFilter","groupFilter"].forEach((id) => {
  document.getElementById(id).addEventListener(id === "textFilter" ? "input" : "change", render);
});
render();
</script>
`);

  for (const file of flatFiles) {
    writePage(file.page, file.path, `
<section class="card">
  <p><a class="button-link" href="files.html">Back to files</a></p>
  <p><span class="badge">${escapeHtml(file.group)}</span> <span class="badge">${file.exists ? "exists" : "missing"}</span></p>
  <pre>${escapeHtml(file.content || "No content.")}</pre>
</section>
`);
  }
}

const data = {
  macroRequirements: collectMacroRequirements(),
  taxonomies: collectTaxonomies(),
  requirements: collectRequirements(),
  decisions: collectDecisions(),
  graph: {
    nodes: collectGraphNodes(),
    relations: collectGraphRelations(),
  },
  files: collectFiles(),
};

renderHome(data);
renderMacroRequirements(data.macroRequirements);
renderTaxonomies(data.taxonomies);
renderRequirements(data.requirements);
renderAdr(data.decisions);
renderGraph(data.graph);
renderFiles(data.files);

console.log(`Repository root: ${rootDir}`);
console.log(`Project model directory: ${projectModelDir}`);
console.log(`Registers directory: ${registersDir}`);
console.log(`Project model pages generated in ${relativeProjectPath(outputDir)}`);
console.log(`Macro requirements: ${data.macroRequirements.length}`);
console.log(`Taxonomies: ${data.taxonomies.length}`);
console.log(`Requirements: ${data.requirements.length}`);
console.log(`ADR: ${data.decisions.length}`);
console.log(`Graph nodes: ${data.graph.nodes.length}`);
console.log(`SPO relations: ${data.graph.relations.length}`);
console.log("Generated pages: index.html, macro-requirements.html, requirements.html, adr.html, decisions.html, graph.html, taxonomies.html, files.html");

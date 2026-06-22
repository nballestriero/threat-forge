import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Filesystem-backed read adapter for Project Documentation Explorer source snapshots.
 *
 * @implementsRequirement MR-0002REQ-0007
 * @implementsRequirement MR-0002REQ-0011
 * @implementsRequirement MR-0002REQ-0030
 * @implementsRequirement MR-0002REQ-0031
 * @implementsRequirement MR-0002REQ-0033
 * @implementsRequirement MR-0002REQ-0035
 * @implementsRequirement MR-0002REQ-0036
 * @derivedFromDecision MR-0002/ADR-0002
 * @derivedFromDecision MR-0002/ADR-0003
 * @derivedFromDecision MR-0002/ADR-0007
 * @derivedFromDecision MR-0002/ADR-0008
 * @macroRequirement MR-0002
 *
 * This adapter is the first replaceable ProjectModelSourcePort implementation.
 * It reads existing governed registries and graph files, then returns a raw
 * read-only snapshot to the service layer. The adapter is intentionally hidden
 * behind the source port so controllers and future React components never read
 * YAML, Markdown, Git, filesystem, registry or graph files directly.
 *
 * Side effects: reads project-model registry and graph files from disk. It does
 * not mutate repository files, execute Git, generate pages, expose HTTP routes,
 * perform access-policy checks, or implement Base Analysis runtime/storage.
 */

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const defaultRootDir = path.resolve(currentDir, "..", "..", "..", "..");

/**
 * Reads UTF-8 text from a file while stripping a possible byte-order mark.
 *
 * @param {string} filePath - Absolute file path.
 * @returns {string} File text.
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "");
}

/**
 * Converts path separators to stable forward slashes.
 *
 * @param {string|null|undefined} value - Path-like value.
 * @returns {string} Normalized path string.
 */
function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

/**
 * Removes simple surrounding quotes from a scalar value.
 *
 * @param {string} value - Raw scalar.
 * @returns {string} Unquoted scalar.
 */
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

/**
 * Parses the small scalar subset used by governed YAML registries.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string|number|boolean|null|Array<object>|object} Parsed scalar.
 */
function parseScalar(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "[]") return [];
  if (trimmed === "{}") return {};
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+$/u.test(trimmed)) return Number.parseInt(trimmed, 10);
  return stripQuotes(trimmed);
}

/**
 * Counts leading space indentation for a YAML line.
 *
 * @param {string} line - YAML line.
 * @returns {number} Indentation width.
 */
function countIndent(line) {
  return line.match(/^ */u)?.[0].length ?? 0;
}

/**
 * Parses the restricted YAML subset already used by governed project-model tools.
 *
 * @param {string} text - YAML text.
 * @returns {Record<string, unknown>} Parsed object.
 */
function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = String(text ?? "").replace(/^\uFEFF/u, "").replace(/\r\n/gu, "\n").split("\n");

  function getParent(indent) {
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    return stack[stack.length - 1].value;
  }

  function nextMeaningfulLine(startIndex) {
    for (let index = startIndex + 1; index < lines.length; index += 1) {
      if (lines[index].trim() && !lines[index].trimStart().startsWith("#")) return lines[index];
    }
    return "";
  }

  function readBlock(startIndex, baseIndent) {
    const block = [];
    let index = startIndex;
    while (index + 1 < lines.length) {
      const next = lines[index + 1];
      const nextIndent = countIndent(next);
      if (next.trim() && nextIndent <= baseIndent) break;
      index += 1;
      const sliceAt = Math.min(baseIndent + 2, next.length);
      block.push(next.slice(sliceAt));
    }
    return { text: block.join("\n").replace(/\n$/u, ""), nextIndex: index };
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

/**
 * Reads and parses a governed YAML file.
 *
 * @param {string} filePath - Absolute file path.
 * @returns {Record<string, unknown>} Parsed YAML object.
 */
function readYaml(filePath) {
  return parseYaml(readText(filePath));
}

/**
 * Lists registry files matching a macro-scoped registry pattern.
 *
 * @param {string} directoryPath - Absolute directory path.
 * @param {RegExp} pattern - Filename pattern.
 * @returns {string[]} Absolute paths sorted by filename.
 */
function listRegistryFiles(directoryPath, pattern) {
  if (!fs.existsSync(directoryPath)) return [];
  return fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => path.join(directoryPath, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Creates a filesystem-backed project-model source adapter.
 *
 * @param {{rootDir?: string}} [options] - Adapter options.
 * @returns {{loadSnapshot(): Promise<Record<string, unknown>>}} ProjectModelSourcePort implementation.
 */
export function createFilesystemProjectModelSourceAdapter(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? defaultRootDir);
  const projectModelDir = path.join(rootDir, "docs", "reference", "project-model");
  const registersDir = path.join(projectModelDir, "registers");

  function resolveProjectPath(projectPath) {
    return path.join(rootDir, normalizeProjectPath(projectPath));
  }

  function loadMacroRequirements() {
    const registryPath = path.join(registersDir, "macro-requirements.registry.yml");
    const registry = readYaml(registryPath);
    return (registry.macro_requirements ?? []).map((entry) => ({
      ...entry,
      source_path: normalizeProjectPath(path.relative(rootDir, registryPath)),
    }));
  }

  function loadRequirements() {
    const requirementsDir = path.join(registersDir, "requirements");
    return listRegistryFiles(requirementsDir, /^MR-\d{4}\.requirements\.registry\.yml$/u).flatMap((registryPath) => {
      const registry = readYaml(registryPath);
      const macroRequirementId = String(registry.macro_requirement_id ?? "");
      return (registry.requirements ?? []).map((entry) => ({
        ...entry,
        macro_requirement_id: macroRequirementId,
        source_path: normalizeProjectPath(path.relative(rootDir, registryPath)),
      }));
    });
  }

  function loadDecisions() {
    const decisionsDir = path.join(registersDir, "decisions");
    return listRegistryFiles(decisionsDir, /^MR-\d{4}\.decisions\.registry\.yml$/u).flatMap((registryPath) => {
      const registry = readYaml(registryPath);
      const macroRequirementId = String(registry.macro_requirement_id ?? "");
      return (registry.decisions ?? []).map((entry) => ({
        ...entry,
        local_id: String(entry.id ?? ""),
        id: `${macroRequirementId}/${entry.id}`,
        macro_requirement_id: macroRequirementId,
        source_path: normalizeProjectPath(path.relative(rootDir, registryPath)),
      }));
    });
  }

  function loadTaxonomies() {
    const registryPath = path.join(registersDir, "taxonomies.registry.yml");
    if (!fs.existsSync(registryPath)) return [];
    const registry = readYaml(registryPath);
    return Object.entries(registry.taxonomies ?? {}).map(([taxonomyId, values]) => ({
      id: taxonomyId,
      title: taxonomyId.replaceAll("_", " "),
      values: Array.isArray(values) ? values : [],
      source_path: normalizeProjectPath(path.relative(rootDir, registryPath)),
    }));
  }

  function loadGraph() {
    const graphIndexPath = path.join(registersDir, "graph.index.yml");
    const graphIndex = readYaml(graphIndexPath);
    const graphNodes = [];
    const graphRelations = [];

    for (const graphEntry of graphIndex.graphs ?? []) {
      const graphPath = resolveProjectPath(graphEntry.path);
      if (!fs.existsSync(graphPath)) continue;
      const graph = readYaml(graphPath);
      const graphId = String(graph.graph_id ?? graphEntry.graph_id ?? "");
      const graphSourcePath = normalizeProjectPath(graphEntry.path);

      for (const node of graph.nodes ?? []) {
        graphNodes.push({
          ...node,
          graph_id: graphId,
          graph_path: graphSourcePath,
        });
      }

      for (const relation of graph.spo_relations ?? []) {
        graphRelations.push({
          ...relation,
          graph_id: graphId,
          graph_path: graphSourcePath,
        });
      }
    }

    return { graphNodes, graphRelations };
  }

  return Object.freeze({
    async loadSnapshot() {
      const graph = loadGraph();
      return {
        macroRequirements: loadMacroRequirements(),
        requirements: loadRequirements(),
        decisions: loadDecisions(),
        taxonomies: loadTaxonomies(),
        graphNodes: graph.graphNodes,
        graphRelations: graph.graphRelations,
      };
    },
  });
}

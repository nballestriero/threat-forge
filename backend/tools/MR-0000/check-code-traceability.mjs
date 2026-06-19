#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Deterministic bidirectional graph/source-code traceability checker.
 *
 * @implementsRequirement MR-0001REQ-0020
 * @implementsRequirement MR-0001REQ-0021
 * @derivedFromDecision MR-0001/ADR-0008
 * @macroRequirement MR-0001
 * @macroRequirement MR-0000
 *
 * This tool validates that governed source-code declarations and project-model
 * graph implementation relations agree in both directions for code artifacts.
 * A graph relation `Requirement implemented_by Tool/SourceModule` must be
 * mirrored by an `@implementsRequirement` declaration in the referenced source
 * file, and every source-code `@implementsRequirement` declaration must point
 * back to a graph implementation relation for the same source path.
 *
 * Side effects: reads project-model Requirement registries, graph registries,
 * and repository source files; writes diagnostics to stdout/stderr; exits
 * non-zero when traceability is inconsistent. It does not mutate files, infer
 * missing graph relations, rewrite JSDoc, validate non-code artifacts, generate
 * RTM reports, or replace future richer code/documentation traceability views.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..", "..", "..");
const projectModelDir = path.join(rootDir, "docs", "reference", "project-model");
const registersDir = path.join(projectModelDir, "registers");
const requirementsDir = path.join(registersDir, "requirements");
const graphIndexPath = path.join(registersDir, "graph.index.yml");

const codeArtifactTypes = new Set(["Tool", "SourceModule"]);
const codeExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const sourceScanRoots = ["backend/tools", "tools/docs"];
const errors = [];

/**
 * Reads UTF-8 text from a file while stripping a possible byte-order mark.
 *
 * @param {string} filePath - Absolute path of the file to read.
 * @returns {string} File contents without a leading UTF-8 BOM.
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "");
}

/**
 * Converts path separators to stable forward slashes.
 *
 * @param {string|null|undefined} value - Path-like value.
 * @returns {string} Normalized path text.
 */
function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

/**
 * Resolves a repository-relative path against the repository root.
 *
 * @param {string|null|undefined} projectPath - Repository-relative path.
 * @returns {string} Absolute path, or an empty string when input is blank.
 */
function resolveProjectPath(projectPath) {
  const normalized = normalizeProjectPath(projectPath);
  return normalized ? path.join(rootDir, normalized) : "";
}

/**
 * Converts an absolute file path to a repository-relative display path.
 *
 * @param {string} filePath - Absolute path to display.
 * @returns {string} Repository-relative path using forward slashes.
 */
function relativeProjectPath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

/**
 * Removes surrounding single or double quotes from a simple YAML scalar.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string} Unquoted scalar text when quotes are present.
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
 * Parses a simple scalar value used by the governed project-model YAML files.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string|number|boolean|null|Array<object>|object} Parsed scalar value.
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
 * @returns {number} Number of leading spaces.
 */
function countIndent(line) {
  return line.match(/^ */u)?.[0].length ?? 0;
}

/**
 * Parses the restricted YAML subset used by current governed registries.
 *
 * @param {string} text - YAML text.
 * @returns {Record<string, unknown>} Parsed YAML object.
 */
function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = String(text ?? "").replace(/^\uFEFF/u, "").replace(/\r\n/gu, "\n").split("\n");

  function getParent(indent) {
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
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
 * @param {string} filePath - YAML file path.
 * @returns {Record<string, unknown>} Parsed YAML object.
 */
function readYaml(filePath) {
  return parseYaml(readText(filePath));
}

/**
 * Adds a value to a map of sets.
 *
 * @param {Map<string, Set<string>>} map - Map to update.
 * @param {string} key - Map key.
 * @param {string} value - Set value.
 * @returns {void}
 */
function addToSetMap(map, key, value) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

/**
 * Returns a stable key for a Requirement/artifact implementation relation.
 *
 * @param {string} requirementId - Requirement id.
 * @param {string} nodeId - Graph artifact node id.
 * @returns {string} Relation key.
 */
function implementationKey(requirementId, nodeId) {
  return `${requirementId}::${nodeId}`;
}

/**
 * Detects whether a repository-relative path points to a source-code artifact.
 *
 * @param {string} projectPath - Repository-relative path.
 * @returns {boolean} True for supported source-code file extensions.
 */
function isCodePath(projectPath) {
  return codeExtensions.has(path.extname(normalizeProjectPath(projectPath)));
}

/**
 * Detects whether a graph node represents a governed code artifact.
 *
 * @param {Record<string, unknown>} node - Graph node.
 * @returns {boolean} True when the node type/path identify a code artifact.
 */
function isCodeArtifactNode(node) {
  return codeArtifactTypes.has(String(node?.type ?? "")) && isCodePath(String(node?.path ?? ""));
}

/**
 * Extracts governed source traceability declarations from file text.
 *
 * @param {string} text - Source file contents.
 * @returns {{ implementsRequirements: Set<string> }} Parsed declarations.
 */
function parseSourceDeclarations(text) {
  const implementsRequirements = new Set();
  const tagPattern = /^\s*\*?\s*@implementsRequirement\s+([A-Za-z0-9-]+)\s*$/gmu;
  for (const match of text.matchAll(tagPattern)) {
    implementsRequirements.add(match[1]);
  }
  return { implementsRequirements };
}

/**
 * Recursively scans a directory for source files.
 *
 * @param {string} directoryPath - Absolute directory path.
 * @returns {string[]} Absolute source file paths.
 */
function collectSourceFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const childPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "artifacts") continue;
      files.push(...collectSourceFiles(childPath));
      continue;
    }
    if (entry.isFile() && isCodePath(childPath)) {
      files.push(childPath);
    }
  }
  return files;
}

/**
 * Loads all governed Requirement ids from MR-specific Requirement registries.
 *
 * @returns {Set<string>} Known Requirement ids.
 */
function loadRequirementIds() {
  const requirementIds = new Set();
  for (const entry of fs.readdirSync(requirementsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !/^MR-\d{4}\.requirements\.registry\.yml$/u.test(entry.name)) continue;
    const registryPath = path.join(requirementsDir, entry.name);
    const registry = readYaml(registryPath);
    for (const requirement of registry.requirements ?? []) {
      if (requirement?.id) requirementIds.add(String(requirement.id));
    }
  }
  return requirementIds;
}

/**
 * Loads graph nodes and SPO relations from the graph index.
 *
 * @returns {{ nodesById: Map<string, Record<string, unknown>>, implementationRelations: Set<string>, implementedByByNode: Map<string, Set<string>>, graphFiles: string[] }} Graph model.
 */
function loadGraphTraceability() {
  const nodesById = new Map();
  const implementationRelations = new Set();
  const implementedByByNode = new Map();
  const graphFiles = [];

  const graphIndex = readYaml(graphIndexPath);
  for (const graphEntry of graphIndex.graphs ?? []) {
    const graphPath = resolveProjectPath(graphEntry.path);
    graphFiles.push(normalizeProjectPath(graphEntry.path));

    if (!fs.existsSync(graphPath)) {
      errors.push(`Graph file does not exist: ${normalizeProjectPath(graphEntry.path)}`);
      continue;
    }

    const graph = readYaml(graphPath);
    const localNodeIds = new Set();

    for (const node of graph.nodes ?? []) {
      if (!node?.id) continue;
      const nodeId = String(node.id);
      localNodeIds.add(nodeId);

      if (nodesById.has(nodeId)) {
        const previous = nodesById.get(nodeId);
        const previousPath = normalizeProjectPath(previous.path);
        const currentPath = normalizeProjectPath(node.path);
        if (previousPath !== currentPath || String(previous.type ?? "") !== String(node.type ?? "")) {
          errors.push(`Graph node ${nodeId} has inconsistent definitions across graph files.`);
        }
        continue;
      }

      nodesById.set(nodeId, { ...node, graph_path: normalizeProjectPath(graphEntry.path) });
    }

    for (const relation of graph.spo_relations ?? []) {
      if (relation?.predicate !== "implemented_by") continue;
      const requirementId = String(relation.subject ?? "");
      const nodeId = String(relation.object ?? "");
      implementationRelations.add(implementationKey(requirementId, nodeId));
      addToSetMap(implementedByByNode, nodeId, requirementId);

      if (!localNodeIds.has(requirementId)) {
        errors.push(`${normalizeProjectPath(graphEntry.path)} implemented_by relation subject is not a local graph node: ${requirementId}`);
      }
      if (!localNodeIds.has(nodeId)) {
        errors.push(`${normalizeProjectPath(graphEntry.path)} implemented_by relation object is not a local graph node: ${nodeId}`);
      }
    }
  }

  return { nodesById, implementationRelations, implementedByByNode, graphFiles };
}

/**
 * Builds a repository path to graph node ids index for code artifacts.
 *
 * @param {Map<string, Record<string, unknown>>} nodesById - Graph nodes.
 * @returns {Map<string, Set<string>>} Normalized path to code node ids.
 */
function buildCodePathIndex(nodesById) {
  const pathToNodeIds = new Map();
  for (const [nodeId, node] of nodesById.entries()) {
    if (!isCodeArtifactNode(node)) continue;
    const projectPath = normalizeProjectPath(node.path);
    addToSetMap(pathToNodeIds, projectPath, nodeId);
  }
  return pathToNodeIds;
}

/**
 * Validates that graph implementation relations are mirrored in code JSDoc.
 *
 * @param {Map<string, Record<string, unknown>>} nodesById - Graph nodes by id.
 * @param {Map<string, Set<string>>} implementedByByNode - Requirement ids implemented by node id.
 * @returns {void}
 */
function validateGraphToCode(nodesById, implementedByByNode) {
  for (const [nodeId, requirementIds] of implementedByByNode.entries()) {
    const node = nodesById.get(nodeId);
    if (!isCodeArtifactNode(node)) continue;

    const projectPath = normalizeProjectPath(node.path);
    const filePath = resolveProjectPath(projectPath);
    if (!fs.existsSync(filePath)) {
      errors.push(`Graph code artifact node ${nodeId} path does not exist: ${projectPath}`);
      continue;
    }

    const declarations = parseSourceDeclarations(readText(filePath));
    for (const requirementId of requirementIds) {
      if (!declarations.implementsRequirements.has(requirementId)) {
        errors.push(
          `Graph-to-code traceability mismatch: ${requirementId} implemented_by ${nodeId} (${projectPath}) ` +
            `but source file does not declare @implementsRequirement ${requirementId}.`,
        );
      }
    }
  }
}

/**
 * Validates that source-code JSDoc implementation declarations have graph links.
 *
 * @param {Set<string>} requirementIds - Known Requirement ids.
 * @param {Map<string, Set<string>>} pathToNodeIds - Repository path to graph code node ids.
 * @param {Set<string>} implementationRelations - Graph implementation relation keys.
 * @returns {void}
 */
function validateCodeToGraph(requirementIds, pathToNodeIds, implementationRelations) {
  const sourceFiles = sourceScanRoots.flatMap((projectPath) => collectSourceFiles(resolveProjectPath(projectPath)));

  for (const filePath of sourceFiles) {
    const projectPath = relativeProjectPath(filePath);
    const declarations = parseSourceDeclarations(readText(filePath));
    if (declarations.implementsRequirements.size === 0) continue;

    const graphNodeIds = pathToNodeIds.get(projectPath) ?? new Set();
    if (graphNodeIds.size === 0) {
      errors.push(
        `Code-to-graph traceability mismatch: ${projectPath} declares @implementsRequirement but has no Tool/SourceModule graph node with the same path.`,
      );
      continue;
    }

    for (const requirementId of declarations.implementsRequirements) {
      if (!requirementIds.has(requirementId)) {
        errors.push(`${projectPath} declares unknown @implementsRequirement ${requirementId}.`);
        continue;
      }

      const hasReverseRelation = [...graphNodeIds].some((nodeId) =>
        implementationRelations.has(implementationKey(requirementId, nodeId)),
      );

      if (!hasReverseRelation) {
        errors.push(
          `Code-to-graph traceability mismatch: ${projectPath} declares @implementsRequirement ${requirementId} ` +
            `but no graph relation ${requirementId} implemented_by <node with this path> exists.`,
        );
      }
    }
  }
}

const requirementIds = loadRequirementIds();
const { nodesById, implementationRelations, implementedByByNode } = loadGraphTraceability();
const pathToNodeIds = buildCodePathIndex(nodesById);

validateGraphToCode(nodesById, implementedByByNode);
validateCodeToGraph(requirementIds, pathToNodeIds, implementationRelations);

if (errors.length > 0) {
  console.error("Code traceability check failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Code traceability check passed.");
console.log("Implemented requirement: MR-0001REQ-0020");
console.log("Implemented requirement: MR-0001REQ-0021");
console.log(`Graph code artifact nodes: ${pathToNodeIds.size}`);
console.log(`Source roots: ${sourceScanRoots.join(", ")}`);

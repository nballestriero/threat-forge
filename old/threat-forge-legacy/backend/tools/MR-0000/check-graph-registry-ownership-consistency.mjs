#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Graph and registry ownership consistency checker for governed Project Model records.
 *
 * @implementsRequirement MR-0000REQ-0024
 * @derivedFromDecision MR-0000/ADR-0009
 * @macroRequirement MR-0000
 *
 * This checker validates the first semantic ownership boundary between governed
 * decision registries, requirement registries and graph SPO relations. It proves
 * that each macro-requirement graph points at its registered ADR ownership,
 * each registered requirement has a graph justification matching its
 * `derived_from_decision_id`, and existing graph `belongs_to` relations do not
 * contradict the owning registry.
 *
 * Side effects: reads governed graph, decision and requirement registries, runs
 * isolated negative fixtures, writes diagnostics to stdout/stderr, and exits
 * non-zero when registry ownership and graph ownership diverge. It does not
 * rewrite legacy graph records, infer missing historical reverse relations,
 * migrate ADR identifiers, execute child-project gates, ingest a Knowledge
 * Graph, or replace future stricter canonical-ownership cleanup work.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = process.env.TF_GRAPH_REGISTRY_OWNERSHIP_ROOT
  ? path.resolve(process.env.TF_GRAPH_REGISTRY_OWNERSHIP_ROOT)
  : path.resolve(scriptDir, "..", "..", "..");
const negativeFixturesDir = process.env.TF_GRAPH_REGISTRY_OWNERSHIP_NEGATIVE_FIXTURES_DIR
  ? path.resolve(process.env.TF_GRAPH_REGISTRY_OWNERSHIP_NEGATIVE_FIXTURES_DIR)
  : path.join(scriptDir, "fixtures", "graph-registry-ownership-consistency", "negative");
const skipNegativeFixtures = process.env.TF_GRAPH_REGISTRY_OWNERSHIP_SKIP_NEGATIVE_FIXTURES === "1";
const errors = [];

const governedPaths = {
  graphIndex: "docs/reference/project-model/registers/graph.index.yml",
  decisionsDir: "docs/reference/project-model/registers/decisions",
  requirementsDir: "docs/reference/project-model/registers/requirements",
};

/**
 * Reads UTF-8 text while stripping a possible byte-order mark.
 *
 * @param {string} filePath - Absolute path of the file to read.
 * @returns {string} File text with normalized line endings.
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "").replace(/\r\n/gu, "\n");
}

/**
 * Normalizes a path-like value to repository display form.
 *
 * @param {string|null|undefined} value - Path-like value.
 * @returns {string} Normalized path text.
 */
function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

/**
 * Resolves a repository-relative path against the active root.
 *
 * @param {string} projectPath - Repository-relative path.
 * @returns {string} Absolute path.
 */
function resolveProjectPath(projectPath) {
  return path.join(rootDir, normalizeProjectPath(projectPath));
}

/**
 * Records a deterministic validation diagnostic.
 *
 * @param {string} message - Human-readable diagnostic.
 * @returns {void}
 */
function addError(message) {
  errors.push(message);
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
 * Parses a simple scalar value from the governed YAML subset.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string|number|boolean|null|unknown[]|Record<string, unknown>} Parsed scalar.
 */
function parseScalar(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "[]") return [];
  if (trimmed === "{}") return {};
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    return inner ? inner.split(",").map((entry) => stripQuotes(entry.trim())) : [];
  }
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
 * @param {string} projectPath - Repository-relative YAML path.
 * @returns {Record<string, unknown>} Parsed YAML object.
 */
function readProjectYaml(projectPath) {
  return parseYaml(readText(resolveProjectPath(projectPath)));
}

/**
 * Returns an array value or an empty array for invalid input.
 *
 * @param {unknown} value - Candidate array.
 * @returns {unknown[]} Array value or empty array.
 */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Returns a stable non-empty string representation.
 *
 * @param {unknown} value - Candidate value.
 * @returns {string} Normalized string.
 */
function asId(value) {
  return String(value ?? "").trim();
}

/**
 * Builds a lookup key for a graph SPO relation.
 *
 * @param {string} subject - Relation subject.
 * @param {string} predicate - Relation predicate.
 * @param {string} object - Relation object.
 * @returns {string} Stable relation key.
 */
function relationKey(subject, predicate, object) {
  return `${subject}\u0000${predicate}\u0000${object}`;
}

/**
 * Returns the expected registry path for a macro-requirement decision registry.
 *
 * @param {string} macroRequirementId - Macro requirement id.
 * @returns {string} Repository-relative registry path.
 */
function decisionRegistryPath(macroRequirementId) {
  return `${governedPaths.decisionsDir}/${macroRequirementId}.decisions.registry.yml`;
}

/**
 * Returns the expected registry path for a macro-requirement requirement registry.
 *
 * @param {string} macroRequirementId - Macro requirement id.
 * @returns {string} Repository-relative registry path.
 */
function requirementRegistryPath(macroRequirementId) {
  return `${governedPaths.requirementsDir}/${macroRequirementId}.requirements.registry.yml`;
}

/**
 * Builds per-predicate graph relation indexes.
 *
 * @param {unknown[]} relations - Parsed SPO relations.
 * @returns {{ all: Set<string>, byPredicate: Map<string, unknown[]>, byObjectPredicate: Map<string, unknown[]> }} Relation indexes.
 */
function indexRelations(relations) {
  const all = new Set();
  const byPredicate = new Map();
  const byObjectPredicate = new Map();

  for (const relation of relations) {
    const subject = asId(relation?.subject);
    const predicate = asId(relation?.predicate);
    const object = asId(relation?.object);
    if (!subject || !predicate || !object) continue;

    all.add(relationKey(subject, predicate, object));
    if (!byPredicate.has(predicate)) byPredicate.set(predicate, []);
    byPredicate.get(predicate).push({ subject, predicate, object });

    const objectPredicateKey = `${object}\u0000${predicate}`;
    if (!byObjectPredicate.has(objectPredicateKey)) byObjectPredicate.set(objectPredicateKey, []);
    byObjectPredicate.get(objectPredicateKey).push({ subject, predicate, object });
  }

  return { all, byPredicate, byObjectPredicate };
}

/**
 * Ensures a graph relation exists.
 *
 * @param {Set<string>} relationSet - Indexed relation key set.
 * @param {string} graphId - Graph id for diagnostics.
 * @param {string} subject - Expected subject.
 * @param {string} predicate - Expected predicate.
 * @param {string} object - Expected object.
 * @returns {void}
 */
function requireRelation(relationSet, graphId, subject, predicate, object) {
  if (!relationSet.has(relationKey(subject, predicate, object))) {
    addError(`${graphId} is missing ownership relation: ${subject} ${predicate} ${object}`);
  }
}

/**
 * Validates one macro-requirement graph against its decision and requirement registries.
 *
 * @param {Record<string, unknown>} graphRef - Graph-index entry.
 * @returns {{ decisions: number, requirements: number, relations: number }} Graph validation counts.
 */
function validateGraphOwnership(graphRef) {
  const graphPath = normalizeProjectPath(graphRef?.path);
  if (!graphPath || !fs.existsSync(resolveProjectPath(graphPath))) {
    addError(`Graph index references a missing graph: ${graphPath || "<empty>"}`);
    return { decisions: 0, requirements: 0, relations: 0 };
  }

  const graph = readProjectYaml(graphPath);
  const graphId = asId(graph.graph_id || graphRef?.graph_id || graphPath);
  const macroRequirementId = asId(graph.macro_requirement_id);
  if (!macroRequirementId) {
    addError(`${graphId} does not declare macro_requirement_id`);
    return { decisions: 0, requirements: 0, relations: 0 };
  }

  const decisionPath = decisionRegistryPath(macroRequirementId);
  const requirementPath = requirementRegistryPath(macroRequirementId);
  if (!fs.existsSync(resolveProjectPath(decisionPath))) addError(`${graphId} owner decision registry is missing: ${decisionPath}`);
  if (!fs.existsSync(resolveProjectPath(requirementPath))) addError(`${graphId} owner requirement registry is missing: ${requirementPath}`);
  if (!fs.existsSync(resolveProjectPath(decisionPath)) || !fs.existsSync(resolveProjectPath(requirementPath))) {
    return { decisions: 0, requirements: 0, relations: asArray(graph.spo_relations).length };
  }

  const decisionRegistry = readProjectYaml(decisionPath);
  const requirementRegistry = readProjectYaml(requirementPath);
  const decisions = asArray(decisionRegistry.decisions);
  const requirements = asArray(requirementRegistry.requirements);
  const relations = asArray(graph.spo_relations);
  const indexedRelations = indexRelations(relations);
  const decisionIds = new Set(decisions.map((decision) => asId(decision?.id)).filter(Boolean));
  const requirementIds = new Set(requirements.map((requirement) => asId(requirement?.id)).filter(Boolean));

  if (asId(decisionRegistry.macro_requirement_id) !== macroRequirementId) {
    addError(`${decisionPath} macro_requirement_id does not match ${graphId}: ${asId(decisionRegistry.macro_requirement_id)} != ${macroRequirementId}`);
  }
  if (asId(requirementRegistry.macro_requirement_id) !== macroRequirementId) {
    addError(`${requirementPath} macro_requirement_id does not match ${graphId}: ${asId(requirementRegistry.macro_requirement_id)} != ${macroRequirementId}`);
  }

  for (const decision of decisions) {
    const decisionId = asId(decision?.id);
    if (!decisionId) continue;
    if (asId(decision?.macro_requirement_id) !== macroRequirementId) {
      addError(`${decisionPath} decision ${decisionId} declares macro_requirement_id ${asId(decision?.macro_requirement_id)} but graph owner is ${macroRequirementId}`);
    }
    requireRelation(indexedRelations.all, graphId, macroRequirementId, "has_decision", decisionId);
  }

  for (const relation of indexedRelations.byPredicate.get("has_decision") ?? []) {
    if (relation.subject !== macroRequirementId) {
      addError(`${graphId} has_decision uses non-owner subject: ${relation.subject} has_decision ${relation.object}; expected subject ${macroRequirementId}`);
    }
    if (!decisionIds.has(relation.object)) {
      addError(`${graphId} has_decision targets an unregistered decision: ${relation.object}`);
    }
  }

  for (const relation of indexedRelations.byPredicate.get("belongs_to") ?? []) {
    if (decisionIds.has(relation.subject) && relation.object !== macroRequirementId) {
      addError(`${graphId} decision ${relation.subject} belongs_to ${relation.object} but registry owner is ${macroRequirementId}`);
    }
    if (requirementIds.has(relation.subject) && relation.object !== macroRequirementId) {
      addError(`${graphId} requirement ${relation.subject} belongs_to ${relation.object} but registry owner is ${macroRequirementId}`);
    }
  }

  for (const requirement of requirements) {
    const requirementId = asId(requirement?.id);
    const derivedFromDecisionId = asId(requirement?.derived_from_decision_id);
    if (!requirementId) continue;

    requireRelation(indexedRelations.all, graphId, requirementId, "belongs_to", macroRequirementId);

    if (!derivedFromDecisionId) {
      addError(`${requirementPath} requirement ${requirementId} is missing derived_from_decision_id`);
      continue;
    }
    if (!decisionIds.has(derivedFromDecisionId)) {
      addError(`${requirementPath} requirement ${requirementId} derives from unregistered decision: ${derivedFromDecisionId}`);
      continue;
    }
    requireRelation(indexedRelations.all, graphId, derivedFromDecisionId, "justifies", requirementId);
  }

  for (const relation of indexedRelations.byPredicate.get("justifies") ?? []) {
    if (!decisionIds.has(relation.subject)) {
      addError(`${graphId} justifies uses an unregistered decision owner: ${relation.subject}`);
    }
    if (!requirementIds.has(relation.object)) {
      addError(`${graphId} justifies targets an unregistered requirement: ${relation.object}`);
      continue;
    }
    // The first enforcement pass treats matching registry-derived `justifies`
    // relations as canonical and still tolerates pre-existing historical extra
    // justifications. A stricter cleanup pass can later remove or manifest those
    // legacy duplicates after the governed consolidation audit.
  }

  return { decisions: decisions.length, requirements: requirements.length, relations: relations.length };
}

/**
 * Validates graph and registry ownership consistency across indexed graphs.
 *
 * @returns {{ graphs: number, decisions: number, requirements: number, relations: number }} Validation summary.
 */
function validateGraphRegistryOwnership() {
  if (!fs.existsSync(resolveProjectPath(governedPaths.graphIndex))) {
    addError(`Graph index is missing: ${governedPaths.graphIndex}`);
    return { graphs: 0, decisions: 0, requirements: 0, relations: 0 };
  }

  const graphIndex = readProjectYaml(governedPaths.graphIndex);
  const graphs = asArray(graphIndex.graphs);
  const counts = { graphs: graphs.length, decisions: 0, requirements: 0, relations: 0 };

  for (const graphRef of graphs) {
    const graphCounts = validateGraphOwnership(graphRef);
    counts.decisions += graphCounts.decisions;
    counts.requirements += graphCounts.requirements;
    counts.relations += graphCounts.relations;
  }

  return counts;
}

/**
 * Safely writes fixture files under a temporary root.
 *
 * @param {string} tempRoot - Temporary repository root.
 * @param {Record<string, string>} files - Repository-relative fixture files.
 * @returns {void}
 */
function writeFixtureFiles(tempRoot, files) {
  for (const [projectPath, contents] of Object.entries(files ?? {})) {
    const normalizedPath = normalizeProjectPath(projectPath);
    const targetPath = path.resolve(tempRoot, normalizedPath);
    if (!targetPath.startsWith(tempRoot + path.sep)) {
      throw new Error(`Fixture file escapes temporary root: ${projectPath}`);
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, String(contents ?? ""), "utf8");
  }
}

/**
 * Runs a single negative fixture through this checker in an isolated tree.
 *
 * @param {string} fixturePath - Fixture JSON path.
 * @returns {{ passed: boolean, id: string, diagnostic?: string }} Fixture result.
 */
function runNegativeFixture(fixturePath) {
  const fixture = JSON.parse(readText(fixturePath));
  const fixtureId = String(fixture.id ?? path.basename(fixturePath, ".json"));
  const expectedDiagnostic = String(fixture.expectedDiagnostic ?? "").trim();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `tf-graph-registry-ownership-${fixtureId}-`));

  try {
    writeFixtureFiles(tempRoot, fixture.files ?? {});
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: tempRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        TF_GRAPH_REGISTRY_OWNERSHIP_ROOT: tempRoot,
        TF_GRAPH_REGISTRY_OWNERSHIP_SKIP_NEGATIVE_FIXTURES: "1",
      },
    });

    const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    if (result.status === 0) return { passed: false, id: fixtureId, diagnostic: "fixture unexpectedly passed" };
    if (expectedDiagnostic && !combinedOutput.includes(expectedDiagnostic)) {
      return {
        passed: false,
        id: fixtureId,
        diagnostic: `expected diagnostic fragment was not found: ${expectedDiagnostic}`,
      };
    }
    return { passed: true, id: fixtureId };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

/**
 * Proves representative invalid graph/registry ownership states fail closed.
 *
 * @returns {number} Number of negative fixtures executed.
 */
function validateNegativeFixtures() {
  if (skipNegativeFixtures || !fs.existsSync(negativeFixturesDir)) return 0;

  const fixturePaths = fs
    .readdirSync(negativeFixturesDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.join(negativeFixturesDir, name));

  for (const fixturePath of fixturePaths) {
    const result = runNegativeFixture(fixturePath);
    if (!result.passed) errors.push(`Negative fixture ${result.id} failed: ${result.diagnostic}`);
  }

  return fixturePaths.length;
}

const counts = validateGraphRegistryOwnership();
const negativeFixtureCount = validateNegativeFixtures();

if (errors.length > 0) {
  console.error("Graph and registry ownership consistency check failed.");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Graph and registry ownership consistency check passed.");
console.log("Implemented requirement: MR-0000REQ-0024");
console.log(`Graph index: ${governedPaths.graphIndex}`);
console.log(`Graphs checked: ${counts.graphs}`);
console.log(`Decisions checked: ${counts.decisions}`);
console.log(`Requirements checked: ${counts.requirements}`);
console.log(`SPO relations checked: ${counts.relations}`);
console.log(`Negative fixtures: ${negativeFixtureCount}`);

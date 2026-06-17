#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..", "..");
const registersDir = path.join(rootDir, "docs", "reference", "project-model", "registers");

const contractPath = path.join(registersDir, "graph-format.contract.json");
const graphIndexPath = path.join(registersDir, "graph.index.yml");
const taxonomiesPath = path.join(registersDir, "taxonomies.registry.yml");

const errors = [];

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
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
  if (/^-?\d+$/u.test(trimmed)) return Number.parseInt(trimmed, 10);
  return stripQuotes(trimmed);
}

function countIndent(line) {
  return line.match(/^ */u)?.[0].length ?? 0;
}

function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = String(text ?? "").replace(/\r\n/gu, "\n").split("\n");

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
    return { text: block.join("\n").replace(/\n$/u, ""), nextIndex: i };
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

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function ensureFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`${label} does not exist: ${relativeProjectPath(filePath)}`);
    return false;
  }
  return true;
}

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function validateRequiredFields(object, requiredFields, context) {
  for (const field of requiredFields) {
    if (!isPresent(object?.[field]) && !Array.isArray(object?.[field])) {
      errors.push(`${context} is missing required field: ${field}`);
    }
  }
}

function validateAllowedFields(object, allowedFields, context) {
  const allowed = new Set(allowedFields);
  for (const field of Object.keys(object ?? {})) {
    if (!allowed.has(field)) {
      errors.push(`${context} has unsupported field: ${field}`);
    }
  }
}

function validateArrayFields(object, arrayFields, context) {
  for (const field of arrayFields) {
    if (!Array.isArray(object?.[field])) {
      errors.push(`${context} field must be an array: ${field}`);
    }
  }
}

function collectTaxonomyIds(taxonomies, taxonomyName) {
  const entries = taxonomies?.taxonomies?.[taxonomyName];
  if (!Array.isArray(entries)) return new Set();
  return new Set(entries.map((entry) => entry.id).filter(Boolean));
}

function validateGraphIndex(graphIndex) {
  if (!Array.isArray(graphIndex.graphs)) {
    errors.push("graph.index.yml must define a graphs array.");
    return [];
  }

  return graphIndex.graphs.filter((entry, index) => {
    const context = `graph index entry #${index + 1}`;
    validateRequiredFields(entry, ["graph_id", "path"], context);
    return isPresent(entry.graph_id) && isPresent(entry.path);
  });
}

function validateGraphFile(graphEntry, contract, allowedNodeTypes, allowedPredicates) {
  const graphPath = resolveProjectPath(graphEntry.path);
  if (!ensureFileExists(graphPath, `graph file ${graphEntry.graph_id}`)) return;

  const graph = readYaml(graphPath);
  const context = `${relativeProjectPath(graphPath)}`;

  validateRequiredFields(graph, contract.graph_file.required_fields, context);
  validateAllowedFields(graph, contract.graph_file.allowed_fields, context);
  validateArrayFields(graph, contract.graph_file.array_fields, context);

  if (isPresent(graph.graph_id) && graph.graph_id !== graphEntry.graph_id) {
    errors.push(`${context} graph_id must match graph.index.yml entry ${graphEntry.graph_id}.`);
  }

  const nodeIds = new Set();

  for (const [index, node] of (Array.isArray(graph.nodes) ? graph.nodes : []).entries()) {
    const nodeContext = `${context} node #${index + 1}`;
    validateRequiredFields(node, contract.node.required_fields, nodeContext);
    validateAllowedFields(node, contract.node.allowed_fields, nodeContext);

    if (isPresent(node.id)) {
      if (nodeIds.has(node.id)) errors.push(`${nodeContext} duplicates node id: ${node.id}`);
      nodeIds.add(node.id);
    }

    if (isPresent(node.type) && !allowedNodeTypes.has(node.type)) {
      errors.push(`${nodeContext} uses unknown node type: ${node.type}`);
    }
  }

  for (const [index, relation] of (Array.isArray(graph.spo_relations) ? graph.spo_relations : []).entries()) {
    const relationContext = `${context} SPO relation #${index + 1}`;
    validateRequiredFields(relation, contract.spo_relation.required_fields, relationContext);
    validateAllowedFields(relation, contract.spo_relation.allowed_fields, relationContext);

    if (isPresent(relation.predicate) && !allowedPredicates.has(relation.predicate)) {
      errors.push(`${relationContext} uses unknown predicate: ${relation.predicate}`);
    }

    if (isPresent(relation.subject) && !nodeIds.has(relation.subject)) {
      errors.push(`${relationContext} references unknown subject node: ${relation.subject}`);
    }

    if (isPresent(relation.object) && !nodeIds.has(relation.object)) {
      errors.push(`${relationContext} references unknown object node: ${relation.object}`);
    }
  }
}

function main() {
  ensureFileExists(contractPath, "graph format contract");
  ensureFileExists(graphIndexPath, "graph index");
  ensureFileExists(taxonomiesPath, "taxonomies registry");

  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exit(1);
  }

  const contract = readJson(contractPath);
  const graphIndex = readYaml(graphIndexPath);
  const taxonomies = readYaml(taxonomiesPath);

  const allowedNodeTypes = collectTaxonomyIds(taxonomies, contract.node.type_taxonomy);
  const allowedPredicates = collectTaxonomyIds(taxonomies, contract.spo_relation.predicate_taxonomy);

  if (allowedNodeTypes.size === 0) {
    errors.push(`No node types found in taxonomy: ${contract.node.type_taxonomy}`);
  }

  if (allowedPredicates.size === 0) {
    errors.push(`No SPO predicates found in taxonomy: ${contract.spo_relation.predicate_taxonomy}`);
  }

  for (const graphEntry of validateGraphIndex(graphIndex)) {
    validateGraphFile(graphEntry, contract, allowedNodeTypes, allowedPredicates);
  }

  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exit(1);
  }

  console.log("Graph format check passed.");
}

main();

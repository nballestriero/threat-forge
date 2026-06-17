#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Deterministic ADR registry field governance checker.
 *
 * @implementsRequirement MR-0001REQ-0004
 * @implementsRequirement MR-0000REQ-0004
 * @derivedFromDecision ADR-0004
 * @derivedFromDecision MR-0000/ADR-0001
 * @macroRequirement MR-0001
 * @macroRequirement MR-0000
 *
 * This tool validates the structured fields of governed ADR registry records
 * against the ADR governance registry. It checks controlled field presence,
 * controlled value membership, identifier uniqueness, macro-requirement
 * references, macro-requirement-scoped ADR identity, normalized body paths,
 * and unsupported fields. It intentionally
 * does not validate ADR Markdown body headings; body format validation belongs
 * to MR-0001REQ-0005 and must be implemented by a separate tool.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..", "..");
const projectModelDir = path.join(rootDir, "docs", "reference", "project-model");
const registersDir = path.join(projectModelDir, "registers");
const decisionsDir = path.join(registersDir, "decisions");
const adrGovernancePath = path.join(decisionsDir, "adr-governance.registry.yml");
const macroRequirementsPath = path.join(registersDir, "macro-requirements.registry.yml");

const errors = [];

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "");
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
  const lines = String(text ?? "").replace(/^\uFEFF/u, "").replace(/\r\n/gu, "\n").split("\n");

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

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function ensureFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`${label} does not exist: ${relativeProjectPath(filePath)}`);
    return false;
  }
  return true;
}

function collectIds(entries, context) {
  const ids = new Set();
  for (const [index, entry] of (Array.isArray(entries) ? entries : []).entries()) {
    if (!isPresent(entry?.id)) {
      errors.push(`${context} #${index + 1} is missing id.`);
      continue;
    }
    if (ids.has(entry.id)) {
      errors.push(`${context} contains duplicate id: ${entry.id}`);
    }
    ids.add(entry.id);
  }
  return ids;
}

function requireArray(value, context) {
  if (!Array.isArray(value)) {
    errors.push(`${context} must be an array.`);
    return [];
  }
  return value;
}

function validateIsoDate(value, context) {
  const raw = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(raw)) {
    errors.push(`${context} must be a date in YYYY-MM-DD format.`);
    return;
  }

  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== raw) {
    errors.push(`${context} must be a valid calendar date.`);
  }
}

function validateNonEmptyText(value, context) {
  if (!isPresent(value)) {
    errors.push(`${context} must be non-empty text.`);
  }
}

function validateKnownValue(value, allowedValues, context, valueLabel) {
  if (!allowedValues.has(value)) {
    errors.push(`${context} ${valueLabel} must be one of: ${Array.from(allowedValues).join(", ")}.`);
  }
}

function listAdrRegistryFiles() {
  if (!ensureFileExists(decisionsDir, "decisions registry directory")) return [];

  return fs
    .readdirSync(decisionsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".decisions.registry.yml"))
    .map((entry) => path.join(decisionsDir, entry.name))
    .sort((left, right) => relativeProjectPath(left).localeCompare(relativeProjectPath(right)));
}

function buildRuleContext(registryPath, adrId, fieldId) {
  return `${relativeProjectPath(registryPath)} ADR ${adrId || "<missing id>"} field ${fieldId}`;
}

function validateAdrRecord({ adr, registryPath, fieldDefinitions, allowedFieldIds, adrIdPattern, bodyPathPattern, statusIds, decisionTypeIds, macroRequirementIds, seenAdrIds }) {
  const adrId = adr?.id;
  const recordContext = `${relativeProjectPath(registryPath)} ADR ${adrId || "#unknown"}`;

  for (const field of fieldDefinitions) {
    const context = buildRuleContext(registryPath, adrId, field.id);
    const value = adr?.[field.id];

    if (field.required === true && !isPresent(value)) {
      errors.push(`${context} is required.`);
      continue;
    }

    if (!isPresent(value)) continue;

    switch (field.rule) {
      case "must_match_adr_id_pattern": {
        if (!adrIdPattern.test(String(value))) {
          errors.push(`${context} must match pattern ${adrIdPattern.source}.`);
        }

        const macroRequirementScope = isPresent(adr?.macro_requirement_id)
          ? String(adr.macro_requirement_id)
          : "<missing macro_requirement_id>";
        const scopedAdrId = `${macroRequirementScope}/${value}`;

        if (seenAdrIds.has(scopedAdrId)) {
          errors.push(`${recordContext} duplicates ADR id ${value} within macro requirement ${macroRequirementScope}.`);
        } else {
          seenAdrIds.add(scopedAdrId);
        }
        break;
      }

      case "must_be_non_empty_text":
        validateNonEmptyText(value, context);
        break;

      case "must_exist_in_decision_statuses":
        validateKnownValue(value, statusIds, context, "status");
        break;

      case "must_exist_in_decision_types":
        validateKnownValue(value, decisionTypeIds, context, "decision_type");
        break;

      case "must_be_iso_date":
        validateIsoDate(value, context);
        break;

      case "must_reference_existing_macro_requirement":
        validateKnownValue(value, macroRequirementIds, context, "macro_requirement_id");
        break;

      case "must_match_body_path_pattern_and_exist": {
        const normalizedBodyPath = normalizeProjectPath(value);
        if (String(value).includes("\\")) {
          errors.push(`${context} must use '/' path separators.`);
        }
        if (!bodyPathPattern.test(normalizedBodyPath)) {
          errors.push(`${context} must match pattern ${bodyPathPattern.source}.`);
        }
        const bodyFilePath = resolveProjectPath(normalizedBodyPath);
        if (!fs.existsSync(bodyFilePath)) {
          errors.push(`${context} points to a missing file: ${normalizedBodyPath}.`);
        } else if (!fs.statSync(bodyFilePath).isFile()) {
          errors.push(`${context} must point to a file: ${normalizedBodyPath}.`);
        }
        break;
      }

      default:
        errors.push(`${context} uses unsupported ADR governance rule: ${field.rule}.`);
        break;
    }
  }

  for (const fieldName of Object.keys(adr ?? {})) {
    if (!allowedFieldIds.has(fieldName)) {
      errors.push(`${recordContext} has unsupported field: ${fieldName}.`);
    }
  }
}

function validateRegistryFile({ registryPath, governance, macroRequirementIds, statusIds, decisionTypeIds, fieldDefinitions, allowedFieldIds, seenAdrIds }) {
  const registry = readYaml(registryPath);
  const context = relativeProjectPath(registryPath);

  if (!Array.isArray(registry.decisions)) {
    errors.push(`${context} must define a decisions array.`);
    return;
  }

  if (isPresent(registry.macro_requirement_id) && !macroRequirementIds.has(registry.macro_requirement_id)) {
    errors.push(`${context} macro_requirement_id must reference an existing macro requirement: ${registry.macro_requirement_id}.`);
  }

  const adrIdPattern = new RegExp(governance.adr_id_pattern);
  const bodyPathPattern = new RegExp(governance.body_path_pattern);

  for (const adr of registry.decisions) {
    if (isPresent(registry.macro_requirement_id) && isPresent(adr?.macro_requirement_id) && adr.macro_requirement_id !== registry.macro_requirement_id) {
      errors.push(
        `${context} ADR ${adr.id || "#unknown"} macro_requirement_id must match registry macro_requirement_id ${registry.macro_requirement_id}.`,
      );
    }

    validateAdrRecord({
      adr,
      registryPath,
      fieldDefinitions,
      allowedFieldIds,
      adrIdPattern,
      bodyPathPattern,
      statusIds,
      decisionTypeIds,
      macroRequirementIds,
      seenAdrIds,
    });
  }
}

function main() {
  ensureFileExists(adrGovernancePath, "ADR governance registry");
  ensureFileExists(macroRequirementsPath, "macro requirements registry");

  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exit(1);
  }

  const governance = readYaml(adrGovernancePath);
  const macroRequirementsRegistry = readYaml(macroRequirementsPath);

  const statusIds = collectIds(requireArray(governance.decision_statuses, "decision_statuses"), "decision status");
  const decisionTypeIds = collectIds(requireArray(governance.decision_types, "decision_types"), "decision type");
  const fieldDefinitions = requireArray(governance.adr_registry_fields, "adr_registry_fields");
  const allowedFieldIds = collectIds(fieldDefinitions, "ADR registry field");
  const macroRequirementIds = collectIds(
    requireArray(macroRequirementsRegistry.macro_requirements, "macro_requirements"),
    "macro requirement",
  );

  if (!isPresent(governance.adr_id_pattern)) {
    errors.push("adr-governance.registry.yml must define adr_id_pattern.");
  }
  if (!isPresent(governance.body_path_pattern)) {
    errors.push("adr-governance.registry.yml must define body_path_pattern.");
  }

  for (const field of fieldDefinitions) {
    if (!isPresent(field.id)) continue;
    if (field.required !== true && field.required !== false) {
      errors.push(`ADR registry field ${field.id} required must be true or false.`);
    }
    if (field.controlled !== true && field.controlled !== false) {
      errors.push(`ADR registry field ${field.id} controlled must be true or false.`);
    }
    if (!isPresent(field.rule)) {
      errors.push(`ADR registry field ${field.id} must define rule.`);
    }
  }

  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exit(1);
  }

  const seenAdrIds = new Set();
  for (const registryPath of listAdrRegistryFiles()) {
    validateRegistryFile({
      registryPath,
      governance,
      macroRequirementIds,
      statusIds,
      decisionTypeIds,
      fieldDefinitions,
      allowedFieldIds,
      seenAdrIds,
    });
  }

  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exit(1);
  }

  console.log("ADR registry field check passed.");
  console.log("Implemented requirement: MR-0001REQ-0004");
  console.log("Implemented requirement: MR-0000REQ-0004");
}

main();

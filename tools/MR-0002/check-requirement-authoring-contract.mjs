#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildRequirementAuthoringSchema } from "./build-requirement-authoring-schema.mjs";

/**
 * @file Requirement authoring contract checker.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0003GOV-0002
 * @derivedFromDecision MR-0002/ADR-0004
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Validates that the deterministic Requirement authoring catalog, JSON Schema
 * projection and governed request runner describe the same choices, meanings
 * and parent Requirement rules. It also executes isolated negative regression
 * fixtures and the runner integration suite while proving that verification is
 * read-only with respect to the repository.
 *
 * Side effects: executes the catalog and schema builders, reads the governed
 * negative fixture registry and Git status, and writes diagnostics only to
 * stdout/stderr. It creates or modifies no repository file.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = process.env.TF_REQUIREMENT_AUTHORING_CONTRACT_CHECK_ROOT
  ? path.resolve(process.env.TF_REQUIREMENT_AUTHORING_CONTRACT_CHECK_ROOT)
  : path.resolve(scriptDir, "..", "..");

const catalogBuilderProjectPath =
  "tools/MR-0002/build-requirement-authoring-catalog.mjs";
const schemaBuilderProjectPath =
  "tools/MR-0002/build-requirement-authoring-schema.mjs";
const fixturesProjectPath =
  "tools/MR-0002/fixtures/requirement-authoring-contract/negative-fixtures.registry.json";
const runnerTestProjectPath =
  "tools/MR-0002/tests/run-requirement-authoring.test.mjs";
const implementedRequirementId = "MR-0002ADR-0004REQ-0003GOV-0002";

/** @param {unknown} value @param {string} label @returns {Record<string, unknown>} */
function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

/** @param {unknown} value @param {string} label @returns {Array<unknown>} */
function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

/** @param {unknown} value @param {string} label @returns {string} */
function requireString(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${label} must be a non-empty string.`);
  return normalized;
}

/** @param {unknown} value @param {string} label @returns {boolean} */
function requireBoolean(value, label) {
  if (typeof value !== "boolean") throw new Error(`${label} must be boolean.`);
  return value;
}

/** @param {string} left @param {string} right @returns {number} */
function compareIds(left, right) {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

/** @param {unknown} value @returns {unknown} */
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/** @param {unknown[]} left @param {unknown[]} right @returns {boolean} */
function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** @param {unknown} left @param {unknown} right @returns {boolean} */
function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Runs one process from the repository root.
 *
 * @param {string} command - Executable path or command.
 * @param {string[]} args - Process arguments.
 * @returns {{status: number|null, stdout: string, stderr: string, error?: Error}} Process result.
 */
function runProcess(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      TF_AUTHORING_ROOT: rootDir,
      TF_REQUIREMENT_AUTHORING_ROOT: rootDir,
      TF_REQUIREMENT_AUTHORING_CATALOG_ROOT: rootDir,
      TF_REQUIREMENT_AUTHORING_SCHEMA_ROOT: rootDir,
    },
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}


/**
 * Executes one deterministic Node test suite.
 *
 * @param {string} projectPath - Repository-relative test path.
 * @param {string} label - Diagnostic label.
 * @returns {number} Executed suite count.
 */
function runNodeTestSuite(projectPath, label) {
  const absolutePath = path.join(
    rootDir,
    ...projectPath.split("/"),
  );
  const result = runProcess(
    process.execPath,
    ["--test", absolutePath],
  );
  if (result.error || result.status !== 0) {
    const diagnostics = `${result.stdout}\n${result.stderr}`.trim();
    throw new Error(
      `${label} failed with exit code ${result.status ?? "unknown"}` +
        (diagnostics ? `: ${diagnostics}` : "."),
    );
  }
  return 1;
}

/** @param {string} projectPath @returns {string} */
function readProjectFile(projectPath) {
  const absolutePath = path.join(rootDir, ...projectPath.split("/"));
  if (!fs.existsSync(absolutePath)) throw new Error(`Required file is missing: ${projectPath}`);
  return fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/u, "");
}

/** @returns {string} */
function captureRepositoryStatus() {
  const result = runProcess("git", ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (result.error || result.status !== 0) {
    throw new Error(`Unable to inspect repository status: ${result.stderr || result.error?.message || "unknown error"}`);
  }
  return result.stdout;
}

/**
 * Executes a governed JSON builder and parses its stdout.
 *
 * @param {string} projectPath - Repository-relative builder path.
 * @param {string} label - Diagnostic label.
 * @returns {{text: string, value: Record<string, unknown>}} Builder output.
 */
function runJsonBuilder(projectPath, label) {
  const absolutePath = path.join(rootDir, ...projectPath.split("/"));
  const result = runProcess(process.execPath, [absolutePath]);
  if (result.error || result.status !== 0) {
    const diagnostics = `${result.stdout}\n${result.stderr}`.trim();
    throw new Error(
      `${label} failed with exit code ${result.status ?? "unknown"}` +
        (diagnostics ? `: ${diagnostics}` : "."),
    );
  }
  if (result.stderr.trim()) throw new Error(`${label} emitted unexpected stderr: ${result.stderr.trim()}`);
  try {
    return {
      text: result.stdout,
      value: requireObject(JSON.parse(result.stdout), `${label} output`),
    };
  } catch (error) {
    throw new Error(`${label} output is not valid JSON: ${error.message}`);
  }
}

/**
 * Requires a stable sorted array of unique string values.
 *
 * @param {string[]} values - Values to inspect.
 * @param {string} label - Diagnostic label.
 * @returns {void}
 */
function requireSortedUnique(values, label) {
  const sorted = [...values].sort(compareIds);
  if (!arraysEqual(values, sorted)) throw new Error(`${label} must use deterministic sorted order.`);
  if (new Set(values).size !== values.length) throw new Error(`${label} must not contain duplicate values.`);
}

/**
 * Normalizes and validates the catalog structure used by the projection check.
 *
 * @param {Record<string, unknown>} catalog - Catalog to normalize.
 * @returns {{sources: Array<Record<string, unknown>>, types: Array<Record<string, unknown>>, macros: Array<Record<string, unknown>>, counts: Record<string, number>}} Normalized catalog.
 */
function normalizeCatalog(catalog) {
  if (requireString(catalog.catalog_id, "catalog.catalog_id") !== "requirement-authoring-catalog") {
    throw new Error(`Unsupported catalog_id: ${catalog.catalog_id}`);
  }
  if (!Number.isInteger(catalog.schema_version) || catalog.schema_version < 1) {
    throw new Error("catalog.schema_version must be a positive integer.");
  }

  const sources = requireArray(catalog.sources, "catalog.sources").map((value) => {
    const source = requireObject(value, "catalog source");
    return {
      kind: requireString(source.kind, "catalog source kind"),
      path: requireString(source.path, "catalog source path"),
      schema_version: source.schema_version,
      registry_id: requireString(source.registry_id, "catalog source registry_id"),
    };
  });
  requireSortedUnique(sources.map((source) => source.path), "catalog.sources paths");

  const types = requireArray(catalog.requirement_types, "catalog.requirement_types").map((value) => {
    const type = requireObject(value, "catalog requirement type");
    const name = requireString(type.value, "catalog requirement type value");
    if (name === "specialized") {
      throw new Error("Catalog requirement_type must not contain abstract value specialized.");
    }
    return {
      value: name,
      meaning: requireString(type.meaning, `${name}.meaning`),
      is_specialized: requireBoolean(type.is_specialized, `${name}.is_specialized`),
      requires_parent_requirement: requireBoolean(
        type.requires_parent_requirement,
        `${name}.requires_parent_requirement`,
      ),
      allowed_parent_requirement_types: requireArray(
        type.allowed_parent_requirement_types,
        `${name}.allowed_parent_requirement_types`,
      ).map((entry) => requireString(entry, `${name}.allowed_parent_requirement_types entry`)),
    };
  });
  requireSortedUnique(types.map((type) => type.value), "catalog.requirement_types values");
  const typeByName = new Map(types.map((type) => [type.value, type]));
  for (const type of types) {
    requireSortedUnique(type.allowed_parent_requirement_types, `${type.value}.allowed_parent_requirement_types`);
    for (const parentType of type.allowed_parent_requirement_types) {
      if (!typeByName.has(parentType)) {
        throw new Error(`${type.value} allows unknown parent requirement type: ${parentType}`);
      }
    }
    if (type.requires_parent_requirement && type.allowed_parent_requirement_types.length === 0) {
      throw new Error(`${type.value} requires a parent but declares no allowed parent types.`);
    }
    if (!type.requires_parent_requirement && type.allowed_parent_requirement_types.length > 0) {
      throw new Error(`${type.value} forbids a parent but declares allowed parent types.`);
    }
  }

  let decisionCount = 0;
  let requirementCount = 0;
  const macros = requireArray(catalog.macro_requirements, "catalog.macro_requirements").map((macroValue) => {
    const macro = requireObject(macroValue, "catalog macro-requirement");
    const macroId = requireString(macro.id, "catalog macro-requirement id");
    const decisions = requireArray(macro.decisions, `${macroId}.decisions`).map((decisionValue) => {
      const decision = requireObject(decisionValue, `${macroId} decision`);
      const decisionId = requireString(decision.id, `${macroId} decision id`);
      const requirements = requireArray(decision.requirements, `${macroId}/${decisionId}.requirements`).map(
        (requirementValue) => {
          const requirement = requireObject(requirementValue, `${macroId}/${decisionId} Requirement`);
          const requirementType = requireString(requirement.requirement_type, "Requirement requirement_type");
          if (!typeByName.has(requirementType)) {
            throw new Error(`${requirement.id} uses unknown requirement_type: ${requirementType}`);
          }
          return {
            id: requireString(requirement.id, "Requirement id"),
            title: requireString(requirement.title, "Requirement title"),
            status: requireString(requirement.status, "Requirement status"),
            requirement_type: requirementType,
            parent_requirement_id: requirement.parent_requirement_id
              ? requireString(requirement.parent_requirement_id, "Requirement parent_requirement_id")
              : null,
          };
        },
      );
      requireSortedUnique(requirements.map((requirement) => requirement.id), `${macroId}/${decisionId} Requirement ids`);
      requirementCount += requirements.length;
      return {
        id: decisionId,
        reference: requireString(decision.reference, `${macroId}/${decisionId}.reference`),
        title: requireString(decision.title, `${macroId}/${decisionId}.title`),
        status: requireString(decision.status, `${macroId}/${decisionId}.status`),
        requirements,
      };
    });
    requireSortedUnique(decisions.map((decision) => decision.id), `${macroId} Decision ids`);
    decisionCount += decisions.length;
    return {
      id: macroId,
      title: requireString(macro.title, `${macroId}.title`),
      status: requireString(macro.status, `${macroId}.status`),
      decisions,
    };
  });
  requireSortedUnique(macros.map((macro) => macro.id), "catalog macro-requirement ids");

  return {
    sources,
    types,
    macros,
    counts: {
      sources: sources.length,
      requirement_types: types.length,
      macro_requirements: macros.length,
      decisions: decisionCount,
      requirements: requirementCount,
    },
  };
}

/**
 * Converts one known schema condition to a stable semantic signature.
 *
 * @param {Record<string, unknown>} rule - allOf rule.
 * @returns {string} Condition signature.
 */
function conditionSignature(rule) {
  const condition = requireObject(rule.if, "schema allOf condition");
  const required = requireArray(condition.required, "schema allOf condition.required").map((value) =>
    requireString(value, "schema allOf required field"),
  );
  const properties = requireObject(condition.properties, "schema allOf condition.properties");
  const keys = Object.keys(properties);

  if (arraysEqual(required, ["requirement_type"]) && arraysEqual(keys, ["requirement_type"])) {
    const typeCondition = requireObject(properties.requirement_type, "requirement_type condition");
    return `type:${requireString(typeCondition.const, "requirement_type condition const")}`;
  }
  if (arraysEqual(required, ["macro_requirement_id"]) && arraysEqual(keys, ["macro_requirement_id"])) {
    const macroCondition = requireObject(properties.macro_requirement_id, "macro_requirement_id condition");
    return `macro:${requireString(macroCondition.const, "macro_requirement_id condition const")}`;
  }
  const parentFields = ["macro_requirement_id", "decision_id", "requirement_type"];
  if (arraysEqual(required, parentFields) && arraysEqual(keys, parentFields)) {
    return [
      "parent",
      requireString(requireObject(properties.macro_requirement_id, "parent macro condition").const, "parent macro const"),
      requireString(requireObject(properties.decision_id, "parent decision condition").const, "parent decision const"),
      requireString(requireObject(properties.requirement_type, "parent type condition").const, "parent type const"),
    ].join(":");
  }
  return `unknown:${JSON.stringify(condition)}`;
}

/**
 * Validates an enum projection against canonical entries.
 *
 * @param {string[]} errors - Mutable errors.
 * @param {unknown} nodeValue - Schema property node.
 * @param {Array<{value: string, description: string}>} expected - Canonical values and descriptions.
 * @param {string} label - Diagnostic label.
 * @returns {void}
 */
function validateEnumProjection(errors, nodeValue, expected, label) {
  try {
    const node = requireObject(nodeValue, label);
    const expectedValues = expected.map((entry) => entry.value);
    const expectedDescriptions = expected.map((entry) => entry.description);
    const values = requireArray(node.enum, `${label}.enum`);
    const descriptions = requireArray(node.markdownEnumDescriptions, `${label}.markdownEnumDescriptions`);
    const metadata = requireArray(node["x-threatforge-enum-metadata"], `${label}.x-threatforge-enum-metadata`);
    if (!arraysEqual(values, expectedValues)) {
      errors.push(`${label} enum diverges from the authoring catalog.`);
    }
    if (!arraysEqual(descriptions, expectedDescriptions)) {
      errors.push(`${label} descriptions diverge from canonical meanings.`);
    }
    const expectedMetadata = expected.map((entry) => ({
      value: entry.value,
      description: entry.description,
    }));
    if (!jsonEqual(metadata, expectedMetadata)) {
      errors.push(`${label} enum metadata diverges from canonical meanings.`);
    }
  } catch (error) {
    errors.push(error.message);
  }
}

/**
 * Validates the schema projection against the normalized catalog.
 *
 * @param {Record<string, unknown>} catalog - Original catalog.
 * @param {ReturnType<typeof normalizeCatalog>} normalized - Normalized catalog.
 * @param {Record<string, unknown>} schema - Schema projection.
 * @param {string[]} errors - Mutable errors.
 * @returns {void}
 */
function validateSchemaProjection(catalog, normalized, schema, errors) {
  try {
    const schemaDialect = requireString(schema.$schema, "schema.$schema");
    if (
      !schemaDialect.startsWith("https://json-schema.org/") &&
      !schemaDialect.startsWith("http://json-schema.org/")
    ) {
      errors.push("schema.$schema must identify an explicit JSON Schema dialect.");
    }
    if (requireString(schema.$id, "schema.$id") !== "urn:threatforge:schema:requirement-authoring-request:1") {
      errors.push("schema.$id is not the governed Requirement authoring schema identifier.");
    }
    if (schema.type !== "object") errors.push("schema.type must be object.");
    if (schema.additionalProperties !== false) errors.push("schema.additionalProperties must be false.");
    const required = requireArray(schema.required, "schema.required");
    const expectedRequired = ["macro_requirement_id", "decision_id", "requirement_type", "title"];
    if (!arraysEqual(required, expectedRequired)) errors.push("schema.required fields diverge from the authoring contract.");

    const properties = requireObject(schema.properties, "schema.properties");
    validateEnumProjection(
      errors,
      properties.requirement_type,
      normalized.types.map((type) => ({ value: type.value, description: type.meaning })),
      "schema.properties.requirement_type",
    );
    validateEnumProjection(
      errors,
      properties.macro_requirement_id,
      normalized.macros.map((macro) => ({
        value: macro.id,
        description: `${macro.title} — status: ${macro.status}`,
      })),
      "schema.properties.macro_requirement_id",
    );
    const concreteTypes = requireArray(
      requireObject(schema["x-threatforge"], "schema.x-threatforge").concrete_requirement_types,
      "schema.x-threatforge.concrete_requirement_types",
    );
    const expectedConcreteTypes = normalized.types.map((type) => ({
      value: type.value,
      is_specialized: type.is_specialized,
      requires_parent_requirement: type.requires_parent_requirement,
      allowed_parent_requirement_types: type.allowed_parent_requirement_types,
    }));
    if (!jsonEqual(concreteTypes, expectedConcreteTypes)) {
      errors.push("schema concrete Requirement type metadata diverges from the authoring catalog.");
    }

    const extension = requireObject(schema["x-threatforge"], "schema.x-threatforge");
    if (extension.catalog_id !== catalog.catalog_id || extension.catalog_schema_version !== catalog.schema_version) {
      errors.push("schema catalog identity metadata diverges from the authoring catalog.");
    }
    if (!jsonEqual(extension.sources, normalized.sources)) {
      errors.push("schema source metadata diverges from the authoring catalog.");
    }
    if (!arraysEqual(requireArray(extension.generated_fields, "schema generated_fields"), ["id", "status", "body_path"])) {
      errors.push("schema generated_fields diverge from the authoring contract.");
    }

    const rules = requireArray(schema.allOf, "schema.allOf");
    const actualSignatures = [];
    const rulesBySignature = new Map();
    for (const ruleValue of rules) {
      const rule = requireObject(ruleValue, "schema allOf rule");
      const signature = conditionSignature(rule);
      actualSignatures.push(signature);
      if (rulesBySignature.has(signature)) errors.push(`schema allOf contains duplicate condition: ${signature}`);
      rulesBySignature.set(signature, rule);
    }

    const expectedSignatures = [];
    for (const type of normalized.types) expectedSignatures.push(`type:${type.value}`);
    for (const macro of normalized.macros) {
      expectedSignatures.push(`macro:${macro.id}`);
      for (const decision of macro.decisions) {
        for (const type of normalized.types.filter((entry) => entry.requires_parent_requirement)) {
          expectedSignatures.push(`parent:${macro.id}:${decision.id}:${type.value}`);
        }
      }
    }
    if (!arraysEqual(actualSignatures, expectedSignatures)) {
      errors.push("schema conditional rule set or deterministic order diverges from the authoring catalog.");
    }

    for (const type of normalized.types) {
      const signature = `type:${type.value}`;
      const rule = rulesBySignature.get(signature);
      if (!rule) continue;
      const thenNode = requireObject(rule.then, `${signature}.then`);
      if (type.requires_parent_requirement) {
        const requiredFields = Array.isArray(thenNode.required) ? thenNode.required : [];
        if (!arraysEqual(requiredFields, ["parent_requirement_id"])) {
          errors.push(`${signature} must require parent_requirement_id.`);
        }
      } else {
        const notNode = thenNode.not && typeof thenNode.not === "object" && !Array.isArray(thenNode.not)
          ? thenNode.not
          : {};
        const forbiddenFields = Array.isArray(notNode.required) ? notNode.required : [];
        if (!arraysEqual(forbiddenFields, ["parent_requirement_id"])) {
          errors.push(`${signature} must forbid parent_requirement_id.`);
        }
      }
    }

    for (const macro of normalized.macros) {
      const macroRule = rulesBySignature.get(`macro:${macro.id}`);
      if (macroRule) {
        const thenNode = requireObject(macroRule.then, `macro:${macro.id}.then`);
        const decisionNode = requireObject(
          requireObject(thenNode.properties, `macro:${macro.id}.then.properties`).decision_id,
          `macro:${macro.id}.decision_id`,
        );
        validateEnumProjection(
          errors,
          decisionNode,
          macro.decisions.map((decision) => ({
            value: decision.id,
            description: `${decision.title} — ${decision.reference} — status: ${decision.status}`,
          })),
          `schema Decision projection for ${macro.id}`,
        );
      }

      for (const decision of macro.decisions) {
        for (const type of normalized.types.filter((entry) => entry.requires_parent_requirement)) {
          const signature = `parent:${macro.id}:${decision.id}:${type.value}`;
          const rule = rulesBySignature.get(signature);
          if (!rule) continue;
          const candidates = decision.requirements.filter((requirement) =>
            type.allowed_parent_requirement_types.includes(requirement.requirement_type),
          );
          if (candidates.length === 0) {
            if (rule.then !== false) errors.push(`${signature} must reject authoring because no applicable parent exists.`);
          } else {
            if (rule.then === false) {
              errors.push(`${signature} unexpectedly rejects available parent Requirements.`);
              continue;
            }
            const thenNode = requireObject(rule.then, `${signature}.then`);
            const parentNode = requireObject(
              requireObject(thenNode.properties, `${signature}.then.properties`).parent_requirement_id,
              `${signature}.parent_requirement_id`,
            );
            validateEnumProjection(
              errors,
              parentNode,
              candidates.map((requirement) => ({
                value: requirement.id,
                description: `${requirement.title} — type: ${requirement.requirement_type} — status: ${requirement.status}`,
              })),
              `schema parent Requirement projection for ${macro.id}/${decision.id}/${type.value}`,
            );
          }
        }
      }
    }
  } catch (error) {
    errors.push(error.message);
  }
}

/**
 * Validates catalog and schema coherence.
 *
 * @param {Record<string, unknown>} catalog - Catalog.
 * @param {Record<string, unknown>} schema - Schema.
 * @returns {{errors: string[], counts: Record<string, number>}} Validation result.
 */
function validateContract(catalog, schema) {
  const errors = [];
  let counts = {
    sources: 0,
    requirement_types: 0,
    macro_requirements: 0,
    decisions: 0,
    requirements: 0,
  };
  try {
    const normalized = normalizeCatalog(catalog);
    counts = normalized.counts;
    validateSchemaProjection(catalog, normalized, schema, errors);
  } catch (error) {
    errors.push(error.message);
  }
  return { errors, counts };
}

/** @param {Record<string, unknown>} schema @param {string} signature @returns {Record<string, unknown>} */
function findRule(schema, signature) {
  const rules = requireArray(schema.allOf, "schema.allOf");
  const match = rules
    .map((value) => requireObject(value, "schema allOf rule"))
    .find((rule) => conditionSignature(rule) === signature);
  if (!match) throw new Error(`Fixture cannot find schema rule: ${signature}`);
  return match;
}

/**
 * Applies one declared negative mutation.
 *
 * @param {string} mutation - Mutation identifier.
 * @param {Record<string, unknown>} catalog - Mutable catalog clone.
 * @param {Record<string, unknown>} schema - Mutable schema clone.
 * @returns {void}
 */
function applyMutation(mutation, catalog, schema) {
  if (mutation === "add-specialized-concrete-type") {
    requireArray(catalog.requirement_types, "catalog.requirement_types").push({
      value: "specialized",
      meaning: "Abstract category incorrectly exposed as a concrete type.",
      is_specialized: true,
      requires_parent_requirement: true,
      allowed_parent_requirement_types: ["functional"],
    });
    return;
  }
  if (mutation === "allow-unknown-parent-type") {
    const governance = requireArray(catalog.requirement_types, "catalog.requirement_types")
      .map((value) => requireObject(value, "catalog requirement type"))
      .find((type) => type.value === "governance");
    if (!governance) throw new Error("Fixture requires governance requirement type.");
    requireArray(governance.allowed_parent_requirement_types, "governance allowed parent types").push("unknown");
    return;
  }
  if (mutation === "remove-schema-requirement-type") {
    requireArray(
      requireObject(requireObject(schema.properties, "schema.properties").requirement_type, "requirement_type schema").enum,
      "requirement_type enum",
    ).pop();
    return;
  }
  if (mutation === "change-schema-requirement-type-description") {
    const descriptions = requireArray(
      requireObject(requireObject(schema.properties, "schema.properties").requirement_type, "requirement_type schema")
        .markdownEnumDescriptions,
      "requirement_type descriptions",
    );
    descriptions[0] = "Divergent description fixture";
    return;
  }
  if (mutation === "invert-governance-parent-rule") {
    findRule(schema, "type:governance").then = { not: { required: ["parent_requirement_id"] } };
    return;
  }
  if (mutation === "leak-decision-across-macro") {
    const macros = requireArray(catalog.macro_requirements, "catalog.macro_requirements").map((value) =>
      requireObject(value, "catalog macro-requirement"),
    );
    if (macros.length < 2) throw new Error("Fixture requires at least two Macro-requirements.");
    const leakedDecision = requireObject(
      requireArray(macros[1].decisions, `${macros[1].id}.decisions`)[0],
      "leaked Decision",
    );
    const rule = findRule(schema, `macro:${macros[0].id}`);
    const decisionNode = requireObject(
      requireObject(requireObject(rule.then, "macro rule then").properties, "macro rule properties").decision_id,
      "macro decision schema",
    );
    requireArray(decisionNode.enum, "macro decision enum").push(leakedDecision.id);
    return;
  }
  if (mutation === "add-invalid-parent-candidate") {
    const rules = requireArray(schema.allOf, "schema.allOf").map((value) => requireObject(value, "schema allOf rule"));
    const rule = rules.find((candidate) => {
      const signature = conditionSignature(candidate);
      return signature.startsWith("parent:") && candidate.then && candidate.then !== false;
    });
    if (!rule) throw new Error("Fixture requires at least one parent candidate rule.");
    const parentNode = requireObject(
      requireObject(requireObject(rule.then, "parent rule then").properties, "parent rule properties").parent_requirement_id,
      "parent Requirement schema",
    );
    requireArray(parentNode.enum, "parent Requirement enum").push("MR-9999ADR-9999REQ-9999");
    return;
  }
  if (mutation === "remove-generated-body-path") {
    const generatedFields = requireArray(
      requireObject(schema["x-threatforge"], "schema.x-threatforge").generated_fields,
      "schema generated_fields",
    );
    const index = generatedFields.indexOf("body_path");
    if (index === -1) throw new Error("Fixture requires generated body_path.");
    generatedFields.splice(index, 1);
    return;
  }
  throw new Error(`Unsupported negative fixture mutation: ${mutation}`);
}

/**
 * Executes deterministic negative fixture mutations.
 *
 * @param {Record<string, unknown>} catalog - Canonical catalog.
 * @param {Record<string, unknown>} schema - Canonical schema.
 * @param {string[]} errors - Mutable errors.
 * @returns {number} Fixture count.
 */
function validateNegativeFixtures(catalog, schema, errors) {
  let registry;
  try {
    registry = requireObject(JSON.parse(readProjectFile(fixturesProjectPath)), "fixture registry");
  } catch (error) {
    errors.push(`Unable to parse ${fixturesProjectPath}: ${error.message}`);
    return 0;
  }
  if (registry.schema_version !== 1) errors.push(`${fixturesProjectPath}.schema_version must be 1.`);
  if (registry.registry_id !== "requirement-authoring-contract-negative-fixtures") {
    errors.push(`${fixturesProjectPath}.registry_id is invalid.`);
  }
  const fixtures = requireArray(registry.fixtures, `${fixturesProjectPath}.fixtures`);
  if (fixtures.length === 0) {
    errors.push(`${fixturesProjectPath} must define a non-empty fixtures array.`);
    return 0;
  }
  const seenIds = new Set();
  for (const fixtureValue of fixtures) {
    try {
      const fixture = requireObject(fixtureValue, "negative fixture");
      const id = requireString(fixture.id, "negative fixture id");
      if (seenIds.has(id)) throw new Error(`Duplicate negative fixture id: ${id}`);
      seenIds.add(id);
      const mutation = requireString(fixture.mutation, `${id}.mutation`);
      const expected = requireString(fixture.expected_error_contains, `${id}.expected_error_contains`);
      const mutatedCatalog = cloneJson(catalog);
      const mutatedSchema = cloneJson(schema);
      applyMutation(mutation, mutatedCatalog, mutatedSchema);
      const result = validateContract(mutatedCatalog, mutatedSchema);
      const diagnostics = result.errors.join("\n");
      if (result.errors.length === 0) errors.push(`${id} negative fixture unexpectedly passed.`);
      if (!diagnostics.includes(expected)) {
        errors.push(`${id} did not emit expected diagnostic: ${expected}`);
      }
    } catch (error) {
      errors.push(`Negative fixture execution failed: ${error.message}`);
    }
  }
  return fixtures.length;
}

const errors = [];
let fixtureCount = 0;
let runnerSuiteCount = 0;
let counts = {
  sources: 0,
  requirement_types: 0,
  macro_requirements: 0,
  decisions: 0,
  requirements: 0,
};

try {
  const statusBefore = captureRepositoryStatus();
  const firstCatalog = runJsonBuilder(catalogBuilderProjectPath, "Requirement authoring catalog builder");
  const secondCatalog = runJsonBuilder(catalogBuilderProjectPath, "Requirement authoring catalog builder");
  if (firstCatalog.text !== secondCatalog.text) errors.push("Requirement authoring catalog output is not deterministic.");

  const firstSchema = runJsonBuilder(schemaBuilderProjectPath, "Requirement authoring JSON Schema builder");
  const secondSchema = runJsonBuilder(schemaBuilderProjectPath, "Requirement authoring JSON Schema builder");
  if (firstSchema.text !== secondSchema.text) errors.push("Requirement authoring JSON Schema output is not deterministic.");

  const directSchema = buildRequirementAuthoringSchema(firstCatalog.value);
  if (!jsonEqual(directSchema, firstSchema.value)) {
    errors.push("Schema CLI output diverges from buildRequirementAuthoringSchema(catalog).");
  }

  const positiveResult = validateContract(firstCatalog.value, firstSchema.value);
  counts = positiveResult.counts;
  errors.push(...positiveResult.errors);
  fixtureCount = validateNegativeFixtures(firstCatalog.value, firstSchema.value, errors);
  runnerSuiteCount = runNodeTestSuite(
    runnerTestProjectPath,
    "Requirement authoring runner integration suite",
  );

  const statusAfter = captureRepositoryStatus();
  if (statusAfter !== statusBefore) errors.push("Requirement authoring contract verification changed the repository working tree.");
} catch (error) {
  errors.push(error.message);
}

if (errors.length > 0) {
  console.error("Requirement authoring contract check failed.");
  console.error(`Implemented requirement: ${implementedRequirementId}`);
  console.error(`Catalog sources checked: ${counts.sources}`);
  console.error(`Requirement types checked: ${counts.requirement_types}`);
  console.error(`Macro-requirements checked: ${counts.macro_requirements}`);
  console.error(`Decisions checked: ${counts.decisions}`);
  console.error(`Requirements checked: ${counts.requirements}`);
  console.error(`Negative fixtures checked: ${fixtureCount}`);
  console.error(`Runner verification suites checked: ${runnerSuiteCount}`);
  console.error("Warnings: 0");
  console.error(`Errors: ${errors.length}`);
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log("Requirement authoring contract check passed.");
  console.log(`Implemented requirement: ${implementedRequirementId}`);
  console.log(`Catalog sources checked: ${counts.sources}`);
  console.log(`Requirement types checked: ${counts.requirement_types}`);
  console.log(`Macro-requirements checked: ${counts.macro_requirements}`);
  console.log(`Decisions checked: ${counts.decisions}`);
  console.log(`Requirements checked: ${counts.requirements}`);
  console.log(`Negative fixtures checked: ${fixtureCount}`);
  console.log(`Runner verification suites checked: ${runnerSuiteCount}`);
  console.log("Warnings: 0");
  console.log("Errors: 0");
}

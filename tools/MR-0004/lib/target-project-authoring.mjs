import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { readGovernedYamlFile } from "../../MR-0001/lib/governed-yaml.mjs";
import {
  buildGovernedRequirementVariantDispatch,
  loadGovernedDocumentModelSourceSet,
  matchesGovernedRequirementVariantIdentity,
  resolveGovernedRequirementVariant,
} from "../../MR-0001/lib/governed-document-model-sources.mjs";
import {
  applyGeneratedDocument,
  planGeneratedDocument,
} from "../../MR-0002/create-governed-document.mjs";
import {
  formatGovernedDocumentAuthoringPlan,
  validateGovernedDocumentAuthoringRequest,
} from "../../MR-0002/run-governed-document-authoring.mjs";
import { runTargetProjectCheck } from "../run-target-project-check.mjs";

/**
 * @file Target Project governed-document authoring application service.
 *
 * @implementsRequirement MR-0004ADR-0001REQ-0004
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0004/ADR-0001
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0004
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Reuses ThreatForge-owned authoring catalogs, document models, body profiles,
 * controlled values and transaction primitives while resolving all ownership,
 * identifier allocation and authored paths from one explicit Target Project.
 * Preview is read-only. Create writes only target-local registry and Markdown
 * changes and validates them with the Target Project checker inside the atomic
 * rollback boundary.
 */

const modulePath = fileURLToPath(import.meta.url);
const defaultEngineRoot = path.resolve(path.dirname(modulePath), "..", "..", "..");
const requestSuffix = ".governed-document-authoring.yml";
const catalogBuilderProjectPath =
  "tools/MR-0002/build-governed-document-authoring-catalog.mjs";
const macroRegistryProjectPath =
  "docs/reference/project-model/registers/macro-requirements.registry.yml";
const requiredTargetProjectPaths = Object.freeze([
  macroRegistryProjectPath,
  "docs/reference/project-model/registers/decisions",
  "docs/reference/project-model/registers/requirements",
  "docs/reference/project-model/registers/base-analysis/base-analysis-elements.registry.yml",
  "docs/reference/project-model/body",
]);
const targetOwnedCatalogSourceKinds = new Set([
  "macro_requirements",
  "decisions",
  "requirements",
]);
const macroRequirementIdPattern = /^MR-\d{4}$/u;
const decisionIdPattern = /^ADR-\d{4}$/u;

export const targetProjectAuthoringRequirementId =
  "MR-0004ADR-0001REQ-0004";
export const targetProjectAuthoringRequestSuffix = requestSuffix;

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

function requireString(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${label} must be a non-empty string.`);
  return normalized;
}

function normalizeProjectPath(value) {
  return String(value ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//u, "")
    .trim();
}

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function isInside(parentPath, candidatePath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertPathChainHasNoLinks(absolutePath) {
  const resolved = path.resolve(absolutePath);
  const parsed = path.parse(resolved);
  const segments = resolved.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) break;
    if (fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`Target Project paths cannot contain symbolic links: ${current}`);
    }
  }
}

function safeProjectPath(rootDir, projectPath) {
  const normalized = normalizeProjectPath(projectPath);
  if (
    !normalized ||
    path.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`Target Project path must be relative: ${normalized || "<empty>"}`);
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Target Project path is unsafe: ${normalized}`);
  }
  const root = path.resolve(rootDir);
  const absolute = path.resolve(root, ...segments);
  if (!isInside(root, absolute)) {
    throw new Error(`Target Project path escapes target_root: ${normalized}`);
  }
  assertPathChainHasNoLinks(absolute);
  return { normalized, absolute };
}

function validateRoots(options = {}) {
  const engineText = String(options.engineRoot ?? defaultEngineRoot).trim();
  const targetText = String(options.targetRoot ?? "").trim();
  if (!targetText) throw new Error("An explicit targetRoot is required.");

  const engineRoot = path.resolve(engineText);
  const targetRoot = path.resolve(targetText);
  for (const [label, root] of [
    ["ThreatForge engine root", engineRoot],
    ["Target Project root", targetRoot],
  ]) {
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
      throw new Error(`${label} must be an existing directory: ${root}`);
    }
    assertPathChainHasNoLinks(root);
  }
  const realEngineRoot = fs.realpathSync(engineRoot);
  const realTargetRoot = fs.realpathSync(targetRoot);
  if (realEngineRoot === realTargetRoot) {
    throw new Error("The ThreatForge engine root and target_root must be distinct.");
  }
  const canonicalProjectModelRoot = path.join(
    realEngineRoot,
    "docs",
    "reference",
    "project-model",
  );
  if (isInside(canonicalProjectModelRoot, realTargetRoot)) {
    throw new Error("target_root cannot be inside canonical ThreatForge project-model paths.");
  }
  for (const projectPath of requiredTargetProjectPaths) {
    const resolved = safeProjectPath(realTargetRoot, projectPath);
    if (!fs.existsSync(resolved.absolute)) {
      throw new Error(`Target Project ownership path is missing: ${projectPath}`);
    }
  }
  return { engineRoot: realEngineRoot, targetRoot: realTargetRoot };
}

function readTargetRegistry(targetRoot, projectPath) {
  const resolved = safeProjectPath(targetRoot, projectPath);
  if (!fs.statSync(resolved.absolute).isFile()) {
    throw new Error(`Target Project registry must be a file: ${projectPath}`);
  }
  return requireObject(readGovernedYamlFile(resolved.absolute), projectPath);
}

function sourceRecord(registry, projectPath, kind) {
  return {
    kind,
    path: normalizeProjectPath(projectPath),
    schema_version: registry.schema_version,
    registry_id: requireString(registry.registry_id, `${projectPath}.registry_id`),
    ownership: "target_project",
  };
}

function loadEngineAuthoringCatalog(engineRoot) {
  const builder = safeProjectPath(engineRoot, catalogBuilderProjectPath);
  if (!fs.existsSync(builder.absolute) || !fs.statSync(builder.absolute).isFile()) {
    throw new Error(`ThreatForge authoring catalog builder is missing: ${catalogBuilderProjectPath}`);
  }
  const result = spawnSync(process.execPath, [builder.absolute], {
    cwd: engineRoot,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      TF_GOVERNED_DOCUMENT_AUTHORING_CATALOG_ROOT: engineRoot,
    },
  });
  if (result.error || result.status !== 0 || String(result.stderr ?? "").trim()) {
    const diagnostics = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(
      `ThreatForge authoring catalog build failed${diagnostics ? `: ${diagnostics}` : "."}`,
    );
  }
  const catalog = requireObject(
    JSON.parse(String(result.stdout ?? "{}")),
    "ThreatForge authoring catalog",
  );
  if (catalog.catalog_id !== "governed-document-authoring-catalog") {
    throw new Error(`Unsupported ThreatForge authoring catalog: ${catalog.catalog_id}`);
  }
  return catalog;
}

function projectTargetOwnership(targetRoot, requirementVariantDispatch) {
  const macroRegistry = readTargetRegistry(targetRoot, macroRegistryProjectPath);
  const sources = [sourceRecord(macroRegistry, macroRegistryProjectPath, "macro_requirements")];
  const macros = [];
  const seenMacroIds = new Set();

  for (const macroValue of requireArray(macroRegistry.macro_requirements, "macro_requirements")) {
    const macro = requireObject(macroValue, "Target Project Macro-requirement");
    const macroId = requireString(macro.id, "Target Project Macro-requirement id");
    if (!macroRequirementIdPattern.test(macroId) || seenMacroIds.has(macroId)) {
      throw new Error(`Invalid or duplicate Target Project Macro-requirement id: ${macroId}`);
    }
    seenMacroIds.add(macroId);

    const decisionsPath = normalizeProjectPath(
      requireString(macro.decisions_registry_path, `${macroId}.decisions_registry_path`),
    );
    const requirementsPath = normalizeProjectPath(
      requireString(macro.requirements_registry_path, `${macroId}.requirements_registry_path`),
    );
    const decisionsRegistry = readTargetRegistry(targetRoot, decisionsPath);
    const requirementsRegistry = readTargetRegistry(targetRoot, requirementsPath);
    sources.push(
      sourceRecord(decisionsRegistry, decisionsPath, "decisions"),
      sourceRecord(requirementsRegistry, requirementsPath, "requirements"),
    );

    const decisions = [];
    const decisionById = new Map();
    for (const decisionValue of requireArray(decisionsRegistry.decisions, `${macroId}.decisions`)) {
      const decision = requireObject(decisionValue, `${macroId} Decision`);
      const id = requireString(decision.id, `${macroId} Decision id`);
      if (!decisionIdPattern.test(id) || decisionById.has(id)) {
        throw new Error(`Invalid or duplicate Target Project Decision id in ${macroId}: ${id}`);
      }
      const projected = {
        id,
        reference: `${macroId}/${id}`,
        title: requireString(decision.title, `${macroId}/${id}.title`),
        status: requireString(decision.status, `${macroId}/${id}.status`),
        decision_type: requireString(decision.decision_type, `${macroId}/${id}.decision_type`),
        body_path: normalizeProjectPath(
          requireString(decision.body_path, `${macroId}/${id}.body_path`),
        ),
        requirements: [],
      };
      decisions.push(projected);
      decisionById.set(id, projected);
    }

    const requirements = [];
    const seenRequirementIds = new Set();
    for (const requirementValue of requireArray(
      requirementsRegistry.requirements,
      `${macroId}.requirements`,
    )) {
      const requirement = requireObject(requirementValue, `${macroId} Requirement`);
      const id = requireString(requirement.id, `${macroId} Requirement id`);
      const requirementType = requireString(
        requirement.requirement_type,
        `${id}.requirement_type`,
      );
      const requirementVariant = resolveGovernedRequirementVariant(
        requirementVariantDispatch,
        requirementType,
      );
      if (
        !matchesGovernedRequirementVariantIdentity(requirementVariant, id) ||
        seenRequirementIds.has(id)
      ) {
        throw new Error(
          `Invalid or duplicate Target Project ${requirementType} Requirement id: ${id}`,
        );
      }
      seenRequirementIds.add(id);
      const decisionId = requireString(requirement.decision_id, `${id}.decision_id`);
      const decision = decisionById.get(decisionId);
      if (!decision) {
        throw new Error(`${id} references unknown Target Project Decision ${macroId}/${decisionId}.`);
      }
      const projected = {
        id,
        title: requireString(requirement.title, `${id}.title`),
        status: requireString(requirement.status, `${id}.status`),
        requirement_type: requirementType,
        model_id: requirementVariant.model_id,
        parent_requirement_id: requirement.parent_requirement_id
          ? requireString(requirement.parent_requirement_id, `${id}.parent_requirement_id`)
          : null,
        body_path: normalizeProjectPath(
          requireString(requirement.body_path, `${id}.body_path`),
        ),
      };
      requirements.push(projected);
      decision.requirements.push(projected);
    }
    for (const decision of decisions) {
      decision.requirements.sort((left, right) => compare(left.id, right.id));
    }

    macros.push({
      id: macroId,
      title: requireString(macro.title, `${macroId}.title`),
      status: requireString(macro.status, `${macroId}.status`),
      macro_requirement_type: requireString(
        macro.macro_requirement_type,
        `${macroId}.macro_requirement_type`,
      ),
      body_path: normalizeProjectPath(requireString(macro.body_path, `${macroId}.body_path`)),
      decisions_registry_path: decisionsPath,
      requirements_registry_path: requirementsPath,
      decisions: decisions.sort((left, right) => compare(left.id, right.id)),
      requirements: requirements.sort((left, right) => compare(left.id, right.id)),
    });
  }

  return {
    sources: sources.sort((left, right) => compare(left.path, right.path)),
    macro_requirements: macros.sort((left, right) => compare(left.id, right.id)),
  };
}

function assertValidTargetProject(engineRoot, targetRoot) {
  const validation = runTargetProjectCheck({
    engineRoot,
    targetRoot,
    writeReports: false,
  });
  if (validation.status !== "pass") {
    const first = validation.diagnostics?.[0];
    const detail = first
      ? `[${first.check_id}/${first.rule_id}] ${first.source_path}: ${first.message}`
      : "Target Project validation failed.";
    throw new Error(`Target Project authoring requires a valid target corpus: ${detail}`);
  }
  return validation;
}

/**
 * Builds an engine-governed catalog whose ownership projection comes only from
 * the selected Target Project.
 */
export function loadTargetProjectAuthoringCatalog(options = {}) {
  const roots = validateRoots(options);
  assertValidTargetProject(roots.engineRoot, roots.targetRoot);
  const engineCatalog = loadEngineAuthoringCatalog(roots.engineRoot);
  const sourceSet = loadGovernedDocumentModelSourceSet({
    rootDir: roots.engineRoot,
  });
  const requirementVariantDispatch =
    buildGovernedRequirementVariantDispatch(sourceSet);
  const ownership = projectTargetOwnership(
    roots.targetRoot,
    requirementVariantDispatch,
  );
  const engineSources = requireArray(engineCatalog.sources, "engine catalog sources")
    .filter((entry) => !targetOwnedCatalogSourceKinds.has(String(entry?.kind ?? "")))
    .map((entry) => ({ ...entry, ownership: "threatforge_engine" }));
  return {
    ...engineCatalog,
    sources: [...engineSources, ...ownership.sources].sort((left, right) =>
      compare(`${left.ownership}|${left.path}`, `${right.ownership}|${right.path}`),
    ),
    macro_requirements: ownership.macro_requirements,
  };
}

/** Reads one target-relative authoring request without allowing path escape. */
export function readTargetProjectAuthoringRequest(options = {}) {
  const roots = validateRoots(options);
  const request = safeProjectPath(roots.targetRoot, options.requestPath);
  if (!request.normalized.endsWith(requestSuffix)) {
    throw new Error(`Target Project authoring request must end with ${requestSuffix}.`);
  }
  if (!fs.existsSync(request.absolute) || !fs.statSync(request.absolute).isFile()) {
    throw new Error(`Target Project authoring request does not exist: ${request.normalized}`);
  }
  return requireObject(readGovernedYamlFile(request.absolute), request.normalized);
}

/** Produces a deterministic read-only target-local authoring plan. */
export function planTargetProjectAuthoring(options = {}) {
  const roots = validateRoots(options);
  const catalog = options.catalog ?? loadTargetProjectAuthoringCatalog(roots);
  const request = options.request ?? readTargetProjectAuthoringRequest({
    ...roots,
    requestPath: options.requestPath,
  });
  const canonicalRequest = validateGovernedDocumentAuthoringRequest(request, catalog);
  const documentPlan = planGeneratedDocument(canonicalRequest, catalog, {
    rootDir: roots.targetRoot,
    today: options.today,
  });
  return {
    requirement_id: targetProjectAuthoringRequirementId,
    engine_root: roots.engineRoot,
    target_root: roots.targetRoot,
    request_path: options.requestPath
      ? safeProjectPath(roots.targetRoot, options.requestPath).normalized
      : null,
    request: canonicalRequest,
    documentPlan,
  };
}

/** Formats the exact target-local files and content produced by one plan. */
export function formatTargetProjectAuthoringPlan(authoringPlan) {
  const plan = requireObject(authoringPlan, "Target Project authoring plan");
  return [
    "Target Project governed authoring planned.",
    `Requirement: ${targetProjectAuthoringRequirementId}`,
    `Target root: ${requireString(plan.target_root, "plan.target_root")}`,
    "",
    formatGovernedDocumentAuthoringPlan({
      request: requireObject(plan.request, "plan.request"),
      documentPlan: requireObject(plan.documentPlan, "plan.documentPlan"),
    }),
  ].join("\n");
}

/** Applies one plan and rolls it back unless canonical target validation passes. */
export function applyTargetProjectAuthoring(authoringPlan, options = {}) {
  const plan = requireObject(authoringPlan, "Target Project authoring plan");
  const roots = validateRoots({
    engineRoot: options.engineRoot ?? plan.engine_root,
    targetRoot: options.targetRoot ?? plan.target_root,
  });
  if (path.resolve(String(plan.engine_root)) !== roots.engineRoot) {
    throw new Error("The authoring plan belongs to a different ThreatForge engine root.");
  }
  if (path.resolve(String(plan.target_root)) !== roots.targetRoot) {
    throw new Error("The authoring plan belongs to a different target_root.");
  }

  let verification;
  const applied = applyGeneratedDocument(
    requireObject(plan.documentPlan, "plan.documentPlan"),
    {
      rootDir: roots.targetRoot,
      afterInstall: () => {
        if (typeof options.verify === "function") {
          verification = options.verify(plan);
          return;
        }
        verification = assertValidTargetProject(roots.engineRoot, roots.targetRoot);
      },
    },
  );
  return {
    ...applied,
    requirement_id: targetProjectAuthoringRequirementId,
    target_root: roots.targetRoot,
    verification,
  };
}

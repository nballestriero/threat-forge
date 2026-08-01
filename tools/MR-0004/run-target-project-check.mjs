#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { validateDecisionModel } from "../MR-0001/lib/decision-model-validation.mjs";
import { validateFunctionalRequirementModel } from "../MR-0001/lib/functional-requirement-model-validation.mjs";
import { validateGovernanceRequirementModel } from "../MR-0001/lib/governance-requirement-model-validation.mjs";
import { validateSecurityRequirementModel } from "../MR-0001/lib/security-requirement-model-validation.mjs";
import { validateGovernedDocumentModelCoherence } from "../MR-0001/lib/governed-document-model-coherence-validation.mjs";
import {
  assertGovernedDocumentModelConsumerCoverage,
  canonicalGovernedDocumentModelIds,
  loadGovernedDocumentModelSourceSet,
} from "../MR-0001/lib/governed-document-model-sources.mjs";
import { validateMacroRequirementModel } from "../MR-0001/lib/macro-requirement-model-validation.mjs";
import { loadAndValidateBaseAnalysisRegistry } from "../MR-0003/lib/base-analysis-registry.mjs";

/**
 * @file Target Project governed-document validation runner.
 *
 * @implementsRequirement MR-0004ADR-0001REQ-0003
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0004/ADR-0001
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * Validates one explicit Target Project by combining engine-owned canonical
 * definitions with target-owned governed registries and Markdown bodies inside
 * an isolated temporary overlay. Only deterministic reports are written under
 * the Target Project; governed sources are never modified.
 */

const scriptPath = fileURLToPath(import.meta.url);
const defaultEngineRoot = path.resolve(path.dirname(scriptPath), "..", "..");

export const targetProjectCheckRequirementId = "MR-0004ADR-0001REQ-0003";
export const targetProjectReportProjectPath =
  "artifacts/target-project-check/target-project-check.report.json";
export const targetProjectMarkdownReportProjectPath =
  "artifacts/target-project-check/target-project-check.report.md";

export const engineOwnedProjectPaths = Object.freeze([
  "docs/reference/project-model/contracts",
  "docs/reference/project-model/registers/document-models",
  "docs/reference/project-model/registers/taxonomies",
  "docs/reference/project-model/registers/references",
  "docs/reference/project-model/registers/base-analysis/base-analysis-taxonomies.registry.yml",
]);

export const targetOwnedProjectPaths = Object.freeze([
  "docs/reference/project-model/registers/macro-requirements.registry.yml",
  "docs/reference/project-model/registers/decisions",
  "docs/reference/project-model/registers/requirements",
  "docs/reference/project-model/registers/base-analysis/base-analysis-elements.registry.yml",
  "docs/reference/project-model/body",
]);

const targetAnalysisSourceSuffixes = Object.freeze([
  ".analysis-record.yml",
  ".analysis-finding.yml",
]);
const ignoredTargetAnalysisDirectoryNames = new Set([
  ".git",
  ".threat-forge",
  "artifacts",
  "examples",
  "node_modules",
  "old",
]);

/** Discovers optional Target Project Analysis Record and Common Finding sources. */
export function discoverTargetProjectAnalysisSourcePaths(targetRoot) {
  const root = path.resolve(String(targetRoot));
  const discovered = [];
  function visit(directory) {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => compare(left.name, right.name))) {
      if (entry.isDirectory() && ignoredTargetAnalysisDirectoryNames.has(entry.name)) {
        continue;
      }
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(
          `Symbolic links are not allowed in Target Project analysis input: ${absolute}`,
        );
      }
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (
        entry.isFile() &&
        targetAnalysisSourceSuffixes.some((suffix) => entry.name.endsWith(suffix))
      ) {
        discovered.push(path.relative(root, absolute).replaceAll("\\", "/"));
      }
    }
  }
  visit(root);
  return discovered.sort(compare);
}

const modelCheckProviders = new Map([
  [
    "macro-requirement",
    {
      id: "macro-requirement-model",
      run: (rootDir) => validateMacroRequirementModel({ rootDir }),
    },
  ],
  [
    "decision",
    {
      id: "decision-model",
      run: (rootDir) => validateDecisionModel({ rootDir }),
    },
  ],
  [
    "functional-requirement",
    {
      id: "functional-requirement-model",
      run: (rootDir) => validateFunctionalRequirementModel({ rootDir }),
    },
  ],
  [
    "governance-requirement",
    {
      id: "governance-requirement-model",
      run: (rootDir) => validateGovernanceRequirementModel({ rootDir }),
    },
  ],
]);

const activationCandidateModelCheckProviders = new Map([
  [
    "security-requirement",
    {
      id: "security-requirement-model",
      run: (rootDir) => {
        const sourceSet = loadGovernedDocumentModelSourceSet({ rootDir });
        return validateSecurityRequirementModel({
          rootDir,
          sourceSet,
          activationState: "active",
        });
      },
    },
  ],
]);

const crossModelCheck = Object.freeze({
  id: "governed-document-model-coherence",
  run: (rootDir) => validateGovernedDocumentModelCoherence({ rootDir }),
});

/**
 * Resolves exact Target Project validator coverage for one canonical or
 * activation-candidate source set. Dormant candidate providers are selected
 * only when their model identifier is present in the supplied source set.
 *
 * @param {Record<string, unknown>} sourceSet - Governed model source set.
 * @returns {Array<Record<string, unknown>>} Ordered validator providers.
 */
export function resolveTargetProjectModelValidationProviders(sourceSet) {
  const canonicalModelIds = canonicalGovernedDocumentModelIds(sourceSet);
  const selectedProviders = new Map(modelCheckProviders);
  for (const modelId of canonicalModelIds) {
    if (
      !selectedProviders.has(modelId) &&
      activationCandidateModelCheckProviders.has(modelId)
    ) {
      selectedProviders.set(
        modelId,
        activationCandidateModelCheckProviders.get(modelId),
      );
    }
  }
  assertGovernedDocumentModelConsumerCoverage({
    consumerId: "target-project-model-validation",
    sourceSet,
    providerModelIds: [...selectedProviders.keys()],
  });
  return canonicalModelIds.map((modelId) => {
    const provider = selectedProviders.get(modelId);
    if (!provider) {
      throw new Error(
        "Target Project validation provider is missing for " + modelId + ".",
      );
    }
    return Object.freeze({ model_id: modelId, ...provider });
  });
}

function resolveModelChecks(rootDir) {
  const sourceSet = loadGovernedDocumentModelSourceSet({ rootDir });
  return [
    ...resolveTargetProjectModelValidationProviders(sourceSet),
    crossModelCheck,
  ];
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

function safeProjectPath(rootDir, projectPath) {
  const normalized = normalizeProjectPath(projectPath);
  if (
    !normalized ||
    path.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`Unsafe project path: ${normalized || "<empty>"}`);
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Unsafe project path: ${normalized}`);
  }
  const resolvedRoot = path.resolve(rootDir);
  const absolute = path.resolve(resolvedRoot, ...segments);
  if (absolute !== resolvedRoot && !absolute.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Project path escapes root: ${normalized}`);
  }
  return { normalized, absolute };
}

function copyPathWithoutLinks(sourceRoot, targetRoot, projectPath) {
  const source = safeProjectPath(sourceRoot, projectPath);
  const destination = safeProjectPath(targetRoot, projectPath);
  if (!fs.existsSync(source.absolute)) {
    throw new Error(`Required project path is missing: ${source.normalized}`);
  }

  function copyEntry(sourcePath, destinationPath, displayPath) {
    const stat = fs.lstatSync(sourcePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`Symbolic links are not allowed in validation input: ${displayPath}`);
    }
    if (stat.isDirectory()) {
      fs.mkdirSync(destinationPath, { recursive: true });
      const entries = fs
        .readdirSync(sourcePath, { withFileTypes: true })
        .sort((left, right) => compare(left.name, right.name));
      for (const entry of entries) {
        copyEntry(
          path.join(sourcePath, entry.name),
          path.join(destinationPath, entry.name),
          `${displayPath}/${entry.name}`,
        );
      }
      return;
    }
    if (!stat.isFile()) {
      throw new Error(`Unsupported validation input type: ${displayPath}`);
    }
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
  }

  copyEntry(source.absolute, destination.absolute, source.normalized);
}

function buildValidationOverlay(engineRoot, targetRoot) {
  const overlayRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "threatforge-target-project-check-"),
  );
  try {
    for (const projectPath of engineOwnedProjectPaths) {
      copyPathWithoutLinks(engineRoot, overlayRoot, projectPath);
    }
    for (const projectPath of targetOwnedProjectPaths) {
      copyPathWithoutLinks(targetRoot, overlayRoot, projectPath);
    }
    for (const projectPath of discoverTargetProjectAnalysisSourcePaths(targetRoot)) {
      copyPathWithoutLinks(targetRoot, overlayRoot, projectPath);
    }
    return overlayRoot;
  } catch (error) {
    fs.rmSync(overlayRoot, { recursive: true, force: true });
    throw error;
  }
}

function diagnostic(input) {
  return {
    severity: input.severity === "warning" ? "warning" : "error",
    check_id: String(input.check_id ?? "target-project-check"),
    rule_id: String(input.rule_id ?? "target-project-check.execution"),
    source_path: normalizeProjectPath(input.source_path) || "target-project",
    location: String(input.location ?? input.context ?? "$"),
    message: String(input.message ?? input),
  };
}

function normalizeModelDiagnostics(checkId, result) {
  return (Array.isArray(result?.diagnostics) ? result.diagnostics : []).map((item) =>
    diagnostic({ ...item, check_id: checkId }),
  );
}

function runBaseAnalysisCheck(rootDir) {
  const result = loadAndValidateBaseAnalysisRegistry({ rootDir });
  const diagnostics = [
    ...(Array.isArray(result.errors) ? result.errors : []).map((item) =>
      diagnostic({ ...item, check_id: "base-analysis-registry", severity: "error" }),
    ),
    ...(Array.isArray(result.warnings) ? result.warnings : []).map((item) =>
      diagnostic({ ...item, check_id: "base-analysis-registry", severity: "warning" }),
    ),
  ];
  return {
    id: "base-analysis-registry",
    records_checked: Number(result.element_count ?? 0),
    relations_checked: Number(result.relation_count ?? 0),
    diagnostics,
  };
}

function stableDiagnostics(values) {
  return [...values].sort((left, right) =>
    compare(
      `${left.severity}|${left.check_id}|${left.source_path}|${left.location}|${left.rule_id}|${left.message}`,
      `${right.severity}|${right.check_id}|${right.source_path}|${right.location}|${right.rule_id}|${right.message}`,
    ),
  );
}

function sanitizeDiagnosticMessage(value, replacements) {
  let message = String(value ?? "");
  for (const [absolutePath, token] of replacements) {
    if (!absolutePath) continue;
    message = message
      .replaceAll(absolutePath, token)
      .replaceAll(absolutePath.replaceAll("\\", "/"), token);
  }
  return message;
}

function assertReportPathIsConfined(targetRoot, absolutePath) {
  const resolvedRoot = path.resolve(targetRoot);
  const relative = path.relative(resolvedRoot, absolutePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Target report path escapes target_root.");
  }
  let current = resolvedRoot;
  for (const segment of relative.split(path.sep).slice(0, -1)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) continue;
    if (fs.lstatSync(current).isSymbolicLink()) {
      throw new Error("Symbolic links are not allowed in the target report path.");
    }
  }
}

function reportMarkdown(report) {
  const lines = [
    "# Target Project check report",
    "",
    `Status: ${report.status}`,
    `Checks executed: ${report.checks.length}`,
    `Warnings: ${report.warning_count}`,
    `Errors: ${report.error_count}`,
    "",
    "## Checks",
    "",
    ...report.checks.map(
      (check) =>
        `- ${check.id}: ${check.error_count} errors, ${check.warning_count} warnings`,
    ),
    "",
    "## Diagnostics",
    "",
    ...(report.diagnostics.length === 0
      ? ["None."]
      : report.diagnostics.map(
          (item) =>
            `- [${item.severity}] [${item.check_id}/${item.rule_id}] ${item.source_path} ${item.location}: ${item.message}`,
        )),
    "",
  ];
  return lines.join("\n");
}

function writeReports(targetRoot, report) {
  const jsonPath = safeProjectPath(targetRoot, targetProjectReportProjectPath);
  const markdownPath = safeProjectPath(
    targetRoot,
    targetProjectMarkdownReportProjectPath,
  );
  assertReportPathIsConfined(targetRoot, jsonPath.absolute);
  assertReportPathIsConfined(targetRoot, markdownPath.absolute);
  fs.mkdirSync(path.dirname(jsonPath.absolute), { recursive: true });
  fs.writeFileSync(jsonPath.absolute, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownPath.absolute, reportMarkdown(report), "utf8");
}

function failureReport(message) {
  const diagnostics = [
    diagnostic({
      check_id: "target-project-check",
      rule_id: "target-project-check.input",
      source_path: "target-project",
      location: "$",
      message,
    }),
  ];
  return {
    schema_version: 1,
    check_id: "target-project-check",
    implemented_requirement_ids: [targetProjectCheckRequirementId],
    status: "fail",
    checks: [],
    warning_count: 0,
    error_count: 1,
    diagnostics,
  };
}

/**
 * Validates one Target Project using engine rules and target-owned content.
 *
 * @param {{engineRoot?: string, targetRoot: string, writeReports?: boolean}} options
 * @returns {Record<string, unknown>} Deterministic aggregate report.
 */
export function runTargetProjectCheck(options) {
  const requestedEngineRoot = path.resolve(options?.engineRoot ?? defaultEngineRoot);
  const requestedTargetRootText = String(options?.targetRoot ?? "").trim();
  const requestedTargetRoot = path.resolve(requestedTargetRootText || ".");
  const shouldWriteReports = options?.writeReports !== false;

  let inputFailure = "";
  if (!requestedTargetRootText) {
    inputFailure = "An explicit target_root is required.";
  } else if (
    !fs.existsSync(requestedEngineRoot) ||
    !fs.statSync(requestedEngineRoot).isDirectory()
  ) {
    inputFailure = "The ThreatForge engine root is unavailable.";
  } else if (
    !fs.existsSync(requestedTargetRoot) ||
    !fs.statSync(requestedTargetRoot).isDirectory()
  ) {
    inputFailure = "The explicit target_root must be an existing directory.";
  }

  const engineRoot = inputFailure
    ? requestedEngineRoot
    : fs.realpathSync(requestedEngineRoot);
  const targetRoot = inputFailure
    ? requestedTargetRoot
    : fs.realpathSync(requestedTargetRoot);
  if (!inputFailure && engineRoot === targetRoot) {
    inputFailure = "The target_root must be distinct from the engine root.";
  }
  if (inputFailure) {
    const report = failureReport(inputFailure);
    if (
      shouldWriteReports &&
      requestedTargetRootText &&
      fs.existsSync(requestedTargetRoot) &&
      fs.statSync(requestedTargetRoot).isDirectory()
    ) {
      writeReports(requestedTargetRoot, report);
    }
    return report;
  }

  let overlayRoot = "";
  let report;
  try {
    overlayRoot = buildValidationOverlay(engineRoot, targetRoot);
    const checks = [];
    for (const check of resolveModelChecks(overlayRoot)) {
      try {
        const result = check.run(overlayRoot);
        const diagnostics = normalizeModelDiagnostics(check.id, result);
        checks.push({
          id: check.id,
          records_checked: Number(result?.records_checked ?? 0),
          diagnostics,
        });
      } catch (error) {
        checks.push({
          id: check.id,
          records_checked: 0,
          diagnostics: [
            diagnostic({
              check_id: check.id,
              rule_id: "target-project-check.execution",
              source_path: "target-project",
              location: "$",
              message: error.message,
            }),
          ],
        });
      }
    }
    try {
      checks.push(runBaseAnalysisCheck(overlayRoot));
    } catch (error) {
      checks.push({
        id: "base-analysis-registry",
        records_checked: 0,
        relations_checked: 0,
        diagnostics: [
          diagnostic({
            check_id: "base-analysis-registry",
            rule_id: "target-project-check.execution",
            source_path: "target-project",
            location: "$",
            message: error.message,
          }),
        ],
      });
    }

    const replacements = [
      [overlayRoot, "<validation-overlay>"],
      [engineRoot, "<engine-root>"],
      [targetRoot, "<target-root>"],
    ];
    const diagnostics = stableDiagnostics(
      checks.flatMap((check) => check.diagnostics).map((item) => ({
        ...item,
        message: sanitizeDiagnosticMessage(item.message, replacements),
      })),
    );
    const normalizedChecks = checks.map((check) => ({
      id: check.id,
      records_checked: check.records_checked,
      ...(Number.isInteger(check.relations_checked)
        ? { relations_checked: check.relations_checked }
        : {}),
      warning_count: check.diagnostics.filter((item) => item.severity === "warning")
        .length,
      error_count: check.diagnostics.filter((item) => item.severity === "error").length,
    }));
    const errorCount = diagnostics.filter((item) => item.severity === "error").length;
    const warningCount = diagnostics.filter((item) => item.severity === "warning").length;
    report = {
      schema_version: 1,
      check_id: "target-project-check",
      implemented_requirement_ids: [targetProjectCheckRequirementId],
      status: errorCount === 0 ? "pass" : "fail",
      checks: normalizedChecks,
      warning_count: warningCount,
      error_count: errorCount,
      diagnostics,
    };
  } catch (error) {
    report = failureReport(error.message);
  } finally {
    if (overlayRoot) fs.rmSync(overlayRoot, { recursive: true, force: true });
  }

  if (shouldWriteReports && fs.existsSync(targetRoot)) {
    writeReports(targetRoot, report);
  }
  return report;
}

export function parseTargetProjectCheckArguments(args) {
  if (args.length !== 2 || args[0] !== "--target-root" || !String(args[1]).trim()) {
    throw new Error(
      "Usage: node tools/MR-0004/run-target-project-check.mjs --target-root <path>",
    );
  }
  return { targetRoot: args[1] };
}

async function main() {
  let options;
  try {
    options = parseTargetProjectCheckArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  const report = runTargetProjectCheck(options);
  console.log(
    report.status === "pass"
      ? "Target Project check passed."
      : "Target Project check failed.",
  );
  console.log(`Implemented requirement: ${targetProjectCheckRequirementId}`);
  console.log(`Checks executed: ${report.checks.length}`);
  console.log(`Warnings: ${report.warning_count}`);
  console.log(`Errors: ${report.error_count}`);
  console.log(`Report: ${targetProjectReportProjectPath}`);
  for (const item of report.diagnostics) {
    console.log(
      `${item.severity.toUpperCase()}: [${item.check_id}/${item.rule_id}] ${item.source_path} ${item.location}: ${item.message}`,
    );
  }
  if (report.status !== "pass") process.exitCode = 1;
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === directExecutionUrl) {
  main().catch((error) => {
    console.error(`Target Project check could not run: ${error.message}`);
    process.exitCode = 2;
  });
}

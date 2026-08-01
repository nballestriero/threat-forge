#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  assertGovernedDocumentModelConsumerCoverage,
  canonicalGovernedDocumentModelIds,
  loadGovernedDocumentModelSourceSet,
} from "../MR-0001/lib/governed-document-model-sources.mjs";
import {
  createGovernedMarkdownAssistanceService,
} from "./lib/governed-markdown-assistance.mjs";
import {
  packageGovernedMarkdownExtension,
} from "./install-vscode-governed-markdown-assistance.mjs";

/**
 * @file Deterministic checker for governed Markdown live assistance.
 *
 * @implementsRequirement MR-0002ADR-0006REQ-0001
 * @implementsRequirement MR-0002ADR-0006REQ-0001GOV-0001
 * @implementsRequirement MR-0002ADR-0006REQ-0002
 * @implementsRequirement MR-0002ADR-0006REQ-0002GOV-0001
 * @implementsRequirement MR-0002ADR-0006REQ-0004
 * @implementsRequirement MR-0002ADR-0006REQ-0004GOV-0001
 * @implementsRequirement MR-0002ADR-0006REQ-0005
 * @implementsRequirement MR-0002ADR-0006REQ-0005GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Verifies canonical profile derivation, valid-body coverage for every active
 * logical model, deterministic core and adapter tests, thin-adapter source
 * boundaries and deterministic local VSIX packaging without modifying the
 * repository.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = process.env.TF_GOVERNED_MARKDOWN_ASSISTANCE_ROOT
  ? path.resolve(process.env.TF_GOVERNED_MARKDOWN_ASSISTANCE_ROOT)
  : path.resolve(scriptDir, "..", "..");
const extensionProjectPath =
  "tools/MR-0002/vscode-governed-markdown-assistance/extension.cjs";
const extensionPackageProjectPath =
  "tools/MR-0002/vscode-governed-markdown-assistance/package.json";
const obsoleteTargetPackageProjectPath =
  "tools/MR-0004/vscode-target-project-assistance/package.json";
const testProjectPaths = [
  "tools/MR-0002/tests/governed-markdown-assistance.test.mjs",
  "tools/MR-0002/tests/vscode-governed-markdown-assistance-adapter.test.mjs",
  "tools/MR-0002/tests/governed-markdown-bae-references.test.mjs",
];
const modelBodyPathProviders = new Map([
  [
    "macro-requirement",
    "docs/reference/project-model/body/macro-requirements/MR-0001_body.md",
  ],
  [
    "decision",
    "docs/reference/project-model/body/decisions/MR-0002/ADR-0006_body.md",
  ],
  [
    "functional-requirement",
    "docs/reference/project-model/body/requirements/MR-0002/MR-0002ADR-0006REQ-0001_body.md",
  ],
  [
    "governance-requirement",
    "docs/reference/project-model/body/requirements/MR-0002/MR-0002ADR-0006REQ-0001GOV-0001_body.md",
  ],
  ["security-requirement", null],
]);
const forbiddenAdapterFragments = [
  '"Status"',
  '"Context"',
  '"Decision"',
  '"Consequences"',
  '"Functional obligation"',
  '"Governance obligation"',
  '"Draft"',
  '"Accepted"',
  "writeFile",
  "appendFile",
];

function resolveProjectPath(projectPath) {
  const normalized = String(projectPath ?? "").replaceAll("\\", "/").trim();
  if (
    !normalized ||
    path.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`Unsafe repository-relative path: ${normalized || "<empty>"}`);
  }
  const parts = normalized.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Unsafe repository-relative path: ${normalized}`);
  }
  const absolute = path.resolve(rootDir, ...parts);
  if (absolute !== rootDir && !absolute.startsWith(`${rootDir}${path.sep}`)) {
    throw new Error(`Repository path escapes root: ${normalized}`);
  }
  return absolute;
}

function parseTestCount(output) {
  const match = String(output ?? "").match(/(?:#|ℹ)\s*tests\s+(\d+)/u);
  return match ? Number(match[1]) : 0;
}

function runTests() {
  const result = spawnSync(
    process.execPath,
    ["--test", ...testProjectPaths.map(resolveProjectPath)],
    {
      cwd: rootDir,
      encoding: "utf8",
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      `Governed Markdown assistance verification suites failed:\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    );
  }
  const count = parseTestCount(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  if (count < 23) {
    throw new Error(
      `Governed Markdown assistance verification count is incomplete: ${count}.`,
    );
  }
  return count;
}

function verifyModels() {
  const sourceSet = loadGovernedDocumentModelSourceSet({ rootDir });
  const canonicalModelIds = canonicalGovernedDocumentModelIds(sourceSet);
  assertGovernedDocumentModelConsumerCoverage({
    consumerId: "governed-markdown-assistance-body-samples",
    sourceSet,
    providerModelIds: [...modelBodyPathProviders.keys()],
  });
  const service = createGovernedMarkdownAssistanceService({ rootDir });
  const models = new Set();
  for (const modelId of canonicalModelIds) {
    const projectPath = modelBodyPathProviders.get(modelId);
    if (!projectPath) {
      models.add(modelId);
      continue;
    }
    const text = fs.readFileSync(resolveProjectPath(projectPath), "utf8");
    const result = service.analyze({
      projectPath,
      text,
      position: { line: 0, character: 0 },
    });
    if (!result.supported) {
      throw new Error(`Assistance does not support governed body: ${projectPath}`);
    }
    if (result.document.model_id !== modelId) {
      throw new Error(
        `Assistance body sample ${projectPath} resolved ${result.document.model_id} instead of ${modelId}.`,
      );
    }
    if (result.diagnostics.length > 0) {
      throw new Error(
        `Valid governed body ${projectPath} produced diagnostics: ${result.diagnostics.map((item) => `${item.rule_id}: ${item.message}`).join(" | ")}`,
      );
    }
    models.add(result.document.model_id);
  }
  return models.size;
}

function verifyThinAdapter() {
  const source = fs.readFileSync(resolveProjectPath(extensionProjectPath), "utf8");
  for (const fragment of forbiddenAdapterFragments) {
    if (source.includes(fragment)) {
      throw new Error(
        `VS Code adapter contains forbidden canonical or mutating fragment: ${fragment}`,
      );
    }
  }
}

function verifyUnifiedPackage() {
  const packageValue = JSON.parse(
    fs.readFileSync(resolveProjectPath(extensionPackageProjectPath), "utf8"),
  );
  if (packageValue.version !== "0.3.0") {
    throw new Error(`Unexpected unified extension version: ${packageValue.version}`);
  }
  const engineRootProperty =
    packageValue.contributes?.configuration?.properties?.["threatforge.engineRoot"];
  if (engineRootProperty?.scope !== "resource") {
    throw new Error("Unified extension must contribute resource-scoped threatforge.engineRoot.");
  }
  if (fs.existsSync(resolveProjectPath(obsoleteTargetPackageProjectPath))) {
    throw new Error("Obsolete Target Project extension package.json must be removed.");
  }
}

function verifyVsix() {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "tf-governed-markdown-check-"),
  );
  try {
    const outputPath = path.join(temporaryDirectory, "adapter.vsix");
    const first = packageGovernedMarkdownExtension({ rootDir, outputPath });
    const firstBytes = fs.readFileSync(outputPath);
    const secondPath = path.join(temporaryDirectory, "adapter-second.vsix");
    const second = packageGovernedMarkdownExtension({
      rootDir,
      outputPath: secondPath,
    });
    const secondBytes = fs.readFileSync(secondPath);
    if (!firstBytes.equals(secondBytes)) {
      throw new Error("Governed Markdown assistance VSIX is not deterministic.");
    }
    const requiredEntries = new Set([
      "[Content_Types].xml",
      "extension.vsixmanifest",
      "extension/package.json",
      "extension/extension.cjs",
      "extension/README.md",
    ]);
    if (
      second.entries.length !== requiredEntries.size ||
      second.entries.some((entry) => !requiredEntries.has(entry))
    ) {
      throw new Error(
        `Governed Markdown assistance VSIX entries are incomplete: ${second.entries.join(", ")}.`,
      );
    }
    if (
      first.extensionId !==
      "threatforge.threatforge-governed-markdown-assistance"
    ) {
      throw new Error(`Unexpected extension id: ${first.extensionId}`);
    }
    return first.entries.length;
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

try {
  const modelsChecked = verifyModels();
  verifyThinAdapter();
  verifyUnifiedPackage();
  const vsixEntriesChecked = verifyVsix();
  const testsChecked = runTests();
  console.log("Governed Markdown assistance check passed.");
  console.log("Implemented requirement: MR-0002ADR-0006REQ-0001");
  console.log("Implemented requirement: MR-0002ADR-0006REQ-0001GOV-0001");
  console.log("Implemented requirement: MR-0002ADR-0006REQ-0002");
  console.log("Implemented requirement: MR-0002ADR-0006REQ-0002GOV-0001");
  console.log("Implemented requirement: MR-0002ADR-0006REQ-0004");
  console.log("Implemented requirement: MR-0002ADR-0006REQ-0004GOV-0001");
  console.log("Implemented requirement: MR-0002ADR-0006REQ-0005");
  console.log("Implemented requirement: MR-0002ADR-0006REQ-0005GOV-0001");
  console.log(`Models checked: ${modelsChecked}`);
  console.log(`Assistance tests checked: ${testsChecked}`);
  console.log(`VSIX entries checked: ${vsixEntriesChecked}`);
  console.log("Warnings: 0");
  console.log("Errors: 0");
} catch (error) {
  console.error("Governed Markdown assistance check failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

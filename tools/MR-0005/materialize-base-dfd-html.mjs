#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readGovernedYamlFile } from "../MR-0001/lib/governed-yaml.mjs";
import { projectBaseDfd } from "../MR-0003/lib/base-dfd-projector.mjs";
import { renderDfdHtml } from "./lib/dfd-html-renderer.mjs";

/**
 * @file Base DFD static HTML materializer.
 *
 * @implementsRequirement MR-0005ADR-0001REQ-0003
 * @derivedFromDecision MR-0005/ADR-0001
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Reads the canonical Base Analysis case-study registry, creates the
 * renderer-neutral Base DFD semantic projection and materializes a
 * deterministic, self-contained HTML document containing an embedded SVG.
 *
 * Side effects:
 * - --write creates or replaces only the configured case-study HTML artifact;
 * - --check fails when the artifact is missing or differs from the current
 *   deterministic projection;
 * - neither mode modifies canonical BAE registries or semantic projections.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);

const defaultRootDir = path.resolve(scriptDir, "..", "..");

const rootDir = process.env.TF_BASE_DFD_HTML_MATERIALIZER_ROOT
  ? path.resolve(process.env.TF_BASE_DFD_HTML_MATERIALIZER_ROOT)
  : defaultRootDir;

export const BASE_DFD_HTML_SOURCE_PROJECT_PATH =
  "examples/case-studies/documentation-to-base-analysis/" +
  "docs/reference/project-model/registers/base-analysis/" +
  "base-analysis-elements.registry.yml";

export const BASE_DFD_HTML_OUTPUT_PROJECT_PATH =
  "examples/case-studies/documentation-to-base-analysis/" +
  "base-dfd.html";

const documentTitle =
  "ThreatForge Base DFD — documentation-to-base-analysis";

/**
 * Resolves a safe repository-relative path.
 *
 * @param {string} projectPath
 * @returns {string}
 */
function resolveProjectPath(projectPath) {
  const normalized = String(projectPath ?? "")
    .replaceAll("\\", "/")
    .trim();

  if (!normalized) {
    throw new Error(
      "Repository-relative path must not be empty.",
    );
  }

  if (
    path.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(
      `Repository path must be relative: ${normalized}`,
    );
  }

  const segments = normalized.split("/");

  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === "..",
    )
  ) {
    throw new Error(
      `Repository path is unsafe: ${normalized}`,
    );
  }

  const absolute = path.resolve(rootDir, ...segments);
  const relative = path.relative(rootDir, absolute);

  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(
      `Repository path resolves outside root: ${normalized}`,
    );
  }

  return absolute;
}

/**
 * Normalizes line endings for repository checkout portability.
 *
 * @param {string} value
 * @returns {string}
 */
function normalizeLineEndings(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/u, "")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n");
}

/**
 * Writes one file through a rollback-protected replacement.
 *
 * @param {string} projectPath
 * @param {string} content
 * @returns {void}
 */
function writeAtomically(projectPath, content) {
  const absolute = resolveProjectPath(projectPath);
  const directory = path.dirname(absolute);
  const transactionId = `${process.pid}-${Date.now()}`;
  const temporaryPath =
    `${absolute}.tf-${transactionId}.tmp`;
  const backupPath =
    `${absolute}.tf-${transactionId}.bak`;

  let originalMoved = false;
  let replacementInstalled = false;

  fs.mkdirSync(directory, { recursive: true });

  try {
    fs.writeFileSync(
      temporaryPath,
      content,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );

    if (fs.existsSync(absolute)) {
      fs.renameSync(absolute, backupPath);
      originalMoved = true;
    }

    fs.renameSync(temporaryPath, absolute);
    replacementInstalled = true;

    if (originalMoved && fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
  } catch (error) {
    try {
      if (
        replacementInstalled &&
        fs.existsSync(absolute)
      ) {
        fs.unlinkSync(absolute);
      }

      if (fs.existsSync(temporaryPath)) {
        fs.unlinkSync(temporaryPath);
      }

      if (
        originalMoved &&
        fs.existsSync(backupPath)
      ) {
        fs.renameSync(backupPath, absolute);
      }
    } catch (rollbackError) {
      throw new Error(
        `Cannot materialize ${projectPath}: ` +
        `${error.message}; rollback also failed: ` +
        rollbackError.message,
      );
    }

    throw new Error(
      `Cannot materialize ${projectPath}: ${error.message}`,
    );
  }
}

/**
 * Builds the expected projection and HTML without writing files.
 *
 * @returns {{
 *   projection: Record<string, unknown>,
 *   html: string
 * }}
 */
export function buildBaseDfdHtmlMaterialization() {
  const sourcePath = resolveProjectPath(
    BASE_DFD_HTML_SOURCE_PROJECT_PATH,
  );

  if (!fs.existsSync(sourcePath)) {
    throw new Error(
      `Base Analysis source registry is missing: ` +
      BASE_DFD_HTML_SOURCE_PROJECT_PATH,
    );
  }

  const inventory = readGovernedYamlFile(sourcePath);

  const projection = projectBaseDfd({
    inventory,
    registryPath:
      BASE_DFD_HTML_SOURCE_PROJECT_PATH,
  });

  const html = renderDfdHtml(projection, {
    title: documentTitle,
  });

  return {
    projection,
    html,
  };
}

/**
 * Materializes or verifies the current Base DFD HTML artifact.
 *
 * @param {"write"|"check"} mode
 * @returns {{
 *   mode: "write"|"check",
 *   status: "current",
 *   sourcePath: string,
 *   outputPath: string,
 *   projectionId: string,
 *   nodes: number,
 *   flows: number,
 *   boundaries: number,
 *   unprojectedBaes: number
 * }}
 */
export function materializeBaseDfdHtml(mode) {
  if (mode !== "write" && mode !== "check") {
    throw new Error(
      `Unsupported materialization mode: ${mode}`,
    );
  }

  const { projection, html } =
    buildBaseDfdHtmlMaterialization();

  if (mode === "write") {
    writeAtomically(
      BASE_DFD_HTML_OUTPUT_PROJECT_PATH,
      html,
    );
  }

  const outputPath = resolveProjectPath(
    BASE_DFD_HTML_OUTPUT_PROJECT_PATH,
  );

  if (!fs.existsSync(outputPath)) {
    throw new Error(
      `Materialized Base DFD HTML is missing: ` +
      BASE_DFD_HTML_OUTPUT_PROJECT_PATH,
    );
  }

  const actual = normalizeLineEndings(
    fs.readFileSync(outputPath, "utf8"),
  );

  const expected = normalizeLineEndings(html);

  if (actual !== expected) {
    throw new Error(
      `Materialized Base DFD HTML is stale: ` +
      BASE_DFD_HTML_OUTPUT_PROJECT_PATH,
    );
  }

  return {
    mode,
    status: "current",
    sourcePath:
      BASE_DFD_HTML_SOURCE_PROJECT_PATH,
    outputPath:
      BASE_DFD_HTML_OUTPUT_PROJECT_PATH,
    projectionId: projection.projection_id,
    nodes: projection.nodes.length,
    flows: projection.flows.length,
    boundaries: projection.boundaries.length,
    unprojectedBaes:
      projection.unprojected_baes.length,
  };
}

/**
 * Parses one explicit CLI mode.
 *
 * @param {string[]} args
 * @returns {"write"|"check"}
 */
function parseMode(args) {
  if (args.length !== 1) {
    throw new Error(
      "Exactly one explicit mode is required: " +
      "--write or --check.",
    );
  }

  if (args[0] === "--write") return "write";
  if (args[0] === "--check") return "check";

  throw new Error(
    `Unsupported argument: ${args[0]}`,
  );
}

/**
 * Executes the command-line adapter.
 *
 * @returns {void}
 */
function main() {
  const result = materializeBaseDfdHtml(
    parseMode(process.argv.slice(2)),
  );

  console.log(
    "Base DFD HTML materialization succeeded.",
  );
  console.log(`Mode: ${result.mode}`);
  console.log(`Status: ${result.status}`);
  console.log(`Source: ${result.sourcePath}`);
  console.log(`Output: ${result.outputPath}`);
  console.log(
    `Projection id: ${result.projectionId}`,
  );
  console.log(`Nodes: ${result.nodes}`);
  console.log(`Flows: ${result.flows}`);
  console.log(`Boundaries: ${result.boundaries}`);
  console.log(
    `Unprojected BAEs: ${result.unprojectedBaes}`,
  );
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === directExecutionUrl) {
  try {
    main();
  } catch (error) {
    console.error(
      `Base DFD HTML materialization failed: ` +
      error.message,
    );
    process.exitCode = 1;
  }
}
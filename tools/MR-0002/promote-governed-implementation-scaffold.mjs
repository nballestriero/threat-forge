#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * @file ThreatForge governed implementation scaffold promotion.
 *
 * @implementsRequirement MR-0002ADR-0003REQ-0002
 * @implementsRequirement MR-0002ADR-0003REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0003
 * @macroRequirement MR-0002
 *
 * Promotes one verified scaffolded source artifact to implemented. The source
 * lifecycle header and implementation trace record are updated as one
 * rollback-protected transaction. The command never writes implementation
 * behavior and never invokes a shell or Git mutation.
 *
 * Side effects: reads one scaffolded source and the implementation trace
 * registry; executes its governed Node verification command; after explicit
 * confirmation updates the source and registry atomically; writes diagnostics
 * to stdout/stderr; exits non-zero without persistent changes on failure.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = process.env.TF_IMPLEMENTATION_PROMOTION_ROOT
  ? path.resolve(process.env.TF_IMPLEMENTATION_PROMOTION_ROOT)
  : path.resolve(scriptDir, "..", "..");
const registryProjectPath = process.env.TF_IMPLEMENTATION_PROMOTION_REGISTRY_PATH ??
  "docs/reference/project-model/registers/implementation/implementation-trace.registry.yml";
const artifactIdPattern = /^MR-\d{4}ADR-\d{4}REQ-\d{4}(?:GOV-\d{4})?IMPL-\d{4}$/u;
const requirementIdPattern = /^(MR-\d{4})(ADR-\d{4})REQ-\d{4}(?:GOV-\d{4})?$/u;
const scaffoldPlaceholderPattern = /TODO:\s*implement the governed (?:tool|source-module|test) behavior\./u;

/** @param {string[]} argv @returns {{artifactId: string, confirmation: string}} */
function parseArguments(argv) {
  const values = { artifactId: "", confirmation: "" };
  const options = new Map([
    ["--artifact-id", "artifactId"],
    ["--confirm", "confirmation"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const field = options.get(argument);
    if (!field) throw new Error(`Unsupported argument: ${argument}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for argument: ${argument}`);
    values[field] = value.trim();
    index += 1;
  }
  for (const [argument, field] of options) {
    if (!values[field]) throw new Error(`Missing required argument: ${argument}`);
  }
  if (values.confirmation !== "promote") {
    throw new Error('Explicit promotion confirmation is required: --confirm promote');
  }
  if (!artifactIdPattern.test(values.artifactId)) throw new Error(`Invalid implementation artifact id: ${values.artifactId}`);
  return values;
}

/** @param {string} value @returns {string} */
function stripQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** @param {string[]} blockLines @param {string} field @returns {string} */
function readScalarField(blockLines, field) {
  const pattern = new RegExp(`^\\s{4}${field}:\\s*(.+?)\\s*$`, "u");
  for (const line of blockLines) {
    const match = line.match(pattern);
    if (match) return stripQuotes(match[1]);
  }
  return "";
}

/** @param {string[]} blockLines @returns {string[]} */
function readLinkedRequirementIds(blockLines) {
  const ids = [];
  const start = blockLines.findIndex((line) => /^\s{4}linked_requirement_ids:\s*$/u.test(line));
  if (start === -1) return ids;
  for (let index = start + 1; index < blockLines.length; index += 1) {
    const line = blockLines[index];
    const match = line.match(/^\s{6}-\s+([A-Za-z0-9-]+)\s*$/u);
    if (match) {
      ids.push(match[1]);
      continue;
    }
    if (/^\s{4}\S/u.test(line)) break;
  }
  return ids;
}

/** @param {string} registryText @param {string} artifactId */
function findArtifactRecord(registryText, artifactId) {
  const lines = registryText.replace(/\r\n/gu, "\n").split("\n");
  const start = lines.findIndex((line) => line.trim() === `- id: ${artifactId}`);
  if (start === -1) throw new Error(`Unknown implementation artifact id: ${artifactId}`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{2}-\s+id:\s+/u.test(lines[index])) {
      end = index;
      break;
    }
  }
  const blockLines = lines.slice(start, end);
  const linkedRequirementIds = readLinkedRequirementIds(blockLines);
  return {
    lines,
    start,
    end,
    blockLines,
    status: readScalarField(blockLines, "status"),
    artifactType: readScalarField(blockLines, "artifact_type"),
    scaffoldedPath: readScalarField(blockLines, "scaffolded_path"),
    implementedPath: readScalarField(blockLines, "implemented_path"),
    verificationCommand: readScalarField(blockLines, "verification_command"),
    linkedRequirementIds,
  };
}

/** @param {string} projectPath @returns {string} */
function resolveSafeProjectPath(projectPath) {
  const normalized = String(projectPath ?? "").replaceAll("\\", "/").trim();
  if (!normalized) throw new Error("Scaffolded artifact record is missing scaffolded_path.");
  if (path.isAbsolute(normalized) || path.win32.isAbsolute(normalized) || path.posix.isAbsolute(normalized)) {
    throw new Error(`Registered scaffolded path must be repository-relative: ${normalized}`);
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Registered scaffolded path is unsafe: ${normalized}`);
  }
  const absolutePath = path.resolve(rootDir, ...segments);
  if (absolutePath !== rootDir && !absolutePath.startsWith(`${rootDir}${path.sep}`)) {
    throw new Error(`Registered scaffolded path resolves outside the repository root: ${normalized}`);
  }
  return absolutePath;
}

/** @param {string} sourceText @returns {Set<string>} */
function readRequirementDeclarations(sourceText) {
  const ids = new Set();
  for (const match of sourceText.matchAll(/^\s*\*?\s*@implementsRequirement\s+([A-Za-z0-9-]+)\s*$/gmu)) ids.add(match[1]);
  return ids;
}

/** @param {string} sourceText @param {string[]} linkedRequirementIds */
function validateSourceTraceability(sourceText, linkedRequirementIds) {
  if (linkedRequirementIds.length === 0) throw new Error("Scaffolded artifact must link at least one governed Requirement.");
  const declarations = readRequirementDeclarations(sourceText);
  for (const requirementId of linkedRequirementIds) {
    if (!declarations.has(requirementId)) throw new Error(`Scaffolded source does not declare @implementsRequirement ${requirementId}.`);
  }
  const firstMatch = linkedRequirementIds[0].match(requirementIdPattern);
  if (!firstMatch) throw new Error(`Linked Requirement id cannot derive MR and ADR: ${linkedRequirementIds[0]}`);
  const macroRequirementId = firstMatch[1];
  const decisionReference = `${firstMatch[1]}/${firstMatch[2]}`;
  if (!new RegExp(`^\\s*\\*?\\s*@derivedFromDecision\\s+${decisionReference.replace("/", "\\/")}\\s*$`, "mu").test(sourceText)) {
    throw new Error(`Scaffolded source does not declare @derivedFromDecision ${decisionReference}.`);
  }
  if (!new RegExp(`^\\s*\\*?\\s*@macroRequirement\\s+${macroRequirementId}\\s*$`, "mu").test(sourceText)) {
    throw new Error(`Scaffolded source does not declare @macroRequirement ${macroRequirementId}.`);
  }
  const statusMatches = [...sourceText.matchAll(/^\s*\*?\s*@implementationStatus\s+([A-Za-z0-9_-]+)\s*$/gmu)];
  if (statusMatches.length !== 1 || statusMatches[0][1] !== "scaffolded") {
    throw new Error("Scaffolded source must declare exactly one @implementationStatus scaffolded.");
  }
}

/** @param {string} sourceText @param {string} artifactType */
function validateImplementedBehavior(sourceText, artifactType) {
  if (scaffoldPlaceholderPattern.test(sourceText)) {
    throw new Error("Scaffold placeholder must be removed before promotion.");
  }
  if (artifactType === "verification_artifact") {
    if (!/\b(?:test|it)\s*\(/u.test(sourceText)) throw new Error("Verification artifact must declare at least one test before promotion.");
    if (!/\b(?:assert(?:\.|\s*\()|expect\s*\()/u.test(sourceText)) {
      throw new Error("Verification artifact must contain at least one assertion before promotion.");
    }
    return;
  }
  const withoutShebang = sourceText.replace(/^#![^\n]*\n?/u, "");
  const withoutHeader = withoutShebang.replace(/\/\*\*[\s\S]*?\*\//u, "");
  const executableText = withoutHeader
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/^\s*\/\/.*$/gmu, "")
    .trim();
  if (!executableText) throw new Error("Source artifact must contain non-comment implementation behavior before promotion.");
}

/** @param {string} command @param {string} projectPath @returns {string[]} */
function parseVerificationCommand(command, projectPath) {
  const normalized = String(command ?? "").trim();
  for (const mode of ["--test", "--check"]) {
    const prefix = `node ${mode} `;
    if (normalized.startsWith(prefix)) {
      const commandPath = normalized.slice(prefix.length).trim().replaceAll("\\", "/");
      if (commandPath !== projectPath) throw new Error(`Verification command path does not match scaffolded_path: ${normalized}`);
      return [mode, projectPath];
    }
  }
  if (normalized === "node tools/repo-check.mjs") return ["tools/repo-check.mjs"];
  throw new Error(`Unsupported governed verification command: ${normalized || "<empty>"}`);
}

/** @param {string[]} args @returns {void} */
function runVerification(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    const details = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(`Governed verification failed with exit code ${result.status ?? "unknown"}${details ? `: ${details}` : ""}`);
  }
}

/** @param {ReturnType<typeof findArtifactRecord>} record @param {string} artifactId @param {string} projectPath @returns {string} */
function renderUpdatedRegistry(record, artifactId, projectPath) {
  let statusUpdated = false;
  let pathUpdated = false;
  let reasonUpdated = false;
  const updatedBlock = record.blockLines.map((line) => {
    if (/^\s{4}status:\s*scaffolded\s*$/u.test(line)) {
      statusUpdated = true;
      return "    status: implemented";
    }
    if (/^\s{4}scaffolded_path:\s*/u.test(line)) {
      pathUpdated = true;
      return `    implemented_path: ${projectPath}`;
    }
    if (/^\s{4}reason:\s*/u.test(line)) {
      reasonUpdated = true;
      return `    reason: ${JSON.stringify(`Promoted ${artifactId} after source completeness checks and governed verification succeeded.`)}`;
    }
    return line;
  });
  if (!statusUpdated || !pathUpdated) throw new Error("Scaffolded registry record cannot be promoted because mandatory fields are missing.");
  if (!reasonUpdated) {
    const insertAt = updatedBlock.findIndex((line) => /^\s{4}verification_command:/u.test(line));
    const reason = `    reason: ${JSON.stringify(`Promoted ${artifactId} after source completeness checks and governed verification succeeded.`)}`;
    if (insertAt === -1) updatedBlock.push(reason);
    else updatedBlock.splice(insertAt, 0, reason);
  }
  return [...record.lines.slice(0, record.start), ...updatedBlock, ...record.lines.slice(record.end)].join("\n");
}

/** @param {string} sourceText @returns {string} */
function renderUpdatedSource(sourceText) {
  return sourceText.replace(
    /^(\s*\*?\s*@implementationStatus\s+)scaffolded(\s*)$/mu,
    "$1implemented$2",
  );
}

/** @param {string} sourcePath @param {string} updatedSource @param {string} registryPath @param {string} updatedRegistry */
function applyTransaction(sourcePath, updatedSource, registryPath, updatedRegistry) {
  const transactionId = `${process.pid}-${Date.now()}`;
  const sourceTemp = `${sourcePath}.tf-${transactionId}.tmp`;
  const registryTemp = `${registryPath}.tf-${transactionId}.tmp`;
  const sourceBackup = `${sourcePath}.tf-${transactionId}.bak`;
  const registryBackup = `${registryPath}.tf-${transactionId}.bak`;
  let sourceMoved = false;
  let registryMoved = false;
  let sourceInstalled = false;
  let registryInstalled = false;
  try {
    fs.writeFileSync(sourceTemp, updatedSource, { encoding: "utf8", flag: "wx" });
    fs.writeFileSync(registryTemp, updatedRegistry, { encoding: "utf8", flag: "wx" });
    fs.renameSync(sourcePath, sourceBackup);
    sourceMoved = true;
    fs.renameSync(registryPath, registryBackup);
    registryMoved = true;
    fs.renameSync(sourceTemp, sourcePath);
    sourceInstalled = true;
    fs.renameSync(registryTemp, registryPath);
    registryInstalled = true;
    fs.unlinkSync(sourceBackup);
    fs.unlinkSync(registryBackup);
  } catch (error) {
    try {
      if (sourceInstalled && fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
      if (registryInstalled && fs.existsSync(registryPath)) fs.unlinkSync(registryPath);
      if (sourceMoved && fs.existsSync(sourceBackup)) fs.renameSync(sourceBackup, sourcePath);
      if (registryMoved && fs.existsSync(registryBackup)) fs.renameSync(registryBackup, registryPath);
      for (const temporaryPath of [sourceTemp, registryTemp, sourceBackup, registryBackup]) {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      }
    } catch (rollbackError) {
      throw new Error(`${error.message}; rollback also failed: ${rollbackError.message}`);
    }
    throw error;
  }
}

/** @param {{artifactId: string, confirmation: string}} options */
function run(options) {
  const registryPath = path.join(rootDir, registryProjectPath);
  if (!fs.existsSync(registryPath)) throw new Error(`Implementation trace registry is missing: ${registryProjectPath}`);
  const registryText = fs.readFileSync(registryPath, "utf8").replace(/^\uFEFF/u, "");
  const record = findArtifactRecord(registryText, options.artifactId);
  if (record.status !== "scaffolded") {
    throw new Error(`Implementation artifact is not promotable from status ${record.status || "<empty>"}: ${options.artifactId}`);
  }
  if (record.implementedPath) throw new Error(`Scaffolded artifact already declares implemented_path: ${options.artifactId}`);
  const sourcePath = resolveSafeProjectPath(record.scaffoldedPath);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error(`Scaffolded source file is missing: ${record.scaffoldedPath}`);
  }
  const sourceText = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/u, "");
  validateSourceTraceability(sourceText, record.linkedRequirementIds);
  validateImplementedBehavior(sourceText, record.artifactType);
  const verificationArgs = parseVerificationCommand(record.verificationCommand, record.scaffoldedPath);
  runVerification(verificationArgs);
  const updatedSource = renderUpdatedSource(sourceText);
  const updatedRegistry = renderUpdatedRegistry(record, options.artifactId, record.scaffoldedPath);
  applyTransaction(sourcePath, updatedSource, registryPath, updatedRegistry);
  console.log("Governed implementation scaffold promoted.");
  console.log(`Artifact id: ${options.artifactId}`);
  console.log("Status: implemented");
  console.log(`Path: ${record.scaffoldedPath}`);
  console.log(`Implementation trace registry: ${registryProjectPath}`);
  console.log(`Verification command: ${record.verificationCommand}`);
}

try {
  run(parseArguments(process.argv.slice(2)));
} catch (error) {
  console.error(`Governed implementation promotion failed: ${error.message}`);
  process.exitCode = 1;
}

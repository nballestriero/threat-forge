#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * @file Governed planned artifact promotion.
 *
 * @implementsRequirement MR-0002ADR-0003REQ-0003GOV-0001
 * @derivedFromDecision MR-0002/ADR-0003
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Promotes one verified materialized non-source artifact from planned to
 * implemented. The artifact bytes remain unchanged while its implementation
 * trace record is updated through one rollback-protected registry transaction.
 * The command executes only supported Node verification forms and never invokes
 * a shell, Git commit or Git push operation.
 *
 * Side effects: reads one materialized artifact and the implementation trace
 * registry; executes its registered governed Node verification command; after
 * explicit confirmation updates only the registry; writes diagnostics to
 * stdout/stderr; exits non-zero without persistent trace or artifact changes on
 * failure.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = process.env.TF_PLANNED_ARTIFACT_PROMOTION_ROOT
  ? path.resolve(process.env.TF_PLANNED_ARTIFACT_PROMOTION_ROOT)
  : path.resolve(scriptDir, "..", "..");
const registryProjectPath = process.env.TF_PLANNED_ARTIFACT_PROMOTION_REGISTRY_PATH ??
  "docs/reference/project-model/registers/implementation/implementation-trace.registry.yml";
const artifactIdPattern = /^MR-\d{4}ADR-\d{4}REQ-\d{4}(?:GOV-\d{4})?IMPL-\d{4}$/u;
const nonSourceArtifactTypes = new Set(["fixture", "report"]);

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
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for argument: ${argument}`);
    }
    values[field] = value.trim();
    index += 1;
  }

  for (const [argument, field] of options) {
    if (!values[field]) throw new Error(`Missing required argument: ${argument}`);
  }
  if (values.confirmation !== "promote") {
    throw new Error("Explicit planned artifact promotion confirmation is required: --confirm promote");
  }
  if (!artifactIdPattern.test(values.artifactId)) {
    throw new Error(`Invalid implementation artifact id: ${values.artifactId}`);
  }
  return values;
}

/** @param {string} value @returns {string} */
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
  const lines = registryText.replace(/\r\n?/gu, "\n").split("\n");
  const starts = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() === `- id: ${artifactId}`) starts.push(index);
  }
  if (starts.length === 0) throw new Error(`Unknown implementation artifact id: ${artifactId}`);
  if (starts.length > 1) throw new Error(`Ambiguous implementation artifact id: ${artifactId}`);

  const start = starts[0];
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{2}-\s+id:\s+/u.test(lines[index])) {
      end = index;
      break;
    }
  }
  const blockLines = lines.slice(start, end);
  return {
    lines,
    start,
    end,
    blockLines,
    status: readScalarField(blockLines, "status"),
    artifactType: readScalarField(blockLines, "artifact_type"),
    plannedPath: readScalarField(blockLines, "planned_path"),
    scaffoldedPath: readScalarField(blockLines, "scaffolded_path"),
    implementedPath: readScalarField(blockLines, "implemented_path"),
    verificationCommand: readScalarField(blockLines, "verification_command"),
    linkedRequirementIds: readLinkedRequirementIds(blockLines),
  };
}

/** @param {string} projectPath @returns {{projectPath: string, absolutePath: string}} */
function resolveSafeProjectPath(projectPath) {
  const normalized = String(projectPath ?? "").replaceAll("\\", "/").trim();
  if (!normalized) throw new Error("Planned artifact record is missing planned_path.");
  if (path.isAbsolute(normalized) || path.win32.isAbsolute(normalized) || path.posix.isAbsolute(normalized)) {
    throw new Error(`Registered planned path must be repository-relative: ${normalized}`);
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Registered planned path is unsafe: ${normalized}`);
  }
  if (segments[0] === "old") {
    throw new Error(`Registered planned path must not target the legacy old/ directory: ${normalized}`);
  }
  const absolutePath = path.resolve(rootDir, ...segments);
  if (absolutePath !== rootDir && !absolutePath.startsWith(`${rootDir}${path.sep}`)) {
    throw new Error(`Registered planned path resolves outside the repository root: ${normalized}`);
  }
  return { projectPath: normalized, absolutePath };
}

/** @param {string} command @param {string} projectPath @returns {string[]} */
function parseVerificationCommand(command, projectPath) {
  const normalized = String(command ?? "").trim();
  for (const mode of ["--test", "--check"]) {
    const prefix = `node ${mode} `;
    if (normalized.startsWith(prefix)) {
      const commandPath = normalized.slice(prefix.length).trim().replaceAll("\\", "/");
      if (commandPath !== projectPath) {
        throw new Error(`Verification command path does not match planned_path: ${normalized}`);
      }
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
    throw new Error(
      `Governed verification failed with exit code ${result.status ?? "unknown"}${details ? `: ${details}` : ""}`,
    );
  }
}

/** @param {string} filePath @param {Buffer} expectedBytes @returns {boolean} */
function fileMatches(filePath, expectedBytes) {
  return fs.existsSync(filePath) &&
    fs.statSync(filePath).isFile() &&
    Buffer.compare(fs.readFileSync(filePath), expectedBytes) === 0;
}

/** @param {string} filePath @param {Buffer} bytes @returns {void} */
function restoreFile(filePath, bytes) {
  if (fs.existsSync(filePath) && !fs.statSync(filePath).isFile()) {
    fs.rmSync(filePath, { recursive: true, force: true });
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, bytes);
}

/** @param {{label: string, filePath: string, bytes: Buffer}[]} protectedFiles */
function restoreChangedFiles(protectedFiles) {
  for (const entry of protectedFiles) {
    if (!fileMatches(entry.filePath, entry.bytes)) restoreFile(entry.filePath, entry.bytes);
  }
}

/** @param {string[]} verificationArgs @param {{label: string, filePath: string, bytes: Buffer}[]} protectedFiles */
function runVerificationPreservingFiles(verificationArgs, protectedFiles) {
  try {
    runVerification(verificationArgs);
  } catch (error) {
    try {
      restoreChangedFiles(protectedFiles);
    } catch (restoreError) {
      throw new Error(`${error.message}; protected file restoration also failed: ${restoreError.message}`);
    }
    throw error;
  }
  const changed = protectedFiles.filter((entry) => !fileMatches(entry.filePath, entry.bytes));
  if (changed.length > 0) {
    restoreChangedFiles(protectedFiles);
    throw new Error(
      `Governed verification modified protected input: ${changed.map((entry) => entry.label).join(", ")}; original bytes were restored.`,
    );
  }
}

/** @param {ReturnType<typeof findArtifactRecord>} record @param {string} artifactId @param {string} projectPath */
function renderUpdatedRegistry(record, artifactId, projectPath) {
  let statusCount = 0;
  let pathCount = 0;
  let reasonCount = 0;
  const updatedBlock = record.blockLines.map((line) => {
    if (/^\s{4}status:\s*planned\s*$/u.test(line)) {
      statusCount += 1;
      return "    status: implemented";
    }
    if (/^\s{4}planned_path:\s*/u.test(line)) {
      pathCount += 1;
      return `    implemented_path: ${projectPath}`;
    }
    if (/^\s{4}reason:\s*/u.test(line)) {
      reasonCount += 1;
      return `    reason: ${JSON.stringify(`Promoted ${artifactId} after materialized artifact verification succeeded without changing artifact bytes.`)}`;
    }
    return line;
  });
  if (statusCount !== 1 || pathCount !== 1) {
    throw new Error("Planned registry record cannot be promoted because mandatory fields are missing or duplicated.");
  }
  if (reasonCount > 1) throw new Error("Planned registry record declares duplicate reason fields.");
  if (reasonCount === 0) {
    const insertAt = updatedBlock.findIndex((line) => /^\s{4}verification_command:/u.test(line));
    const reason = `    reason: ${JSON.stringify(`Promoted ${artifactId} after materialized artifact verification succeeded without changing artifact bytes.`)}`;
    if (insertAt === -1) updatedBlock.push(reason);
    else updatedBlock.splice(insertAt, 0, reason);
  }
  return [...record.lines.slice(0, record.start), ...updatedBlock, ...record.lines.slice(record.end)].join("\n");
}

/** @param {string} registryPath @param {string} updatedRegistry @returns {void} */
function applyRegistryTransaction(registryPath, updatedRegistry) {
  const transactionId = `${process.pid}-${Date.now()}`;
  const registryTemp = `${registryPath}.tf-${transactionId}.tmp`;
  const registryBackup = `${registryPath}.tf-${transactionId}.bak`;
  let registryMoved = false;
  let registryInstalled = false;
  try {
    fs.writeFileSync(registryTemp, updatedRegistry, { encoding: "utf8", flag: "wx" });
    fs.renameSync(registryPath, registryBackup);
    registryMoved = true;
    fs.renameSync(registryTemp, registryPath);
    registryInstalled = true;
    fs.unlinkSync(registryBackup);
  } catch (error) {
    try {
      if (registryInstalled && fs.existsSync(registryPath)) fs.unlinkSync(registryPath);
      if (registryMoved && fs.existsSync(registryBackup)) fs.renameSync(registryBackup, registryPath);
      for (const temporaryPath of [registryTemp, registryBackup]) {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      }
    } catch (rollbackError) {
      throw new Error(`${error.message}; rollback also failed: ${rollbackError.message}`);
    }
    throw error;
  }
}

/** @param {{artifactId: string, confirmation: string}} options @returns {void} */
function run(options) {
  const registryPath = path.join(rootDir, ...registryProjectPath.split("/"));
  if (!fs.existsSync(registryPath) || !fs.statSync(registryPath).isFile()) {
    throw new Error(`Implementation trace registry is missing: ${registryProjectPath}`);
  }
  const registryText = fs.readFileSync(registryPath, "utf8").replace(/^\uFEFF/u, "");
  const record = findArtifactRecord(registryText, options.artifactId);
  if (record.status !== "planned") {
    throw new Error(`Implementation artifact is not promotable from status ${record.status || "<empty>"}: ${options.artifactId}`);
  }
  if (!nonSourceArtifactTypes.has(record.artifactType)) {
    throw new Error(
      `Planned artifact promotion supports only materialized non-source artifact types fixture and report: ${record.artifactType || "<empty>"}`,
    );
  }
  if (record.scaffoldedPath) {
    throw new Error(`Planned artifact unexpectedly declares scaffolded_path: ${options.artifactId}`);
  }
  if (record.implementedPath) {
    throw new Error(`Planned artifact already declares implemented_path: ${options.artifactId}`);
  }
  if (record.linkedRequirementIds.length === 0) {
    throw new Error(`Planned artifact must link at least one governed Requirement: ${options.artifactId}`);
  }

  const resolved = resolveSafeProjectPath(record.plannedPath);
  if (!fs.existsSync(resolved.absolutePath) || !fs.statSync(resolved.absolutePath).isFile()) {
    throw new Error(`Materialized planned artifact file is missing: ${resolved.projectPath}`);
  }
  const artifactBytes = fs.readFileSync(resolved.absolutePath);
  const registryBytes = fs.readFileSync(registryPath);
  const updatedRegistry = renderUpdatedRegistry(record, options.artifactId, resolved.projectPath);
  const verificationArgs = parseVerificationCommand(record.verificationCommand, resolved.projectPath);
  runVerificationPreservingFiles(verificationArgs, [
    { label: "materialized artifact", filePath: resolved.absolutePath, bytes: artifactBytes },
    { label: "implementation trace registry", filePath: registryPath, bytes: registryBytes },
  ]);
  applyRegistryTransaction(registryPath, updatedRegistry);

  console.log("Governed planned artifact promoted.");
  console.log(`Artifact id: ${options.artifactId}`);
  console.log("Status: implemented");
  console.log(`Path: ${resolved.projectPath}`);
  console.log(`Implementation trace registry: ${registryProjectPath}`);
  console.log(`Verification command: ${record.verificationCommand}`);
}

try {
  run(parseArguments(process.argv.slice(2)));
} catch (error) {
  console.error(`Governed planned artifact promotion failed: ${error.message}`);
  process.exitCode = 1;
}

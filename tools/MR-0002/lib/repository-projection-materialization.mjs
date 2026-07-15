import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  loadDocumentationFieldValueCatalog,
  resolveDocumentationFieldValue,
} from "../../MR-0001/lib/documentation-field-values.mjs";
import { readGovernedYamlFile } from "../../MR-0001/lib/governed-yaml.mjs";

/**
 * @file Governed repository projection materialization core.
 *
 * @implementsRequirement MR-0002ADR-0002REQ-0002
 * @implementsRequirement MR-0002ADR-0002REQ-0002GOV-0001
 * @implementsRequirement MR-0002ADR-0002REQ-0002GOV-0002
 * @derivedFromDecision MR-0002/ADR-0002
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Loads the canonical repository projection materialization registry, validates
 * controlled lifecycle values and output boundaries, executes active
 * materializers without a shell, proves byte-level idempotence through two
 * complete passes, and restores the pre-run workspace state after any
 * pre-stage failure.
 *
 * Side effects: reads governed registries and repository files; an active
 * session executes only registered materializer write and check commands. A
 * failed or explicitly rolled-back session restores every candidate repository
 * file changed after the session snapshot. The module performs no Git stage,
 * commit, or push operations.
 */

export const repositoryProjectionMaterializationRegistryProjectPath =
  "docs/reference/project-model/registers/materialization/repository-projections.registry.yml";

const requirementsRegistryDirectoryProjectPath =
  "docs/reference/project-model/registers/requirements";
const canonicalRootFields = [
  "schema_version",
  "registry_id",
  "scope",
  "materializers",
];
const canonicalRecordFields = [
  "id",
  "title",
  "status",
  "write_command",
  "write_args",
  "check_command",
  "check_args",
  "generated_paths",
  "linked_requirement_ids",
];

/** @param {unknown} value @param {string} label @returns {Record<string, unknown>} */
function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

/** @param {unknown} value @param {string} label @returns {unknown[]} */
function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

/** @param {unknown} value @param {string} label @returns {string} */
function requireString(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${label} must be a non-empty string.`);
  if (/\r|\n/u.test(normalized)) throw new Error(`${label} must be a single line.`);
  return normalized;
}

/** @param {Record<string, unknown>} value @param {string[]} expected @param {string} label */
function requireCanonicalFieldOrder(value, expected, label) {
  const actual = Object.keys(value);
  if (
    actual.length !== expected.length ||
    actual.some((field, index) => field !== expected[index])
  ) {
    throw new Error(
      `${label} fields must be exactly: ${expected.join(", ")}; received: ${actual.join(", ") || "<none>"}.`,
    );
  }
}

/** @param {string} value @returns {string} */
function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, "").trim();
}

/**
 * Resolves one safe repository-relative file path.
 *
 * @param {string} rootDir - Absolute repository root.
 * @param {unknown} value - Candidate repository path.
 * @param {string} label - Diagnostic label.
 * @returns {{projectPath: string, absolutePath: string}}
 */
function resolveSafeProjectFilePath(rootDir, value, label) {
  const projectPath = normalizeProjectPath(requireString(value, label));
  if (
    path.isAbsolute(projectPath) ||
    path.win32.isAbsolute(projectPath) ||
    path.posix.isAbsolute(projectPath)
  ) {
    throw new Error(`${label} must be repository-relative: ${projectPath}`);
  }
  const segments = projectPath.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`${label} is unsafe: ${projectPath}`);
  }
  const absolutePath = path.resolve(rootDir, ...segments);
  if (
    absolutePath !== rootDir &&
    !absolutePath.startsWith(`${rootDir}${path.sep}`)
  ) {
    throw new Error(`${label} resolves outside the repository root: ${projectPath}`);
  }
  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
    throw new Error(`${label} must identify a file, not a directory: ${projectPath}`);
  }
  return { projectPath, absolutePath };
}

/**
 * Resolves an executable without allowing shell syntax or unsafe paths.
 *
 * @param {string} rootDir - Absolute repository root.
 * @param {unknown} value - Registered command.
 * @param {string} label - Diagnostic label.
 * @returns {{registeredCommand: string, executable: string}}
 */
function resolveRegisteredCommand(rootDir, value, label) {
  const command = requireString(value, label);
  if (/[;&|`$<>\r\n]/u.test(command)) {
    throw new Error(`${label} contains forbidden shell syntax: ${command}`);
  }
  if (command === "node") {
    return { registeredCommand: command, executable: process.execPath };
  }
  if (command.includes("/") || command.includes("\\")) {
    const resolved = resolveSafeProjectFilePath(rootDir, command, label);
    return { registeredCommand: command, executable: resolved.absolutePath };
  }
  if (!/^[A-Za-z0-9._-]+$/u.test(command)) {
    throw new Error(`${label} is not a safe bare executable name: ${command}`);
  }
  return { registeredCommand: command, executable: command };
}

/** @param {unknown} value @param {string} label @returns {string[]} */
function requireOrderedStringArray(value, label) {
  return requireArray(value, label).map((entry, index) =>
    requireString(entry, `${label}[${index}]`),
  );
}

/**
 * Runs Git and captures stdout.
 *
 * @param {string} rootDir - Repository root.
 * @param {string[]} args - Git arguments.
 * @returns {Buffer}
 */
function captureGit(rootDir, args) {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: null,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  if (result.error) throw new Error(`Cannot execute git ${args.join(" ")}: ${result.error.message}`);
  if (result.status !== 0) {
    const diagnostic = Buffer.from(result.stderr ?? "").toString("utf8").trim();
    throw new Error(diagnostic || `git ${args.join(" ")} exited with ${result.status}.`);
  }
  return Buffer.from(result.stdout ?? "");
}

/**
 * Loads every known Requirement identifier from MR-scoped registries.
 *
 * @param {string} rootDir - Repository root.
 * @returns {Set<string>}
 */
function loadKnownRequirementIds(rootDir) {
  const requirementsDir = resolveSafeProjectFilePath(
    rootDir,
    `${requirementsRegistryDirectoryProjectPath}/placeholder.yml`,
    "Requirement registry directory",
  ).absolutePath.replace(`${path.sep}placeholder.yml`, "");
  if (!fs.existsSync(requirementsDir) || !fs.statSync(requirementsDir).isDirectory()) {
    throw new Error(`Requirement registry directory is missing: ${requirementsRegistryDirectoryProjectPath}`);
  }
  const ids = new Set();
  for (const entry of fs.readdirSync(requirementsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !/^MR-\d{4}\.requirements\.registry\.yml$/u.test(entry.name)) continue;
    const registry = readGovernedYamlFile(path.join(requirementsDir, entry.name));
    for (const requirement of requireArray(registry.requirements, `${entry.name}.requirements`)) {
      const record = requireObject(requirement, `${entry.name} Requirement`);
      ids.add(requireString(record.id, `${entry.name} Requirement id`));
    }
  }
  return ids;
}

/**
 * Validates and normalizes the canonical materialization registry.
 *
 * @param {Record<string, unknown>} registry - Parsed registry.
 * @param {{rootDir: string, registryProjectPath?: string}} options - Validation options.
 * @returns {{schemaVersion: number, registryId: string, scope: string, materializers: Array<Record<string, unknown>>}}
 */
export function validateRepositoryProjectionMaterializationRegistry(registry, options) {
  const rootDir = path.resolve(requireString(options?.rootDir, "rootDir"));
  const registryProjectPath = normalizeProjectPath(
    options?.registryProjectPath ?? repositoryProjectionMaterializationRegistryProjectPath,
  );
  const root = requireObject(registry, "Repository projection materialization registry");
  requireCanonicalFieldOrder(root, canonicalRootFields, "Materialization registry root");

  const schemaVersion = root.schema_version;
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error("Materialization registry schema_version must be a positive integer.");
  }
  const registryId = requireString(root.registry_id, "Materialization registry registry_id");
  const scope = requireString(root.scope, "Materialization registry scope");
  const records = requireArray(root.materializers, "Materialization registry materializers");
  const catalog = loadDocumentationFieldValueCatalog({ rootDir });
  const knownRequirementIds = loadKnownRequirementIds(rootDir);
  const seenIds = new Set();
  const activeOutputOwners = new Map();

  const materializers = records.map((entry, index) => {
    const record = requireObject(entry, `materializers[${index}]`);
    requireCanonicalFieldOrder(record, canonicalRecordFields, `materializers[${index}]`);
    const id = requireString(record.id, `materializers[${index}].id`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) {
      throw new Error(`${id} must use lowercase kebab-case.`);
    }
    if (seenIds.has(id)) throw new Error(`Duplicate materializer id: ${id}`);
    seenIds.add(id);

    const title = requireString(record.title, `${id}.title`);
    const status = requireString(record.status, `${id}.status`);
    resolveDocumentationFieldValue(catalog, {
      registryPath: registryProjectPath,
      recordType: "materializers",
      fieldName: "status",
      value: status,
    });

    const writeCommand = resolveRegisteredCommand(rootDir, record.write_command, `${id}.write_command`);
    const checkCommand = resolveRegisteredCommand(rootDir, record.check_command, `${id}.check_command`);
    const writeArgs = requireOrderedStringArray(record.write_args, `${id}.write_args`);
    const checkArgs = requireOrderedStringArray(record.check_args, `${id}.check_args`);
    if (writeArgs.length === 0) throw new Error(`${id}.write_args must not be empty.`);
    if (checkArgs.length === 0) throw new Error(`${id}.check_args must not be empty.`);

    const generatedPaths = requireOrderedStringArray(record.generated_paths, `${id}.generated_paths`).map(
      (projectPath, pathIndex) =>
        resolveSafeProjectFilePath(rootDir, projectPath, `${id}.generated_paths[${pathIndex}]`).projectPath,
    );
    if (generatedPaths.length === 0) throw new Error(`${id}.generated_paths must not be empty.`);
    if (new Set(generatedPaths).size !== generatedPaths.length) {
      throw new Error(`${id} declares duplicate generated paths.`);
    }

    const linkedRequirementIds = requireOrderedStringArray(
      record.linked_requirement_ids,
      `${id}.linked_requirement_ids`,
    );
    if (linkedRequirementIds.length === 0) {
      throw new Error(`${id}.linked_requirement_ids must not be empty.`);
    }
    for (const requirementId of linkedRequirementIds) {
      if (!knownRequirementIds.has(requirementId)) {
        throw new Error(`${id} links unknown Requirement id: ${requirementId}`);
      }
    }

    if (status === "active") {
      for (const generatedPath of generatedPaths) {
        for (const [existingPath, owner] of activeOutputOwners) {
          if (
            generatedPath === existingPath ||
            generatedPath.startsWith(`${existingPath}/`) ||
            existingPath.startsWith(`${generatedPath}/`)
          ) {
            throw new Error(
              `Active materializers ${owner} and ${id} declare overlapping generated paths: ${existingPath} and ${generatedPath}`,
            );
          }
        }
        activeOutputOwners.set(generatedPath, id);
      }
    }

    return Object.freeze({
      id,
      title,
      status,
      writeCommand: writeCommand.registeredCommand,
      writeExecutable: writeCommand.executable,
      writeArgs,
      checkCommand: checkCommand.registeredCommand,
      checkExecutable: checkCommand.executable,
      checkArgs,
      generatedPaths,
      linkedRequirementIds,
    });
  });

  return Object.freeze({
    schemaVersion,
    registryId,
    scope,
    materializers: Object.freeze(materializers),
  });
}

/**
 * Loads the canonical materialization registry.
 *
 * @param {{rootDir: string, registryProjectPath?: string}} options - Load options.
 * @returns {ReturnType<typeof validateRepositoryProjectionMaterializationRegistry>}
 */
export function loadRepositoryProjectionMaterializers(options) {
  const rootDir = path.resolve(requireString(options?.rootDir, "rootDir"));
  const registryProjectPath = normalizeProjectPath(
    options?.registryProjectPath ?? repositoryProjectionMaterializationRegistryProjectPath,
  );
  const registryPath = resolveSafeProjectFilePath(
    rootDir,
    registryProjectPath,
    "Materialization registry path",
  ).absolutePath;
  if (!fs.existsSync(registryPath)) {
    throw new Error(`Materialization registry is missing: ${registryProjectPath}`);
  }
  return validateRepositoryProjectionMaterializationRegistry(
    readGovernedYamlFile(registryPath),
    { rootDir, registryProjectPath },
  );
}

/** @param {Buffer} value @returns {string} */
function hashBuffer(value) {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Returns tracked and non-ignored untracked candidate file paths.
 *
 * @param {string} rootDir - Repository root.
 * @param {string[]} additionalPaths - Paths that must be snapshotted even when ignored.
 * @returns {string[]}
 */
function listCandidateProjectPaths(rootDir, additionalPaths = []) {
  const output = captureGit(rootDir, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]);
  const paths = output
    .toString("utf8")
    .split("\0")
    .map(normalizeProjectPath)
    .filter(Boolean);
  return [...new Set([...paths, ...additionalPaths.map(normalizeProjectPath).filter(Boolean)])]
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true, sensitivity: "base" }));
}

/**
 * Captures file content, symlink target and mode for one path.
 *
 * @param {string} rootDir - Repository root.
 * @param {string} projectPath - Repository-relative path.
 * @returns {Record<string, unknown>}
 */
function snapshotPath(rootDir, projectPath) {
  const { absolutePath } = resolveSafeProjectFilePath(rootDir, projectPath, "Snapshot path");
  if (!fs.existsSync(absolutePath)) {
    return Object.freeze({ projectPath, kind: "missing", fingerprint: "missing" });
  }
  const stat = fs.lstatSync(absolutePath);
  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(absolutePath);
    return Object.freeze({
      projectPath,
      kind: "symlink",
      target,
      mode: stat.mode,
      fingerprint: `symlink:${stat.mode}:${target}`,
    });
  }
  if (!stat.isFile()) {
    throw new Error(`Candidate repository path must be a file or symlink: ${projectPath}`);
  }
  const content = fs.readFileSync(absolutePath);
  return Object.freeze({
    projectPath,
    kind: "file",
    content,
    mode: stat.mode,
    fingerprint: `file:${stat.mode}:${hashBuffer(content)}`,
  });
}

/**
 * Captures all candidate repository files.
 *
 * @param {string} rootDir - Repository root.
 * @param {string[]} additionalPaths - Declared generated paths.
 * @returns {Map<string, Record<string, unknown>>}
 */
function snapshotRepository(rootDir, additionalPaths = []) {
  return new Map(
    listCandidateProjectPaths(rootDir, additionalPaths).map((projectPath) => [
      projectPath,
      snapshotPath(rootDir, projectPath),
    ]),
  );
}

/**
 * Compares two repository snapshots.
 *
 * @param {Map<string, Record<string, unknown>>} before - Earlier snapshot.
 * @param {Map<string, Record<string, unknown>>} after - Later snapshot.
 * @returns {string[]} Changed project paths.
 */
function diffSnapshots(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths]
    .filter((projectPath) =>
      String(before.get(projectPath)?.fingerprint ?? "missing") !==
      String(after.get(projectPath)?.fingerprint ?? "missing"),
    )
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true, sensitivity: "base" }));
}

/**
 * Restores one path to a snapshot state.
 *
 * @param {string} rootDir - Repository root.
 * @param {Record<string, unknown>|undefined} snapshot - Baseline state.
 * @param {string} projectPath - Repository-relative path.
 */
function restorePath(rootDir, snapshot, projectPath) {
  const { absolutePath } = resolveSafeProjectFilePath(rootDir, projectPath, "Rollback path");
  const state = snapshot ?? { kind: "missing" };
  if (state.kind === "missing") {
    fs.rmSync(absolutePath, { recursive: true, force: true });
    return;
  }
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.rmSync(absolutePath, { recursive: true, force: true });
  if (state.kind === "symlink") {
    fs.symlinkSync(String(state.target), absolutePath);
    return;
  }
  if (state.kind === "file") {
    fs.writeFileSync(absolutePath, Buffer.from(state.content));
    fs.chmodSync(absolutePath, Number(state.mode) & 0o777);
    return;
  }
  throw new Error(`Unsupported rollback snapshot kind for ${projectPath}: ${state.kind}`);
}

/**
 * Executes one registered command without shell interpolation.
 *
 * @param {string} rootDir - Repository root.
 * @param {string} label - Operation label.
 * @param {string} executable - Resolved executable.
 * @param {string[]} args - Ordered arguments.
 * @param {"inherit"|"pipe"} stdioMode - Output mode.
 */
function executeRegisteredCommand(rootDir, label, executable, args, stdioMode) {
  if (stdioMode === "inherit") console.log(`\n==> ${label}`);
  const result = spawnSync(executable, args, {
    cwd: rootDir,
    encoding: stdioMode === "pipe" ? "utf8" : undefined,
    stdio: stdioMode === "pipe" ? ["ignore", "pipe", "pipe"] : "inherit",
    shell: false,
  });
  if (result.error) throw new Error(`${label} failed to start: ${result.error.message}`);
  if (result.status !== 0) {
    const diagnostics = stdioMode === "pipe"
      ? `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim()
      : "";
    throw new Error(
      `${label} failed with exit code ${result.status ?? "unknown"}` +
      (diagnostics ? `: ${diagnostics}` : "."),
    );
  }
}

/**
 * Creates a rollback-capable materialization session.
 *
 * @param {{rootDir: string, registryProjectPath?: string, stdio?: "inherit"|"pipe"}} options - Session options.
 * @returns {{execute: () => Record<string, unknown>, rollback: () => void, release: () => void, getState: () => string}}
 */
export function createRepositoryProjectionMaterializationSession(options) {
  const rootDir = path.resolve(requireString(options?.rootDir, "rootDir"));
  const stdioMode = options?.stdio === "pipe" ? "pipe" : "inherit";
  const registry = loadRepositoryProjectionMaterializers({
    rootDir,
    registryProjectPath: options?.registryProjectPath,
  });
  const activeMaterializers = registry.materializers.filter((record) => record.status === "active");
  const generatedPaths = activeMaterializers.flatMap((record) => record.generatedPaths);
  const baseline = snapshotRepository(rootDir, generatedPaths);
  let state = "prepared";

  function rollbackInternal() {
    if (state === "released" || state === "rolled_back") return;
    const current = snapshotRepository(rootDir, generatedPaths);
    const changedPaths = diffSnapshots(baseline, current);
    for (const projectPath of changedPaths) {
      restorePath(rootDir, baseline.get(projectPath), projectPath);
    }
    const restored = snapshotRepository(rootDir, generatedPaths);
    const remaining = diffSnapshots(baseline, restored);
    if (remaining.length > 0) {
      throw new Error(`Materialization rollback is incomplete: ${remaining.join(", ")}`);
    }
    state = "rolled_back";
  }

  function runBoundedCommand(materializer, phase, executable, args, allowedChanges) {
    const before = snapshotRepository(rootDir, generatedPaths);
    executeRegisteredCommand(
      rootDir,
      `${materializer.title} (${phase})`,
      executable,
      args,
      stdioMode,
    );
    const after = snapshotRepository(rootDir, generatedPaths);
    const changedPaths = diffSnapshots(before, after);
    const undeclared = changedPaths.filter((projectPath) => !allowedChanges.has(projectPath));
    if (undeclared.length > 0) {
      throw new Error(
        `${materializer.id} changed undeclared repository paths during ${phase}: ${undeclared.join(", ")}`,
      );
    }
    return changedPaths;
  }

  function runWritePass(passName) {
    for (const materializer of activeMaterializers) {
      runBoundedCommand(
        materializer,
        `${passName} write`,
        materializer.writeExecutable,
        materializer.writeArgs,
        new Set(materializer.generatedPaths),
      );
    }
  }

  function runCheckPass(passName) {
    for (const materializer of activeMaterializers) {
      runBoundedCommand(
        materializer,
        `${passName} check`,
        materializer.checkExecutable,
        materializer.checkArgs,
        new Set(),
      );
    }
  }

  return Object.freeze({
    execute() {
      if (state !== "prepared") throw new Error(`Materialization session cannot execute from state ${state}.`);
      state = "executing";
      try {
        runWritePass("first materialization pass");
        runCheckPass("first materialization pass");
        const firstOutputs = new Map(
          generatedPaths.map((projectPath) => [projectPath, snapshotPath(rootDir, projectPath)]),
        );

        runWritePass("second materialization pass");
        const secondOutputs = new Map(
          generatedPaths.map((projectPath) => [projectPath, snapshotPath(rootDir, projectPath)]),
        );
        const nonIdempotentPaths = diffSnapshots(firstOutputs, secondOutputs);
        if (nonIdempotentPaths.length > 0) {
          throw new Error(
            `Registered materialization is not idempotent; second pass changed: ${nonIdempotentPaths.join(", ")}`,
          );
        }
        runCheckPass("second materialization pass");
        state = "materialized";
        return Object.freeze({
          registryId: registry.registryId,
          activeMaterializerIds: activeMaterializers.map((record) => record.id),
          generatedPaths: [...generatedPaths],
        });
      } catch (error) {
        try {
          rollbackInternal();
        } catch (rollbackError) {
          throw new Error(`${error.message} Rollback also failed: ${rollbackError.message}`);
        }
        throw error;
      }
    },
    rollback() {
      rollbackInternal();
    },
    release() {
      if (state !== "materialized") {
        throw new Error(`Materialization session cannot release from state ${state}.`);
      }
      state = "released";
    },
    getState() {
      return state;
    },
  });
}

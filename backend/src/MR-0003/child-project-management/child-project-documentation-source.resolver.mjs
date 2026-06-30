import fs from "node:fs";
import path from "node:path";
import { parseChildProjectRecord } from "./child-project-management.contract.mjs";

/**
 * @file Child project documentation source resolver for registered projects.
 *
 * @implementsRequirement MR-0003REQ-0066
 * @implementsRequirement MR-0003REQ-0067
 * @derivedFromDecision MR-0003/ADR-0014
 * @macroRequirement MR-0003
 *
 * This module derives a child Project Documentation Explorer source descriptor
 * from the child project record registered in the platform operational store.
 * It treats the registered child project id, repository location and Project
 * Model profile as the only authority for source selection. Missing, unsupported
 * or invalid records resolve to explicit non-available states instead of
 * substituting the platform Project Documentation Explorer snapshot or endpoint.
 *
 * Side effects: this module may check whether a local Project Model directory
 * exists when `requireExistingProjectModel` is true. It does not read governed
 * Markdown/YAML body content, start servers, mutate repositories, register child
 * projects, clone Git repositories, expose HTTP routes, write SQLite state,
 * perform authorization decisions or fall back to platform documentation.
 */

const defaultRepositoryRoot = process.cwd();
const defaultProjectModelRoot = "docs/reference/project-model";

/**
 * Converts path separators to stable forward slashes for API-safe diagnostics.
 *
 * @param {string|null|undefined} value - Path-like value.
 * @returns {string|null} Normalized path text, or null when empty.
 */
function normalizePathText(value) {
  const text = String(value ?? "").trim();
  return text ? text.replaceAll("\\", "/") : null;
}

/**
 * Returns true when a candidate path is equal to or inside a parent directory.
 *
 * @param {string} parentPath - Canonical parent path.
 * @param {string} candidatePath - Canonical candidate path.
 * @returns {boolean} True when the candidate is contained by the parent.
 */
function isInsideOrEqual(parentPath, candidatePath) {
  const relative = path.relative(parentPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/**
 * Checks whether a path exists and is a directory.
 *
 * @param {string} candidatePath - Candidate directory path.
 * @returns {boolean} True when the candidate is an existing directory.
 */
function isExistingDirectory(candidatePath) {
  try {
    return fs.statSync(candidatePath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Builds a stable non-available source descriptor.
 *
 * @param {object} input - Descriptor fields.
 * @param {string} input.status - Non-available status.
 * @param {string} input.message - User-facing diagnostic message.
 * @param {string|null} [input.sourceType] - Source type when known.
 * @param {string|null} [input.repositoryLocalPath] - Registered local path.
 * @param {string|null} [input.projectModelRoot] - Registered Project Model root.
 * @returns {Record<string, unknown>} Documentation source descriptor.
 */
function createUnavailableDescriptor({ status, message, sourceType = null, repositoryLocalPath = null, projectModelRoot = null }) {
  return Object.freeze({
    status,
    source_type: sourceType,
    repository_local_path: normalizePathText(repositoryLocalPath),
    project_model_root: normalizePathText(projectModelRoot),
    message,
  });
}

/**
 * Resolves a child Project Documentation Explorer source from a registered child project record.
 *
 * @param {object} [input] - Resolver input.
 * @param {Record<string, unknown>} [input.childProject] - Registered child project record.
 * @param {string} [input.repositoryRoot] - Platform repository root for resolving relative child workspace paths.
 * @param {boolean} [input.requireExistingProjectModel] - Whether the Project Model directory must exist now.
 * @returns {Readonly<Record<string, unknown>>} Documentation source descriptor.
 */
export function resolveChildProjectDocumentationSource({
  childProject,
  repositoryRoot = defaultRepositoryRoot,
  requireExistingProjectModel = true,
} = {}) {
  if (!childProject || typeof childProject !== "object") {
    return createUnavailableDescriptor({
      status: "unconfigured",
      message: "No registered child project record was provided for documentation source resolution.",
    });
  }

  const parsed = parseChildProjectRecord(childProject);
  const projectModelRoot = parsed.project_model.root || defaultProjectModelRoot;

  if (parsed.repository.kind !== "local") {
    return createUnavailableDescriptor({
      status: "unsupported",
      sourceType: null,
      projectModelRoot,
      message: "Registered Git child projects require a checked-out workspace before documentation can be resolved.",
    });
  }

  if (!parsed.repository.local_path) {
    return createUnavailableDescriptor({
      status: "unconfigured",
      sourceType: "filesystem",
      projectModelRoot,
      message: "The registered local child project does not include a local repository path.",
    });
  }

  if (path.isAbsolute(projectModelRoot)) {
    return createUnavailableDescriptor({
      status: "unavailable",
      sourceType: "filesystem",
      repositoryLocalPath: parsed.repository.local_path,
      projectModelRoot,
      message: "The child project Project Model root must be repository-relative.",
    });
  }

  const resolvedRepositoryRoot = path.resolve(String(repositoryRoot || defaultRepositoryRoot));
  const resolvedChildRoot = path.resolve(resolvedRepositoryRoot, parsed.repository.local_path);
  const resolvedProjectModelPath = path.resolve(resolvedChildRoot, projectModelRoot);

  if (!isInsideOrEqual(resolvedChildRoot, resolvedProjectModelPath)) {
    return createUnavailableDescriptor({
      status: "unavailable",
      sourceType: "filesystem",
      repositoryLocalPath: parsed.repository.local_path,
      projectModelRoot,
      message: "The child project Project Model root resolves outside the registered child workspace.",
    });
  }

  if (requireExistingProjectModel && !isExistingDirectory(resolvedProjectModelPath)) {
    return createUnavailableDescriptor({
      status: "unavailable",
      sourceType: "filesystem",
      repositoryLocalPath: parsed.repository.local_path,
      projectModelRoot,
      message: "The registered child project Project Model directory is not available.",
    });
  }

  return Object.freeze({
    status: "available",
    source_type: "filesystem",
    repository_local_path: normalizePathText(parsed.repository.local_path),
    project_model_root: normalizePathText(projectModelRoot),
    message: "The registered child project Project Model can be served from its local workspace.",
  });
}

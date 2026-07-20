import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { canonicalGovernedEntityResolverRegistryPath } from "../../MR-0001/lib/governed-entity-references.mjs";
import { createGovernedMarkdownAssistanceService } from "../../MR-0002/lib/governed-markdown-assistance.mjs";
import {
  engineOwnedProjectPaths,
  targetOwnedProjectPaths,
} from "../run-target-project-check.mjs";

/**
 * @file Target Project governed Markdown assistance composition root.
 *
 * @implementsRequirement MR-0004ADR-0001REQ-0005
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * Combines engine-owned document profiles, controlled values and resolver rules
 * with target-owned governed documents and Base Analysis records inside an
 * isolated temporary overlay. The shared MR-0002 assistance core performs all
 * diagnostics, completion, hover and quick-fix analysis. No authored source is
 * modified and no canonical ThreatForge BAE is visible unless it is present in
 * the selected Target Project inventory.
 */

const extraEngineOwnedProjectPaths = Object.freeze([
  canonicalGovernedEntityResolverRegistryPath,
]);

function requireDirectory(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  const absolute = path.resolve(text);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory()) {
    throw new Error(`${label} must be an existing directory: ${absolute}`);
  }
  return fs.realpathSync(absolute);
}

function isInside(parentPath, candidatePath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function safeProjectPath(rootDir, projectPath) {
  const normalized = String(projectPath ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//u, "")
    .trim();
  if (
    !normalized ||
    path.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`Unsafe Target Project assistance path: ${normalized || "<empty>"}`);
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Unsafe Target Project assistance path: ${normalized}`);
  }
  const absolute = path.resolve(rootDir, ...segments);
  if (!isInside(rootDir, absolute)) {
    throw new Error(`Target Project assistance path escapes its root: ${normalized}`);
  }
  return { normalized, absolute };
}

function copyPathWithoutLinks(sourceRoot, destinationRoot, projectPath) {
  const source = safeProjectPath(sourceRoot, projectPath);
  const destination = safeProjectPath(destinationRoot, projectPath);
  if (!fs.existsSync(source.absolute)) {
    throw new Error(`Required Target Project assistance source is missing: ${source.normalized}`);
  }

  function copyEntry(sourcePath, destinationPath, displayPath) {
    const stat = fs.lstatSync(sourcePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`Symbolic links are not allowed in assistance input: ${displayPath}`);
    }
    if (stat.isDirectory()) {
      fs.mkdirSync(destinationPath, { recursive: true });
      const entries = fs
        .readdirSync(sourcePath, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name, "en"));
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
      throw new Error(`Unsupported assistance input type: ${displayPath}`);
    }
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
  }

  copyEntry(source.absolute, destination.absolute, source.normalized);
}

function buildAssistanceOverlay(engineRoot, targetRoot) {
  const overlayRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "threatforge-target-markdown-assistance-"),
  );
  try {
    const enginePaths = [
      ...new Set([...engineOwnedProjectPaths, ...extraEngineOwnedProjectPaths]),
    ];
    for (const projectPath of enginePaths) {
      copyPathWithoutLinks(engineRoot, overlayRoot, projectPath);
    }
    for (const projectPath of targetOwnedProjectPaths) {
      copyPathWithoutLinks(targetRoot, overlayRoot, projectPath);
    }
    return overlayRoot;
  } catch (error) {
    fs.rmSync(overlayRoot, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Creates one reusable target-local governed Markdown assistance service.
 *
 * @param {{engineRoot: string, targetRoot: string}} input
 * @returns {{analyze: (input: {projectPath: string, text: string, position?: {line: number, character: number}}) => Record<string, unknown>, dispose: () => void}}
 */
export function createTargetProjectMarkdownAssistanceService(input = {}) {
  const engineRoot = requireDirectory(input.engineRoot, "engineRoot");
  const targetRoot = requireDirectory(input.targetRoot, "targetRoot");
  if (engineRoot === targetRoot) {
    throw new Error("engineRoot and targetRoot must be distinct.");
  }
  const overlayRoot = buildAssistanceOverlay(engineRoot, targetRoot);
  let disposed = false;
  try {
    const core = createGovernedMarkdownAssistanceService({ rootDir: overlayRoot });
    return {
      analyze(request) {
        if (disposed) throw new Error("Target Project Markdown assistance service is disposed.");
        return core.analyze(request);
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        fs.rmSync(overlayRoot, { recursive: true, force: true });
      },
    };
  } catch (error) {
    fs.rmSync(overlayRoot, { recursive: true, force: true });
    throw error;
  }
}

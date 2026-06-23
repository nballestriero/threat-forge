#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Deterministic package-lock registry and integrity guard.
 *
 * @implementsRequirement MR-0000REQ-0019
 * @derivedFromDecision MR-0000/ADR-0006
 * @macroRequirement MR-0000
 *
 * This checker validates the root npm lockfile before governed repository
 * operations can complete. It fails closed when package-lock.json is missing or
 * malformed, when package tarball URLs point outside the allowed npm registry,
 * when integrity metadata is malformed, or when a package entry without
 * resolved/integrity metadata is not part of the current explicit omission
 * allowlist.
 *
 * Side effects: reads package.json and package-lock.json; writes diagnostics to
 * stdout/stderr; exits non-zero when dependency registry or integrity metadata
 * is unsafe or unexpected. It does not install dependencies, rewrite lockfiles,
 * contact npm registries, audit vulnerabilities, scan licenses, or replace a
 * future broader software-supply-chain policy gate.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = process.env.TF_LOCKFILE_INTEGRITY_ROOT
  ? path.resolve(process.env.TF_LOCKFILE_INTEGRITY_ROOT)
  : path.resolve(scriptDir, "..", "..", "..");
const packageJsonPath = path.join(rootDir, "package.json");
const packageLockPath = path.join(rootDir, "package-lock.json");
const allowedRegistryPrefixes = ["https://registry.npmjs.org/"];
const knownMetadataOmissions = new Set([
  "node_modules/ajv",
  "node_modules/fast-deep-equal",
  "node_modules/fast-uri",
  "node_modules/json-schema-traverse",
  "node_modules/require-from-string",
  "node_modules/zod",
]);
const integrityPattern = /^sha(?:1|256|384|512)-[A-Za-z0-9+/=]+(?:\s+sha(?:1|256|384|512)-[A-Za-z0-9+/=]+)*$/u;
const errors = [];

/**
 * Reads and parses a JSON file with deterministic diagnostics.
 *
 * @param {string} filePath - Absolute path of the JSON file.
 * @param {string} label - Human-readable file label.
 * @returns {Record<string, unknown>|null} Parsed JSON object, or null when invalid.
 */
function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`${label} is missing: ${path.relative(rootDir, filePath).replaceAll("\\", "/")}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, ""));
  } catch (error) {
    errors.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

/**
 * Returns a stable package entry label for diagnostics.
 *
 * @param {string} packagePath - package-lock packages key.
 * @returns {string} Stable diagnostic label.
 */
function describePackage(packagePath) {
  return packagePath === "" ? "root package" : packagePath;
}

/**
 * Validates that root package dependency declarations match the lockfile root package entry.
 *
 * @param {Record<string, unknown>} packageJson - Parsed package.json.
 * @param {Record<string, unknown>} lockfile - Parsed package-lock.json.
 * @returns {void}
 */
function validateRootDependencyAgreement(packageJson, lockfile) {
  const packageDeps = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
    ...(packageJson.optionalDependencies ?? {}),
  };
  const lockRoot = lockfile.packages?.[""];
  if (!lockRoot || typeof lockRoot !== "object" || Array.isArray(lockRoot)) {
    errors.push("package-lock.json must define packages[\"\"] root metadata.");
    return;
  }
  const lockDeps = {
    ...(lockRoot.dependencies ?? {}),
    ...(lockRoot.devDependencies ?? {}),
    ...(lockRoot.optionalDependencies ?? {}),
  };

  for (const [name, versionRange] of Object.entries(packageDeps)) {
    if (lockDeps[name] !== versionRange) {
      errors.push(
        `package-lock.json root metadata for ${name} must match package.json value ${JSON.stringify(
          versionRange,
        )}; found ${JSON.stringify(lockDeps[name])}.`,
      );
    }
  }

  for (const name of Object.keys(lockDeps)) {
    if (!(name in packageDeps)) {
      errors.push(`package-lock.json root metadata contains dependency not declared in package.json: ${name}`);
    }
  }
}

/**
 * Validates registry URL and integrity metadata for every package-lock package entry.
 *
 * @param {Record<string, unknown>} lockfile - Parsed package-lock.json.
 * @returns {{ checkedPackages: number, allowedOmissions: number }} Summary counts.
 */
function validatePackageEntries(lockfile) {
  const packages = lockfile.packages;
  if (!packages || typeof packages !== "object" || Array.isArray(packages)) {
    errors.push("package-lock.json must define a packages object.");
    return { checkedPackages: 0, allowedOmissions: 0 };
  }

  let checkedPackages = 0;
  let allowedOmissions = 0;

  for (const [packagePath, metadata] of Object.entries(packages)) {
    checkedPackages += 1;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      errors.push(`package-lock package entry must be an object: ${describePackage(packagePath)}`);
      continue;
    }

    if (packagePath === "" || metadata.link === true) continue;

    const resolved = metadata.resolved;
    const integrity = metadata.integrity;
    const hasResolved = typeof resolved === "string" && resolved.trim().length > 0;
    const hasIntegrity = typeof integrity === "string" && integrity.trim().length > 0;

    if (!hasResolved || !hasIntegrity) {
      if (knownMetadataOmissions.has(packagePath)) {
        allowedOmissions += 1;
        continue;
      }
      errors.push(
        `package-lock package entry must define resolved and integrity metadata unless explicitly allowed: ${packagePath}`,
      );
      continue;
    }

    if (!allowedRegistryPrefixes.some((prefix) => resolved.startsWith(prefix))) {
      errors.push(`package-lock resolved URL uses a non-allowed registry for ${packagePath}: ${resolved}`);
    }

    if (!integrityPattern.test(integrity)) {
      errors.push(`package-lock integrity metadata is malformed for ${packagePath}: ${integrity}`);
    }
  }

  return { checkedPackages, allowedOmissions };
}

/**
 * Validates the root package-lock structure and metadata policy.
 *
 * @returns {{ checkedPackages: number, allowedOmissions: number }} Summary counts.
 */
function validateLockfile() {
  const packageJson = readJson(packageJsonPath, "package.json");
  const lockfile = readJson(packageLockPath, "package-lock.json");
  if (!packageJson || !lockfile) return { checkedPackages: 0, allowedOmissions: 0 };

  if (lockfile.lockfileVersion !== 3) {
    errors.push(`package-lock.json lockfileVersion must be 3; found ${JSON.stringify(lockfile.lockfileVersion)}.`);
  }

  if (lockfile.name !== packageJson.name) {
    errors.push(
      `package-lock.json name must match package.json name ${JSON.stringify(packageJson.name)}; found ${JSON.stringify(
        lockfile.name,
      )}.`,
    );
  }

  validateRootDependencyAgreement(packageJson, lockfile);
  return validatePackageEntries(lockfile);
}

const { checkedPackages, allowedOmissions } = validateLockfile();

if (errors.length > 0) {
  console.error("Lockfile registry and integrity check failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Lockfile registry and integrity check passed.");
console.log("Implemented requirement: MR-0000REQ-0019");
console.log(`Lockfile: ${path.relative(rootDir, packageLockPath).replaceAll("\\", "/")}`);
console.log(`Allowed registry prefixes: ${allowedRegistryPrefixes.join(", ")}`);
console.log(`Package entries checked: ${checkedPackages}`);
console.log(`Allowed resolved/integrity omissions: ${allowedOmissions}`);

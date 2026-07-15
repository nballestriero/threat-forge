#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

/**
 * @file ThreatForge local handoff archive generator.
 *
 * @implementsRequirement MR-0001ADR-0006REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0006REQ-0001GOV-0002
 * @derivedFromDecision MR-0001/ADR-0006
 * @macroRequirement MR-0001
 *
 * Produces a local handoff archive from the repository working copy. The
 * archive captures Git state, recent history, ThreatForge check output,
 * governed registry snapshots, continuation instructions and a git-tracked
 * project source snapshot using the canonical product label "ThreatForge".
 *
 * Side effects: in normal mode, writes a handoff directory and `.zip` archive
 * under `artifacts/handoff`; in dry-run mode, prints the planned output without
 * writing files. Exits non-zero when required commands fail or when the working
 * tree is dirty unless `--allow-dirty` is supplied.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = path.resolve(scriptDir, "..", "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const allowDirty = args.has("--allow-dirty");
const showHelp = args.has("--help") || args.has("-h");

if (showHelp) {
  console.log(`Usage:
  node tools/MR-0001/create-handoff-archive.mjs [--dry-run] [--allow-dirty]

Output:
  artifacts/handoff/threat-forge-handoff-<HEAD>/
  artifacts/handoff/threat-forge-handoff-<HEAD>.zip

Main contents:
  README_HANDOFF.md
  continuation-prompt.md
  command-reference.md
  logs/
  registries/
  project-snapshot/`);
  process.exit(0);
}

/**
 * Runs a command in the repository root.
 *
 * @param {string} command - Executable command.
 * @param {string[]} commandArgs - Command arguments.
 * @returns {{status: number, stdout: string, stderr: string}} Command result.
 */
function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { cwd: rootDir, encoding: "utf8", shell: false });
  return {
    status: typeof result.status === "number" ? result.status : 1,
    stdout: String(result.stdout ?? ""),
    stderr: String(result.stderr ?? ""),
  };
}

/**
 * Runs a required command and returns stdout.
 *
 * @param {string} command - Executable command.
 * @param {string[]} commandArgs - Command arguments.
 * @returns {string} Command stdout.
 */
function runRequired(command, commandArgs) {
  const result = run(command, commandArgs);
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${commandArgs.join(" ")}\n${result.stdout}${result.stderr}`);
  }
  return result.stdout;
}

/**
 * Normalizes text for archive files.
 *
 * @param {string} text - Text to normalize.
 * @returns {string} LF-normalized text with trailing newline.
 */
function normalizeText(text) {
  return `${String(text ?? "").replace(/\r\n/gu, "\n").replace(/\r/gu, "\n").replace(/\n*$/u, "")}\n`;
}

/**
 * Writes a UTF-8 file and creates parent directories.
 *
 * @param {string} filePath - Destination file.
 * @param {string} text - Text content.
 * @returns {void}
 */
function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, normalizeText(text), "utf8");
}

/**
 * Reads a repository-relative file if present.
 *
 * @param {string} projectPath - Repository-relative path.
 * @returns {string} File text or empty text.
 */
function readProjectFile(projectPath) {
  const absolutePath = path.join(rootDir, projectPath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
}

const snapshotExcludedPrefixes = ["old/"];

/**
 * Returns whether a tracked path belongs to the canonical ThreatForge project snapshot.
 *
 * @param {string} projectPath - Repository-relative tracked path.
 * @returns {boolean} True when the path is part of the operational project.
 */
function isCanonicalSnapshotPath(projectPath) {
  return !snapshotExcludedPrefixes.some((prefix) => projectPath.startsWith(prefix));
}

/**
 * Returns tracked canonical project file paths from Git.
 *
 * @returns {string[]} Repository-relative tracked paths excluding legacy reference material.
 */
function listGitTrackedFiles() {
  return runRequired("git", ["ls-files"])
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(isCanonicalSnapshotPath)
    .sort();
}

/**
 * Copies git-tracked project files into the handoff snapshot directory.
 *
 * @param {string} snapshotDir - Destination snapshot directory.
 * @param {string[]} trackedFiles - Repository-relative tracked paths.
 * @returns {{includedFiles: number, includedBytes: number, skippedFiles: string[]}} Snapshot result.
 */
function copyProjectSnapshot(snapshotDir, trackedFiles) {
  let includedFiles = 0;
  let includedBytes = 0;
  const skippedFiles = [];
  const rootWithSeparator = `${rootDir}${path.sep}`;

  for (const projectPath of trackedFiles) {
    const sourcePath = path.resolve(rootDir, projectPath);
    if (sourcePath !== rootDir && !sourcePath.startsWith(rootWithSeparator)) {
      skippedFiles.push(projectPath);
      continue;
    }

    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      skippedFiles.push(projectPath);
      continue;
    }

    const destinationPath = path.join(snapshotDir, projectPath);
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
    includedFiles += 1;
    includedBytes += fs.statSync(sourcePath).size;
  }

  return { includedFiles, includedBytes, skippedFiles };
}

/**
 * Creates a CRC32 table.
 *
 * @returns {number[]} CRC32 table.
 */
function buildCrc32Table() {
  const table = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
}

const crc32Table = buildCrc32Table();

/**
 * Computes CRC32 for ZIP entries.
 *
 * @param {Buffer} buffer - Entry content.
 * @returns {number} CRC32.
 */
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Converts a date to DOS ZIP fields.
 *
 * @param {Date} date - Date.
 * @returns {{time: number, date: number}} DOS fields.
 */
function toDosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/**
 * Creates a deterministic ZIP archive from a directory.
 *
 * @param {string} sourceDir - Directory to archive.
 * @param {string} zipPath - ZIP path.
 * @returns {void}
 */
function createZip(sourceDir, zipPath) {
  const localParts = [];
  const centralParts = [];
  const files = [];
  let offset = 0;
  const fixedDate = new Date(2026, 0, 1, 0, 0, 0);

  function walk(directoryPath) {
    for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
      const absolutePath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) walk(absolutePath);
      if (entry.isFile()) files.push(absolutePath);
    }
  }

  walk(sourceDir);
  files.sort();

  for (const absolutePath of files) {
    const relativeName = path.relative(sourceDir, absolutePath).replaceAll(path.sep, "/");
    const nameBuffer = Buffer.from(relativeName, "utf8");
    const content = fs.readFileSync(absolutePath);
    const compressed = zlib.deflateRawSync(content);
    const checksum = crc32(content);
    const dos = toDosDateTime(fixedDate);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(dos.time, 10);
    localHeader.writeUInt16LE(dos.date, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(dos.time, 12);
    centralHeader.writeUInt16LE(dos.date, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + compressed.length;
  }

  const localDirectory = Buffer.concat(localParts);
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localDirectory.length, 16);
  end.writeUInt16LE(0, 20);

  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  fs.writeFileSync(zipPath, Buffer.concat([localDirectory, centralDirectory, end]));
}

/**
 * Checks if status output contains uncommitted changes.
 *
 * @param {string} statusText - `git status --short --branch` output.
 * @returns {boolean} Whether changes are present.
 */
function hasWorkingTreeChanges(statusText) {
  return normalizeText(statusText).split("\n").some((line) => line.trim() && !line.startsWith("## "));
}

const shortHead = runRequired("git", ["rev-parse", "--short", "HEAD"]).trim();
const branch = runRequired("git", ["branch", "--show-current"]).trim();
const statusText = runRequired("git", ["status", "--short", "--branch"]);
const trackedFiles = listGitTrackedFiles();
const outputRoot = path.join(rootDir, "artifacts", "handoff");
const archiveName = `threat-forge-handoff-${shortHead}`;
const archiveDir = path.join(outputRoot, archiveName);
const zipPath = path.join(outputRoot, `${archiveName}.zip`);

if (dryRun) {
  console.log("ThreatForge local handoff archive planned.");
  console.log(`Repository root: ${rootDir}`);
  console.log(`Branch: ${branch}`);
  console.log(`HEAD: ${shortHead}`);
  console.log(`Tracked project files planned for snapshot: ${trackedFiles.length}`);
  console.log(`Directory: ${path.relative(rootDir, archiveDir).replaceAll(path.sep, "/")}`);
  console.log(`Archive: ${path.relative(rootDir, zipPath).replaceAll(path.sep, "/")}`);
  console.log("Project snapshot: project-snapshot/");
  console.log("Mode: dry-run");
  process.exit(0);
}

if (hasWorkingTreeChanges(statusText) && !allowDirty) {
  console.error("ThreatForge local handoff archive generation refused.");
  console.error("Working tree is not clean. Commit/push first, or use --allow-dirty intentionally.");
  console.error(statusText);
  process.exit(1);
}

const logText = runRequired("git", ["log", "--oneline", "-10"]);
const repoCheck = run("node", ["tools/repo-check.mjs"]);
const repoCheckText = `${repoCheck.stdout}${repoCheck.stderr}`;
if (repoCheck.status !== 0) {
  console.error("ThreatForge local handoff archive generation refused.");
  console.error("ThreatForge repo-check failed.");
  console.error(repoCheckText);
  process.exit(repoCheck.status);
}

fs.rmSync(archiveDir, { recursive: true, force: true });
fs.rmSync(zipPath, { force: true });
fs.mkdirSync(archiveDir, { recursive: true });

const registryPaths = [
  "docs/reference/project-model/registers/checks/local-governance-checks.registry.yml",
  "docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml",
  "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml",
  "docs/reference/project-model/registers/implementation/implementation-trace.registry.yml",
  "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml",
];

const snapshotDir = path.join(archiveDir, "project-snapshot");
const snapshot = copyProjectSnapshot(snapshotDir, trackedFiles);

writeText(path.join(archiveDir, "README_HANDOFF.md"), `# ThreatForge handoff archive

## Repository state

- Branch: ${branch}
- HEAD: ${shortHead}
- Working tree: ${hasWorkingTreeChanges(statusText) ? "dirty" : "clean"}

## Purpose

This archive was produced locally by the governed ThreatForge handoff generator.

It contains Git state, recent history, ThreatForge check output, registry snapshots, a continuation prompt and a git-tracked canonical project source snapshot for LLM continuity.

The legacy reference archive under \`old/\` is intentionally excluded from the project snapshot.

## Canonical project snapshot

The tracked operational project snapshot is under:

\`\`\`text
project-snapshot/
\`\`\`

It is based on \`git ls-files\` filtered to the canonical ThreatForge project. It excludes \`.git\`, \`old/\`, ignored dependencies, generated artifacts, build output and untracked local files.

Snapshot files: ${snapshot.includedFiles}
Snapshot bytes: ${snapshot.includedBytes}

## Continue

Use \`continuation-prompt.md\` as the initial context for the next ChatGPT conversation. Upload or unpack this archive and point the next LLM to \`project-snapshot/\`.
`);

writeText(path.join(archiveDir, "continuation-prompt.md"), `# Continue ThreatForge work

We are working on repository \`https://github.com/nballestriero/threat-forge.git\`, branch \`${branch}\`.

Current HEAD at handoff creation: \`${shortHead}\`.

Language: Italian.
Delivery: concise, micro-steps, ZIP drop-ins, commands to apply, verify and commit.
Governance rule: no code or tool without a governing requirement, ADR or GOV and implementation trace.

Canonical layout:
- the operational ThreatForge project lives at repository root;
- \`old/\` contains reference-only legacy material;
- legacy material is not an operational source and is excluded from handoff snapshots.

This handoff archive includes the canonical tracked source snapshot under:

\`\`\`text
project-snapshot/
\`\`\`

First checks to run after restoring or cloning the repository:

\`\`\`powershell
git status --short --branch
node .\\tools\\repo-check.mjs
\`\`\`
`);

writeText(path.join(archiveDir, "command-reference.md"), `# ThreatForge command reference

\`\`\`powershell
git status --short --branch
node .\\tools\\repo-check.mjs
node .\\tools\\MR-0001\\check-implementation-trace-registry.mjs
node .\\tools\\MR-0001\\check-documentation-field-values.mjs
node .\\tools\\MR-0001\\check-macro-requirement-model.mjs
node .\\tools\\MR-0001\\check-decision-model.mjs
node .\\tools\\MR-0001\\check-functional-requirement-model.mjs
node .\\tools\\MR-0001\\check-governance-requirement-model.mjs
git status --short --branch
\`\`\`

Generate a new local handoff archive after publication:

\`\`\`powershell
node .\\tools\\MR-0001\\create-handoff-archive.mjs
\`\`\`
`);

writeText(path.join(archiveDir, "logs", "git-status.txt"), statusText);
writeText(path.join(archiveDir, "logs", "git-log.txt"), logText);
writeText(path.join(archiveDir, "logs", "threatforge-check.txt"), repoCheckText);

writeText(path.join(archiveDir, "project-snapshot-manifest.json"), JSON.stringify({
  product: "ThreatForge",
  head: shortHead,
  branch,
  snapshot_path: "project-snapshot/",
  inclusion_rule: "git ls-files excluding old/**",
  included_files: snapshot.includedFiles,
  included_bytes: snapshot.includedBytes,
  skipped_files: snapshot.skippedFiles,
  excluded_by_design: [
    ".git/",
    "old/ (legacy reference archive)",
    "node_modules/",
    "ignored files",
    "untracked local files",
    "generated artifacts not tracked by Git",
    "build output not tracked by Git"
  ],
}, null, 2));

for (const projectPath of registryPaths) {
  const content = readProjectFile(projectPath);
  if (content) writeText(path.join(archiveDir, "registries", path.basename(projectPath)), content);
}

createZip(archiveDir, zipPath);

console.log("ThreatForge local handoff archive created.");
console.log(`Directory: ${path.relative(rootDir, archiveDir).replaceAll(path.sep, "/")}`);
console.log(`Archive: ${path.relative(rootDir, zipPath).replaceAll(path.sep, "/")}`);
console.log(`HEAD: ${shortHead}`);
console.log(`Branch: ${branch}`);
console.log(`Project snapshot files: ${snapshot.includedFiles}`);

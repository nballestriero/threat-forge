#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGovernedImplementationPlan } from "./plan-governed-implementation.mjs";

/**
 * @file ThreatForge governed implementation scaffold creator.
 *
 * @implementsRequirement MR-0002ADR-0003REQ-0001
 * @implementsRequirement MR-0002ADR-0003REQ-0001GOV-0001
 * @derivedFromDecision MR-0002/ADR-0003
 * @macroRequirement MR-0002
 *
 * Creates one traceable source scaffold and the matching implementation trace
 * record as one rollback-protected operation. Existing files and registered
 * paths are never overwritten.
 *
 * Side effects: creates one governed source file and updates the implementation
 * trace registry after explicit confirmation; writes to stdout/stderr; exits
 * non-zero on validation or transactional failure.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = process.env.TF_IMPLEMENTATION_SCAFFOLDER_ROOT
  ? path.resolve(process.env.TF_IMPLEMENTATION_SCAFFOLDER_ROOT)
  : path.resolve(scriptDir, "..", "..");
const implementationRegistryProjectPath =
  process.env.TF_IMPLEMENTATION_SCAFFOLDER_REGISTRY_PATH ??
  "docs/reference/project-model/registers/implementation/implementation-trace.registry.yml";
const materializableArtifactTypes = new Set(["tool", "source-module", "test"]);

/**
 * Parses supported command-line arguments.
 *
 * @param {string[]} argv - Arguments after executable and script path.
 * @returns {{requirement: string, artifactType: string, title: string, projectPath: string, confirmation: string}}
 *   Parsed values.
 */
function parseArguments(argv) {
  const values = {
    requirement: "",
    artifactType: "",
    title: "",
    projectPath: "",
    confirmation: "",
  };
  const options = new Map([
    ["--requirement", "requirement"],
    ["--artifact-type", "artifactType"],
    ["--title", "title"],
    ["--path", "projectPath"],
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
  if (values.confirmation !== "create") {
    throw new Error('Explicit creation confirmation is required: --confirm create');
  }
  return values;
}

/**
 * Escapes a string for use inside a regular expression.
 *
 * @param {string} value - Literal text.
 * @returns {string} Escaped pattern text.
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Derives the next deterministic implementation artifact id.
 *
 * @param {string} registryText - Current implementation registry text.
 * @param {string} requirementId - Linked governed Requirement id.
 * @returns {string} Next artifact id.
 */
function deriveArtifactId(registryText, requirementId) {
  const pattern = new RegExp(
    `^\\s*-\\s+id:\\s*${escapeRegExp(requirementId)}IMPL-(\\d{4})\\s*$`,
    "gmu",
  );
  let highest = 0;
  for (const match of registryText.matchAll(pattern)) {
    highest = Math.max(highest, Number.parseInt(match[1], 10));
  }
  return `${requirementId}IMPL-${String(highest + 1).padStart(4, "0")}`;
}

/**
 * Detects whether a project path is already present in trace records.
 *
 * @param {string} registryText - Current implementation registry text.
 * @param {string} projectPath - Validated repository-relative path.
 * @returns {boolean} True when a path field already references the path.
 */
function isPathRegistered(registryText, projectPath) {
  const escaped = escapeRegExp(projectPath);
  return new RegExp(
    `^\\s*(?:planned_path|scaffolded_path|implemented_path):\\s*["']?${escaped}["']?\\s*$`,
    "mu",
  ).test(registryText);
}

/**
 * Builds a minimal source scaffold.
 *
 * @param {Record<string, string>} plan - Governed implementation plan.
 * @returns {string} Source file content.
 */
function renderScaffold(plan) {
  const shebang = plan.artifactType === "tool" ? "#!/usr/bin/env node\n" : "";
  return `${shebang}/**\n` +
    ` * @file ${plan.title}.\n` +
    " *\n" +
    ` * @implementsRequirement ${plan.requirement}\n` +
    ` * @derivedFromDecision ${plan.decisionReference}\n` +
    ` * @macroRequirement ${plan.macroRequirementId}\n` +
    " * @implementationStatus scaffolded\n" +
    " *\n" +
    ` * TODO: implement the governed ${plan.artifactType} behavior.\n` +
    " */\n";
}

/**
 * Appends one scaffolded implementation trace record.
 *
 * @param {string} registryText - Current registry content.
 * @param {Record<string, string>} plan - Governed implementation plan.
 * @param {string} artifactId - Deterministic artifact id.
 * @returns {string} Updated registry content.
 */
function appendRegistryRecord(registryText, plan, artifactId) {
  const record = [
    "",
    `  - id: ${artifactId}`,
    `    title: ${JSON.stringify(plan.title)}`,
    `    artifact_type: ${plan.traceType}`,
    "    status: scaffolded",
    "    linked_requirement_ids:",
    `      - ${plan.requirement}`,
    `    scaffolded_path: ${plan.projectPath}`,
    `    reason: ${JSON.stringify(`Create a governed source scaffold for ${plan.requirement}; implementation remains incomplete until explicitly promoted.`)}`,
    `    verification_command: ${plan.verificationCommand}`,
    "",
  ].join("\n");
  return `${registryText.replace(/\s*$/u, "")}\n${record}`;
}

/**
 * Removes an empty directory chain up to, but excluding, the repository root.
 *
 * @param {string} startDir - First directory to inspect.
 * @returns {void}
 */
function removeEmptyDirectories(startDir) {
  let current = startDir;
  while (current.startsWith(`${rootDir}${path.sep}`) && current !== rootDir) {
    try {
      fs.rmdirSync(current);
    } catch {
      break;
    }
    current = path.dirname(current);
  }
}

/**
 * Applies source and registry changes with rollback.
 *
 * @param {string} targetPath - Absolute source path.
 * @param {string} sourceText - Scaffold content.
 * @param {string} registryPath - Absolute registry path.
 * @param {string} registryText - Updated registry content.
 * @returns {void}
 */
function applyTransaction(targetPath, sourceText, registryPath, registryText) {
  const targetDir = path.dirname(targetPath);
  const transactionId = `${process.pid}-${Date.now()}`;
  const sourceTempPath = `${targetPath}.tf-${transactionId}.tmp`;
  const registryTempPath = `${registryPath}.tf-${transactionId}.tmp`;
  const registryBackupPath = `${registryPath}.tf-${transactionId}.bak`;
  let registryMoved = false;
  let registryInstalled = false;
  let sourceInstalled = false;

  fs.mkdirSync(targetDir, { recursive: true });

  try {
    fs.writeFileSync(sourceTempPath, sourceText, { encoding: "utf8", flag: "wx" });
    fs.writeFileSync(registryTempPath, registryText, { encoding: "utf8", flag: "wx" });
    fs.renameSync(registryPath, registryBackupPath);
    registryMoved = true;
    fs.renameSync(registryTempPath, registryPath);
    registryInstalled = true;
    fs.renameSync(sourceTempPath, targetPath);
    sourceInstalled = true;
    fs.unlinkSync(registryBackupPath);
  } catch (error) {
    try {
      if (sourceInstalled && fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      if (fs.existsSync(sourceTempPath)) fs.unlinkSync(sourceTempPath);
      if (registryInstalled && fs.existsSync(registryPath)) fs.unlinkSync(registryPath);
      if (registryMoved && fs.existsSync(registryBackupPath)) {
        fs.renameSync(registryBackupPath, registryPath);
      }
      if (fs.existsSync(registryTempPath)) fs.unlinkSync(registryTempPath);
      removeEmptyDirectories(targetDir);
    } catch (rollbackError) {
      throw new Error(`${error.message}; rollback also failed: ${rollbackError.message}`);
    }
    throw error;
  }
}

/**
 * Creates one governed implementation scaffold.
 *
 * @param {{requirement: string, artifactType: string, title: string, projectPath: string, confirmation: string}} options
 *   Parsed command options.
 * @returns {void}
 */
function run(options) {
  if (!materializableArtifactTypes.has(options.artifactType)) {
    throw new Error(
      `Artifact type cannot be materialized as a source scaffold: ${options.artifactType}. Supported values: ${[...materializableArtifactTypes].join(", ")}`,
    );
  }

  const plan = createGovernedImplementationPlan(
    {
      requirement: options.requirement,
      artifactType: options.artifactType,
      title: options.title,
      projectPath: options.projectPath,
      dryRun: true,
    },
    rootDir,
  );

  const targetPath = path.join(rootDir, ...plan.projectPath.split("/"));
  if (fs.existsSync(targetPath)) {
    throw new Error(`Refusing to overwrite existing path: ${plan.projectPath}`);
  }

  const registryPath = path.join(rootDir, implementationRegistryProjectPath);
  if (!fs.existsSync(registryPath)) {
    throw new Error(`Implementation trace registry is missing: ${implementationRegistryProjectPath}`);
  }

  const registryText = fs.readFileSync(registryPath, "utf8").replace(/^\uFEFF/u, "");
  if (isPathRegistered(registryText, plan.projectPath)) {
    throw new Error(`Implementation path is already registered: ${plan.projectPath}`);
  }

  const artifactId = deriveArtifactId(registryText, plan.requirement);
  const sourceText = renderScaffold(plan);
  const updatedRegistryText = appendRegistryRecord(registryText, plan, artifactId);
  applyTransaction(targetPath, sourceText, registryPath, updatedRegistryText);

  console.log("Governed implementation scaffold created.");
  console.log(`Artifact id: ${artifactId}`);
  console.log(`Requirement: ${plan.requirement}`);
  console.log(`Status: scaffolded`);
  console.log(`Path: ${plan.projectPath}`);
  console.log(`Implementation trace registry: ${implementationRegistryProjectPath}`);
  console.log(`Verification command: ${plan.verificationCommand}`);
}

try {
  run(parseArguments(process.argv.slice(2)));
} catch (error) {
  console.error(`Governed implementation scaffold creation failed: ${error.message}`);
  process.exitCode = 1;
}

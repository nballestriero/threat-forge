import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runTargetProjectCheck } from "../run-target-project-check.mjs";

/**
 * @file Target Project generation application service.
 *
 * @implementsRequirement MR-0004ADR-0001REQ-0001
 * @implementsRequirement MR-0004ADR-0001REQ-0002
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * Creates one document-only governed Target Project at an explicit destination.
 * The service validates all inputs before writing, materializes the complete
 * template in an isolated staging directory, proves it with the canonical
 * Target Project checker and only then publishes it atomically at the selected
 * destination. It does not modify canonical ThreatForge project-model sources.
 */

const modulePath = fileURLToPath(import.meta.url);
const defaultEngineRoot = path.resolve(path.dirname(modulePath), "..", "..", "..");
const canonicalProjectModelProjectPath = "docs/reference/project-model";
const projectIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

export const targetProjectGeneratorRequirementIds = Object.freeze([
  "MR-0004ADR-0001REQ-0001",
  "MR-0004ADR-0001REQ-0002",
]);

export const generatedTargetProjectFilePaths = Object.freeze([
  "docs/reference/project-model/body/decisions/MR-0001/ADR-0001_body.md",
  "docs/reference/project-model/body/macro-requirements/MR-0001_body.md",
  "docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001_body.md",
  "docs/reference/project-model/registers/base-analysis/base-analysis-elements.registry.yml",
  "docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml",
  "docs/reference/project-model/registers/macro-requirements.registry.yml",
  "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml",
  "README.md",
]);

function normalizeProjectPath(value) {
  return String(value ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//u, "")
    .trim();
}

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function quoteYaml(value) {
  return JSON.stringify(String(value));
}

function requiredSingleLine(value, label) {
  const text = String(value ?? "").trim();
  if (!text || /[\r\n]/u.test(text)) {
    throw new Error(`${label} must be non-empty single-line text.`);
  }
  return text;
}

function validateCalendarDate(value) {
  const text = requiredSingleLine(value, "decisionDate");
  if (!calendarDatePattern.test(text)) {
    throw new Error("decisionDate must use YYYY-MM-DD.");
  }
  const parsed = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    throw new Error("decisionDate must be a real calendar date.");
  }
  return text;
}

function isPathInside(parentPath, candidatePath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertExistingPathChainHasNoLinks(absolutePath) {
  const parsed = path.parse(path.resolve(absolutePath));
  const segments = path.resolve(absolutePath).slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) break;
    if (fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`Destination path cannot contain symbolic links: ${current}`);
    }
  }
}

function assertDirectoryWritable(directoryPath, label) {
  try {
    fs.accessSync(directoryPath, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    throw new Error(`${label} must be readable and writable: ${directoryPath}`);
  }
}

function validateDestination({ destinationRoot, engineRoot }) {
  const destinationText = String(destinationRoot ?? "").trim();
  if (!destinationText) throw new Error("An explicit destinationRoot is required.");

  const resolvedEngineRoot = path.resolve(engineRoot);
  const resolvedDestination = path.resolve(destinationText);
  if (!fs.existsSync(resolvedEngineRoot) || !fs.statSync(resolvedEngineRoot).isDirectory()) {
    throw new Error("The ThreatForge engine root is unavailable.");
  }
  assertExistingPathChainHasNoLinks(resolvedDestination);

  if (resolvedDestination === resolvedEngineRoot) {
    throw new Error("The destination root must be distinct from the ThreatForge engine root.");
  }
  const canonicalProjectModelRoot = path.join(
    resolvedEngineRoot,
    ...canonicalProjectModelProjectPath.split("/"),
  );
  if (isPathInside(canonicalProjectModelRoot, resolvedDestination)) {
    throw new Error("The destination root cannot be inside canonical ThreatForge project-model paths.");
  }

  const parent = path.dirname(resolvedDestination);
  if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) {
    throw new Error(`The destination parent directory must already exist: ${parent}`);
  }
  assertDirectoryWritable(parent, "The destination parent directory");

  let existingEmptyDirectory = false;
  if (fs.existsSync(resolvedDestination)) {
    const stat = fs.lstatSync(resolvedDestination);
    if (!stat.isDirectory()) {
      throw new Error("The destination root must be absent or an empty directory.");
    }
    assertDirectoryWritable(resolvedDestination, "The destination directory");
    if (fs.readdirSync(resolvedDestination).length > 0) {
      throw new Error("The destination root must be empty before Target Project creation.");
    }
    existingEmptyDirectory = true;
  }

  return {
    engineRoot: fs.realpathSync(resolvedEngineRoot),
    destinationRoot: resolvedDestination,
    destinationParent: parent,
    existingEmptyDirectory,
  };
}

function buildSourceRecordYaml(indent, source) {
  const spaces = " ".repeat(indent);
  return [
    `${spaces}kind: governed_document`,
    `${spaces}source_id: ${source.id}`,
    `${spaces}source_path: ${source.path}`,
  ].join("\n");
}

function buildBaeElementYaml(element, source) {
  return [
    `  - id: ${element.id}`,
    `    title: ${quoteYaml(element.title)}`,
    `    base_type: ${element.baseType}`,
    `    meaning: ${quoteYaml(element.meaning)}`,
    "    lifecycle_state: active",
    "    origin:",
    buildSourceRecordYaml(6, source),
    "    authoritative_source:",
    buildSourceRecordYaml(6, source),
    "    source_history:",
    "      - sequence: 1",
    "        outcome: continuity_confirmed",
    "        previous_source:",
    buildSourceRecordYaml(10, source),
    "        next_source:",
    buildSourceRecordYaml(10, source),
    "        review_evidence_id: MR-0001/ADR-0001",
    "    provenance:",
    "      - relation: origin",
    "        source_kind: governed_document",
    `        source_id: ${source.id}`,
    `        source_path: ${source.path}`,
  ].join("\n");
}

function buildTemplate(options) {
  const macroTitle = `${options.projectTitle} system description`;
  const decisionTitle = "Use a document-only demonstration model";
  const requirementTitle = "Describe the demonstration interaction";
  const macroBodyPath =
    "docs/reference/project-model/body/macro-requirements/MR-0001_body.md";
  const source = { id: "MR-0001", path: macroBodyPath };
  const elements = [
    {
      id: "BAE-0001",
      title: "Demonstration user",
      baseType: "actor",
      meaning: "Person who initiates the documented demonstration interaction.",
    },
    {
      id: "BAE-0002",
      title: "Demonstration service",
      baseType: "component",
      meaning: "Logical service that receives and processes the documented request.",
    },
    {
      id: "BAE-0003",
      title: "Demonstration record",
      baseType: "data_resource",
      meaning: "Information resource handled by the demonstration service.",
    },
    {
      id: "BAE-0004",
      title: "Service trust boundary",
      baseType: "boundary",
      meaning: "Separation between the demonstration user and the governed service domain.",
    },
    {
      id: "BAE-0005",
      title: "Demonstration request flow",
      baseType: "data_flow",
      meaning: "Directed request carrying demonstration record information from the user to the service.",
    },
  ];

  const files = new Map();
  files.set(
    "README.md",
    [
      `# ${options.projectTitle}`,
      "",
      "This document-only Target Project was generated by ThreatForge.",
      "",
      "It contains governed Macro-requirement, Decision, Functional Requirement and Base Analysis records and can be validated before executable application code exists.",
      "",
      "Run the Target Project check from the ThreatForge engine:",
      "",
      "```powershell",
      "node .\\tools\\MR-0004\\run-target-project-check.mjs --target-root <this-project-path>",
      "```",
      "",
    ].join("\n"),
  );

  files.set(
    "docs/reference/project-model/registers/macro-requirements.registry.yml",
    [
      "schema_version: 1",
      "registry_id: governed-documentation-macro-requirements-registry",
      `project: ${options.projectId}`,
      "",
      "macro_requirements:",
      "  - id: MR-0001",
      `    title: ${quoteYaml(macroTitle)}`,
      "    status: draft",
      "    macro_requirement_type: functional",
      `    body_path: ${macroBodyPath}`,
      "    decisions_registry_path: docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml",
      "    requirements_registry_path: docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml",
      "",
    ].join("\n"),
  );

  files.set(
    "docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml",
    [
      "schema_version: 1",
      "registry_id: MR-0001-decisions-registry",
      "macro_requirement_id: MR-0001",
      "",
      "decisions:",
      "  - id: ADR-0001",
      `    title: ${quoteYaml(decisionTitle)}`,
      "    status: draft",
      "    decision_type: structural",
      `    author: ${quoteYaml(options.author)}`,
      `    date: ${options.decisionDate}`,
      "    macro_requirement_id: MR-0001",
      "    body_path: docs/reference/project-model/body/decisions/MR-0001/ADR-0001_body.md",
      "",
    ].join("\n"),
  );

  files.set(
    "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml",
    [
      "schema_version: 1",
      "registry_id: MR-0001-requirements-registry",
      "macro_requirement_id: MR-0001",
      "",
      "requirements:",
      "  - id: MR-0001ADR-0001REQ-0001",
      `    title: ${quoteYaml(requirementTitle)}`,
      "    status: draft",
      "    requirement_type: functional",
      "    macro_requirement_id: MR-0001",
      "    decision_id: ADR-0001",
      "    body_path: docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001_body.md",
      "",
    ].join("\n"),
  );

  files.set(
    macroBodyPath,
    [
      `# MR-0001 — ${macroTitle}`,
      "",
      "## Intent",
      "",
      `Describe the documentary system boundary and initial interaction for ${options.projectTitle} before implementation artifacts exist.`,
      "",
      "## Context",
      "",
      "The initial project model represents a small service interaction entirely through governed documentation so that methodology-neutral analysis can begin before application development.",
      "",
      "## Macro obligation",
      "",
      "- The demonstration project must preserve governed documentary sources for analysis.",
      "",
      "## Scope",
      "",
      ...elements.map((element) => `- Includes: [${element.id}] ${element.title}`),
      "- Excludes: Executable application source code",
      "",
    ].join("\n"),
  );

  files.set(
    "docs/reference/project-model/body/decisions/MR-0001/ADR-0001_body.md",
    [
      `# ADR-0001 — ${decisionTitle}`,
      "",
      "## Status",
      "",
      "Draft",
      "",
      "## Context",
      "",
      "The first project state needs to support analysis while remaining independent from a backend, frontend, database or executable service implementation.",
      "",
      "## Decision",
      "",
      "Adopt governed documentation as the authoritative initial system representation and describe the demonstration interaction through stable project-local identities.",
      "",
      "## Consequences",
      "",
      "- Benefit: The project can be analyzed before executable implementation exists.",
      "- Constraint: Governed project-local documentation remains authoritative for the initial model.",
      "",
    ].join("\n"),
  );

  files.set(
    "docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001_body.md",
    [
      `# MR-0001ADR-0001REQ-0001 — ${requirementTitle}`,
      "",
      "## Intent",
      "",
      "Represent one small service interaction as governed documentary evidence suitable for Base Analysis.",
      "",
      "## Functional obligation",
      "",
      "- The project documentation must describe one interaction from the demonstration user to the demonstration service.",
      "",
      "## Scope",
      "",
      "- Includes: Demonstration interaction description",
      "- Excludes: Executable source code",
      "",
      "## Acceptance",
      "",
      "- The requirement is accepted when the actor, component, data resource, boundary and data flow are represented in the project-local Base Analysis inventory.",
      "",
    ].join("\n"),
  );

  files.set(
    "docs/reference/project-model/registers/base-analysis/base-analysis-elements.registry.yml",
    [
      "schema_version: 1",
      "registry_id: base-analysis-elements-registry",
      "macro_requirement_id: MR-0003",
      "",
      "elements:",
      ...elements.flatMap((element, index) => [
        buildBaeElementYaml(element, source),
        ...(index < elements.length - 1 ? [""] : []),
      ]),
      "",
      "relations:",
      "  - id: BAE-REL-0001",
      "    source_bae_id: BAE-0005",
      "    predicate: has_source_endpoint",
      "    target_bae_id: BAE-0001",
      "  - id: BAE-REL-0002",
      "    source_bae_id: BAE-0005",
      "    predicate: has_target_endpoint",
      "    target_bae_id: BAE-0002",
      "  - id: BAE-REL-0003",
      "    source_bae_id: BAE-0005",
      "    predicate: crosses_boundary",
      "    target_bae_id: BAE-0004",
      "",
    ].join("\n"),
  );

  return new Map(
    [...files.entries()]
      .map(([projectPath, content]) => [normalizeProjectPath(projectPath), content])
      .sort(([left], [right]) => compare(left, right)),
  );
}

function writeTemplate(stagingRoot, files) {
  for (const [projectPath, content] of files.entries()) {
    if (!generatedTargetProjectFilePaths.includes(projectPath)) {
      throw new Error(`Unexpected generated Target Project path: ${projectPath}`);
    }
    const absolutePath = path.resolve(stagingRoot, ...projectPath.split("/"));
    if (!isPathInside(stagingRoot, absolutePath) || absolutePath === stagingRoot) {
      throw new Error(`Generated Target Project path escapes staging root: ${projectPath}`);
    }
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  }
}

function summarizeValidationFailure(report) {
  const messages = (Array.isArray(report?.diagnostics) ? report.diagnostics : [])
    .filter((item) => item?.severity === "error")
    .slice(0, 3)
    .map((item) => `${item.check_id}/${item.rule_id}: ${item.message}`);
  return messages.join(" | ") || "canonical Target Project validation failed";
}

/**
 * Creates one governed document-only Target Project.
 *
 * @param {{
 *   destinationRoot: string,
 *   engineRoot?: string,
 *   projectId: string,
 *   projectTitle: string,
 *   author: string,
 *   decisionDate: string,
 *   validateTarget?: (options: {engineRoot: string, targetRoot: string, writeReports: boolean}) => Record<string, unknown>
 * }} options - Explicit creation request.
 * @returns {{destination_root: string, project_id: string, files: string[], validation: Record<string, unknown>}}
 */
export function createTargetProject(options = {}) {
  const engineRoot = path.resolve(options.engineRoot ?? defaultEngineRoot);
  const projectId = requiredSingleLine(options.projectId, "projectId");
  if (!projectIdPattern.test(projectId)) {
    throw new Error("projectId must match lowercase kebab-case: [a-z0-9]+(-[a-z0-9]+)*.");
  }
  const projectTitle = requiredSingleLine(options.projectTitle, "projectTitle");
  const author = requiredSingleLine(options.author, "author");
  const decisionDate = validateCalendarDate(options.decisionDate);
  const destination = validateDestination({
    destinationRoot: options.destinationRoot,
    engineRoot,
  });
  const files = buildTemplate({ projectId, projectTitle, author, decisionDate });
  const actualPaths = [...files.keys()];
  if (JSON.stringify(actualPaths) !== JSON.stringify([...generatedTargetProjectFilePaths])) {
    throw new Error("Generated Target Project file set differs from the canonical template.");
  }

  const validator =
    typeof options.validateTarget === "function" ? options.validateTarget : runTargetProjectCheck;
  const prefix = `.threatforge-target-project-${path.basename(destination.destinationRoot)}-`;
  const stagingRoot = fs.mkdtempSync(path.join(destination.destinationParent, prefix));
  let published = false;
  try {
    writeTemplate(stagingRoot, files);
    const validation = validator({
      engineRoot: destination.engineRoot,
      targetRoot: stagingRoot,
      writeReports: false,
    });
    if (validation?.status !== "pass") {
      throw new Error(
        `Generated Target Project failed canonical validation: ${summarizeValidationFailure(validation)}`,
      );
    }

    if (destination.existingEmptyDirectory) {
      if (fs.readdirSync(destination.destinationRoot).length > 0) {
        throw new Error("The destination root changed during Target Project creation.");
      }
      fs.rmdirSync(destination.destinationRoot);
    }
    fs.renameSync(stagingRoot, destination.destinationRoot);
    published = true;
    return {
      destination_root: destination.destinationRoot,
      project_id: projectId,
      files: actualPaths,
      validation,
    };
  } finally {
    if (!published) fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

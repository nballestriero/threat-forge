#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Child project governance gate planner.
 *
 * @implementsRequirement MR-0003REQ-0059
 * @implementsRequirement MR-0003REQ-0060
 * @derivedFromDecision MR-0003/ADR-0011
 * @macroRequirement MR-0003
 *
 * This tool reads the governed child-project governance registry family and
 * expands a selected governance profile into a deterministic gate plan. The
 * plan explains each gate's applicability class, planned execution status,
 * reason, capability evidence and validation surfaces before any real gate
 * executor exists.
 *
 * Side effects: reads repository registry files and writes a human-readable or
 * JSON plan to stdout. When an output directory is provided, it also writes
 * deterministic JSON plan artifacts for the selected profile or self-test
 * profile set under the requested generated-artifact directory. In self-test
 * mode it plans representative platform and demo profiles and verifies
 * deterministic planning invariants. It does not execute child-project gates,
 * mutate child projects, write SQLite state, implement Base Analysis/STRIDE/
 * STRIDE-AI, or replace the future gate executor/orchestrator.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRootDir = path.resolve(scriptDir, "..", "..", "..");
const rootDir = process.env.TF_CHILD_PROJECT_GOVERNANCE_PLAN_ROOT
  ? path.resolve(process.env.TF_CHILD_PROJECT_GOVERNANCE_PLAN_ROOT)
  : defaultRootDir;
const registryDir = path.join(
  rootDir,
  "docs",
  "reference",
  "project-model",
  "registers",
  "child-project-governance",
);

const registryFiles = {
  applicabilityClasses: "gate-applicability-classes.registry.yml",
  capabilities: "governance-capabilities.registry.yml",
  gates: "governance-gates.registry.yml",
  profiles: "governance-profiles.registry.yml",
  validationSurfaces: "validation-surfaces.registry.yml",
};

const successCapabilityStates = new Set(["declared", "detected"]);
const knownCapabilityStates = new Set(["declared", "detected", "not_present", "unknown", "unsupported"]);
const statusOrder = ["planned", "pass", "fail", "warning", "not_applicable", "unsupported"];

/**
 * Converts path separators to stable forward slashes.
 *
 * @param {string|null|undefined} value - Path-like value.
 * @returns {string} Normalized path text.
 */
function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

/**
 * Reads UTF-8 text from a file while stripping a possible byte-order mark.
 *
 * @param {string} filePath - Absolute path.
 * @returns {string} File contents.
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "");
}

/**
 * Removes surrounding single or double quotes from a simple YAML scalar.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string} Unquoted scalar text when quotes are present.
 */
function stripQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Parses a simple scalar value used by governed registry YAML files.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string|number|boolean|null|Array<object>|object} Parsed scalar value.
 */
function parseScalar(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "[]") return [];
  if (trimmed === "{}") return {};
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+$/u.test(trimmed)) return Number.parseInt(trimmed, 10);
  return stripQuotes(trimmed);
}

/**
 * Counts leading space indentation for a YAML line.
 *
 * @param {string} line - YAML line.
 * @returns {number} Number of leading spaces.
 */
function countIndent(line) {
  return line.match(/^ */u)?.[0].length ?? 0;
}

/**
 * Parses the restricted YAML subset used by current governed registries.
 *
 * @param {string} text - YAML text.
 * @returns {Record<string, unknown>} Parsed YAML object.
 */
function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = String(text ?? "").replace(/^\uFEFF/u, "").replace(/\r\n/gu, "\n").split("\n");

  function getParent(indent) {
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    return stack[stack.length - 1].value;
  }

  function nextMeaningfulLine(startIndex) {
    for (let index = startIndex + 1; index < lines.length; index += 1) {
      if (lines[index].trim() && !lines[index].trimStart().startsWith("#")) return lines[index];
    }
    return "";
  }

  function readBlock(startIndex, baseIndent) {
    const block = [];
    let index = startIndex;
    while (index + 1 < lines.length) {
      const next = lines[index + 1];
      const nextIndent = countIndent(next);
      if (next.trim() && nextIndent <= baseIndent) break;
      index += 1;
      const sliceAt = Math.min(baseIndent + 2, next.length);
      block.push(next.slice(sliceAt));
    }
    return { text: block.join("\n").replace(/\n$/u, ""), nextIndex: index };
  }

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;

    const indent = countIndent(raw);
    const trimmed = raw.trim();

    if (trimmed.startsWith("- ")) {
      const parent = getParent(indent);
      if (!Array.isArray(parent)) continue;

      const itemText = trimmed.slice(2).trim();
      const colonIndex = itemText.indexOf(":");

      if (colonIndex === -1) {
        parent.push(parseScalar(itemText));
        continue;
      }

      const key = itemText.slice(0, colonIndex).trim();
      const rawValue = itemText.slice(colonIndex + 1).trim();
      const obj = {};
      parent.push(obj);

      if (rawValue === "|") {
        const block = readBlock(index, indent);
        obj[key] = block.text;
        index = block.nextIndex;
      } else if (rawValue === "") {
        const nextLine = nextMeaningfulLine(index);
        const value = nextLine.trim().startsWith("- ") ? [] : {};
        obj[key] = value;
        stack.push({ indent, value: obj });
        stack.push({ indent: indent + 2, value });
      } else {
        obj[key] = parseScalar(rawValue);
        stack.push({ indent, value: obj });
      }
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();
    const parent = getParent(indent);

    if (rawValue === "|") {
      const block = readBlock(index, indent);
      parent[key] = block.text;
      index = block.nextIndex;
    } else if (rawValue === "") {
      const nextLine = nextMeaningfulLine(index);
      const value = nextLine.trim().startsWith("- ") ? [] : {};
      parent[key] = value;
      stack.push({ indent, value });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  }

  return root;
}

/**
 * Reads and parses a registry YAML file.
 *
 * @param {string} fileName - Registry file name.
 * @returns {Record<string, unknown>} Parsed registry.
 */
function readRegistry(fileName) {
  const filePath = path.join(registryDir, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing registry file: ${normalizeProjectPath(path.relative(rootDir, filePath))}`);
  }
  return parseYaml(readText(filePath));
}

/**
 * Returns an array value or an empty array for invalid input.
 *
 * @param {unknown} value - Candidate array.
 * @returns {unknown[]} Array value or empty array.
 */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Builds an id-indexed map from registry records.
 *
 * @param {unknown[]} records - Records with id fields.
 * @param {string} label - Human-readable registry label.
 * @returns {Map<string, Record<string, unknown>>} Record map.
 */
function indexById(records, label) {
  const indexed = new Map();
  for (const record of records) {
    const id = String(record?.id ?? "").trim();
    if (!id) throw new Error(`${label} contains a record without id.`);
    if (indexed.has(id)) throw new Error(`${label} contains duplicate id: ${id}`);
    indexed.set(id, record);
  }
  return indexed;
}

/**
 * Loads the registry family needed for planning.
 *
 * @returns {{ capabilities: Map<string, Record<string, unknown>>, gates: Map<string, Record<string, unknown>>, profiles: Map<string, Record<string, unknown>>, surfaces: Map<string, Record<string, unknown>>, statuses: Set<string> }} Registry family.
 */
function loadRegistryFamily() {
  const applicabilityRegistry = readRegistry(registryFiles.applicabilityClasses);
  const capabilityRegistry = readRegistry(registryFiles.capabilities);
  const gateRegistry = readRegistry(registryFiles.gates);
  const profileRegistry = readRegistry(registryFiles.profiles);
  const validationSurfaceRegistry = readRegistry(registryFiles.validationSurfaces);

  return {
    capabilities: indexById(asArray(capabilityRegistry.governance_capabilities), "governance_capabilities"),
    gates: indexById(asArray(gateRegistry.governance_gates), "governance_gates"),
    profiles: indexById(asArray(profileRegistry.governance_profiles), "governance_profiles"),
    surfaces: indexById(asArray(validationSurfaceRegistry.validation_surfaces), "validation_surfaces"),
    statuses: new Set(asArray(applicabilityRegistry.execution_result_statuses).map((record) => String(record?.id ?? ""))),
  };
}

/**
 * Parses command line arguments.
 *
 * @param {string[]} rawArgs - Raw process arguments.
 * @returns {{ profileId: string|null, targetScope: string|null, capabilityOverrides: Map<string, string>, json: boolean, selfTest: boolean, outputDir: string|null }} Parsed options.
 */
function parseArgs(rawArgs) {
  const options = {
    profileId: null,
    targetScope: null,
    capabilityOverrides: new Map(),
    json: false,
    selfTest: false,
    outputDir: null,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--self-test") {
      options.selfTest = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--profile") {
      options.profileId = rawArgs[index + 1] ?? null;
      index += 1;
    } else if (arg === "--target-scope") {
      options.targetScope = rawArgs[index + 1] ?? null;
      index += 1;
    } else if (arg === "--output-dir") {
      options.outputDir = rawArgs[index + 1] ?? null;
      index += 1;
    } else if (arg === "--capability") {
      const rawCapability = String(rawArgs[index + 1] ?? "");
      const [capabilityId, state = "declared"] = rawCapability.split("=");
      options.capabilityOverrides.set(capabilityId, state);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

/**
 * Builds capability states from profile required/optional capabilities and CLI overrides.
 *
 * @param {Record<string, unknown>} profile - Governance profile.
 * @param {Map<string, string>} capabilityOverrides - CLI capability state overrides.
 * @returns {Map<string, string>} Capability state map.
 */
function buildCapabilityStates(profile, capabilityOverrides) {
  const states = new Map();
  for (const capabilityId of asArray(profile.required_capabilities)) states.set(String(capabilityId), "declared");
  for (const capabilityId of asArray(profile.optional_capabilities)) {
    if (!states.has(String(capabilityId))) states.set(String(capabilityId), "unknown");
  }
  for (const [capabilityId, state] of capabilityOverrides.entries()) {
    if (!knownCapabilityStates.has(state)) throw new Error(`Unknown capability state for ${capabilityId}: ${state}`);
    states.set(capabilityId, state);
  }
  return states;
}

/**
 * Returns true when all required capabilities are declared or detected.
 *
 * @param {string[]} requiredCapabilities - Gate required capability ids.
 * @param {Map<string, string>} capabilityStates - Capability state map.
 * @returns {boolean} True when every required capability is present.
 */
function requiredCapabilitiesPresent(requiredCapabilities, capabilityStates) {
  return requiredCapabilities.every((capabilityId) => successCapabilityStates.has(capabilityStates.get(capabilityId) ?? "not_present"));
}

/**
 * Returns gate evidence text for capability states and validation surfaces.
 *
 * @param {string[]} requiredCapabilities - Required capability ids.
 * @param {Map<string, string>} capabilityStates - Capability states.
 * @param {string[]} validationSurfaces - Validation surface ids.
 * @returns {string[]} Evidence entries.
 */
function buildEvidence(requiredCapabilities, capabilityStates, validationSurfaces) {
  const evidence = [];
  for (const capabilityId of requiredCapabilities) {
    evidence.push(`capability.${capabilityId} = ${capabilityStates.get(capabilityId) ?? "not_present"}`);
  }
  for (const surfaceId of validationSurfaces) evidence.push(`validation_surface.${surfaceId} exists`);
  return evidence;
}

/**
 * Plans a single gate for a target profile.
 *
 * @param {Record<string, unknown>} gate - Governance gate record.
 * @param {string} targetScope - Target scope.
 * @param {Map<string, string>} capabilityStates - Capability states.
 * @returns {{ id: string, label: string, applicability_class: string, status: string, severity: string, reason: string, required_capabilities: string[], validation_surfaces: string[], evidence: string[] }} Planned gate entry.
 */
function planGate(gate, targetScope, capabilityStates) {
  const gateId = String(gate.id ?? "");
  const applicabilityClass = String(gate.applicability_class ?? "");
  const targetScopes = asArray(gate.target_scopes).map(String);
  const requiredCapabilities = asArray(gate.required_capabilities).map(String);
  const validationSurfaces = asArray(gate.validation_surfaces).map(String);
  const evidence = buildEvidence(requiredCapabilities, capabilityStates, validationSurfaces);

  if (!targetScopes.includes(targetScope)) {
    return {
      id: gateId,
      label: String(gate.label ?? gateId),
      applicability_class: applicabilityClass,
      status: "not_applicable",
      severity: "info",
      reason: `target_scope ${targetScope} is not listed for gate ${gateId}`,
      required_capabilities: requiredCapabilities,
      validation_surfaces: validationSurfaces,
      evidence: [`target_scope.${targetScope} not in gate target_scopes`, ...evidence],
    };
  }

  const unsupportedCapabilities = requiredCapabilities.filter(
    (capabilityId) => (capabilityStates.get(capabilityId) ?? "not_present") === "unsupported",
  );
  if (unsupportedCapabilities.length > 0) {
    return {
      id: gateId,
      label: String(gate.label ?? gateId),
      applicability_class: applicabilityClass,
      status: "unsupported",
      severity: String(gate.unsupported_behavior) === "fail" ? "error" : "warning",
      reason: `required capability is unsupported: ${unsupportedCapabilities.join(", ")}`,
      required_capabilities: requiredCapabilities,
      validation_surfaces: validationSurfaces,
      evidence,
    };
  }

  if (["always_required", "platform_self_required", "child_project_required", "demo_required", "platform_only"].includes(applicabilityClass)) {
    return {
      id: gateId,
      label: String(gate.label ?? gateId),
      applicability_class: applicabilityClass,
      status: "planned",
      severity: "info",
      reason: `${applicabilityClass} gate selected by profile for ${targetScope}`,
      required_capabilities: requiredCapabilities,
      validation_surfaces: validationSurfaces,
      evidence,
    };
  }

  if (applicabilityClass === "planned_until_method_available") {
    return {
      id: gateId,
      label: String(gate.label ?? gateId),
      applicability_class: applicabilityClass,
      status: "planned",
      severity: "info",
      reason: "gate is applicable by governance model and awaits later method/tool implementation",
      required_capabilities: requiredCapabilities,
      validation_surfaces: validationSurfaces,
      evidence,
    };
  }

  if (["capability_required", "declared_if_present"].includes(applicabilityClass)) {
    if (requiredCapabilitiesPresent(requiredCapabilities, capabilityStates)) {
      return {
        id: gateId,
        label: String(gate.label ?? gateId),
        applicability_class: applicabilityClass,
        status: "planned",
        severity: "info",
        reason: `required capabilities are present for ${targetScope}`,
        required_capabilities: requiredCapabilities,
        validation_surfaces: validationSurfaces,
        evidence,
      };
    }

    const missingCapabilities = requiredCapabilities.filter(
      (capabilityId) => !successCapabilityStates.has(capabilityStates.get(capabilityId) ?? "not_present"),
    );
    return {
      id: gateId,
      label: String(gate.label ?? gateId),
      applicability_class: applicabilityClass,
      status: "not_applicable",
      severity: "info",
      reason: `required capabilities are not present: ${missingCapabilities.join(", ")}`,
      required_capabilities: requiredCapabilities,
      validation_surfaces: validationSurfaces,
      evidence,
    };
  }

  return {
    id: gateId,
    label: String(gate.label ?? gateId),
    applicability_class: applicabilityClass,
    status: "warning",
    severity: "warning",
    reason: `unhandled applicability class: ${applicabilityClass}`,
    required_capabilities: requiredCapabilities,
    validation_surfaces: validationSurfaces,
    evidence,
  };
}

/**
 * Plans all gates selected by a profile.
 *
 * @param {{ profiles: Map<string, Record<string, unknown>>, gates: Map<string, Record<string, unknown>>, surfaces: Map<string, Record<string, unknown>>, statuses: Set<string> }} registries - Registry family.
 * @param {string} profileId - Governance profile id.
 * @param {string|null} requestedTargetScope - Optional requested target scope.
 * @param {Map<string, string>} capabilityOverrides - Capability overrides.
 * @returns {{ profile: string, target_scope: string, result: string, summary: Record<string, number>, gates_evaluated: number, capability_states: Record<string, string>, gates: ReturnType<typeof planGate>[] }} Gate plan.
 */
function planProfile(registries, profileId, requestedTargetScope, capabilityOverrides) {
  const profile = registries.profiles.get(profileId);
  if (!profile) throw new Error(`Unknown governance profile: ${profileId}`);
  const targetScope = requestedTargetScope ?? String(profile.target_scope ?? "");
  if (!targetScope) throw new Error(`governance_profile ${profileId} does not define a target_scope.`);

  const capabilityStates = buildCapabilityStates(profile, capabilityOverrides);
  const plannedGates = [];
  for (const gateId of asArray(profile.gates).map(String)) {
    const gate = registries.gates.get(gateId);
    if (!gate) throw new Error(`governance_profile ${profileId} references unknown gate: ${gateId}`);
    plannedGates.push(planGate(gate, targetScope, capabilityStates));
  }

  const summary = Object.fromEntries(statusOrder.map((status) => [status, 0]));
  for (const plannedGate of plannedGates) {
    summary[plannedGate.status] = (summary[plannedGate.status] ?? 0) + 1;
  }

  const result = plannedGates.some((gate) => gate.status === "fail" || gate.severity === "error") ? "fail" : "pass";
  return {
    profile: profileId,
    target_scope: targetScope,
    result,
    summary,
    gates_evaluated: plannedGates.length,
    capability_states: Object.fromEntries([...capabilityStates.entries()].sort(([left], [right]) => left.localeCompare(right))),
    gates: plannedGates,
  };
}

/**
 * Prints a human-readable gate plan.
 *
 * @param {ReturnType<typeof planProfile>} plan - Gate plan.
 * @returns {void}
 */
function printPlan(plan) {
  console.log("Child project governance gate plan passed.");
  console.log("Implemented requirement: MR-0003REQ-0059");
  console.log("Implemented requirement: MR-0003REQ-0060");
  console.log(`Registry directory: ${normalizeProjectPath(path.relative(rootDir, registryDir))}`);
  console.log(`Profile: ${plan.profile}`);
  console.log(`Target scope: ${plan.target_scope}`);
  console.log(`Gates evaluated: ${plan.gates_evaluated}`);
  console.log(`Planned: ${plan.summary.planned}`);
  console.log(`Not applicable: ${plan.summary.not_applicable}`);
  console.log(`Unsupported: ${plan.summary.unsupported}`);
  console.log(`Warnings: ${plan.summary.warning}`);
  console.log(`Failures: ${plan.summary.fail}`);
  console.log("\nGate plan:");
  for (const gate of plan.gates) {
    console.log(`- ${gate.id}: ${gate.status} (${gate.applicability_class})`);
    console.log(`  reason: ${gate.reason}`);
    if (gate.required_capabilities.length > 0) {
      console.log(`  capabilities: ${gate.required_capabilities.join(", ")}`);
    }
    console.log(`  validation_surfaces: ${gate.validation_surfaces.join(", ")}`);
  }
}

/**
 * Builds a stable file name for a generated gate plan artifact.
 *
 * @param {ReturnType<typeof planProfile>} plan - Gate plan.
 * @returns {string} File name.
 */
function buildPlanArtifactFileName(plan) {
  return `${plan.profile}.${plan.target_scope}.plan.json`;
}

/**
 * Wraps a gate plan in a governed generated-artifact envelope.
 *
 * @param {ReturnType<typeof planProfile>} plan - Gate plan.
 * @returns {Record<string, unknown>} Artifact payload.
 */
function buildPlanArtifact(plan) {
  return {
    schema_version: 1,
    artifact_type: "child_project_governance_gate_plan",
    generated_by: "backend/tools/MR-0003/plan-child-project-governance-gates.mjs",
    implements_requirements: ["MR-0003REQ-0059", "MR-0003REQ-0060"],
    registry_directory: normalizeProjectPath(path.relative(rootDir, registryDir)),
    plan,
  };
}

/**
 * Writes a gate plan artifact to the requested output directory.
 *
 * @param {ReturnType<typeof planProfile>} plan - Gate plan.
 * @param {string|null} outputDir - Output directory, absolute or repository-relative.
 * @returns {string|null} Written artifact path relative to repository root, or null.
 */
function writePlanArtifact(plan, outputDir) {
  if (!outputDir) return null;
  const resolvedOutputDir = path.isAbsolute(outputDir) ? outputDir : path.join(rootDir, outputDir);
  fs.mkdirSync(resolvedOutputDir, { recursive: true });
  const artifactPath = path.join(resolvedOutputDir, buildPlanArtifactFileName(plan));
  fs.writeFileSync(artifactPath, `${JSON.stringify(buildPlanArtifact(plan), null, 2)}\n`, "utf8");
  return normalizeProjectPath(path.relative(rootDir, artifactPath));
}

/**
 * Runs deterministic self-test planning scenarios.
 *
 * @param {{ profiles: Map<string, Record<string, unknown>>, gates: Map<string, Record<string, unknown>>, surfaces: Map<string, Record<string, unknown>>, statuses: Set<string> }} registries - Registry family.
 * @param {string|null} outputDir - Optional output directory for generated plan artifacts.
 * @returns {void}
 */
function runSelfTest(registries, outputDir) {
  const platformPlan = planProfile(registries, "platform_self_governance", "platform_self", new Map());
  const demoPlan = planProfile(registries, "demo_child_project_governance", "demo_child_project", new Map());
  const documentationOnlyWithNoCode = planProfile(
    registries,
    "documentation_only_child_project",
    "child_project",
    new Map([["source_code", "not_present"]]),
  );

  const errors = [];
  if (platformPlan.result !== "pass") errors.push("platform_self_governance plan must pass");
  if (demoPlan.result !== "pass") errors.push("demo_child_project_governance plan must pass");
  if (documentationOnlyWithNoCode.result !== "pass") errors.push("documentation_only_child_project plan must pass");
  if (!platformPlan.gates.some((gate) => gate.id === "child_governance_registry_contract" && gate.status === "planned")) {
    errors.push("platform plan must include planned child_governance_registry_contract gate");
  }
  if (!platformPlan.gates.some((gate) => gate.id === "child_governance_gate_plan" && gate.status === "planned")) {
    errors.push("platform plan must include planned child_governance_gate_plan gate");
  }
  if (!demoPlan.gates.some((gate) => gate.id === "child_project_demo_workspace_reset" && gate.status === "planned")) {
    errors.push("demo plan must include planned child_project_demo_workspace_reset gate");
  }

  if (errors.length > 0) {
    console.error("Child project governance gate planner self-test failed.");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  const writtenArtifacts = [platformPlan, demoPlan, documentationOnlyWithNoCode]
    .map((plan) => writePlanArtifact(plan, outputDir))
    .filter(Boolean);

  console.log("Child project governance gate planner self-test passed.");
  console.log("Implemented requirement: MR-0003REQ-0059");
  console.log("Implemented requirement: MR-0003REQ-0060");
  console.log(`Registry directory: ${normalizeProjectPath(path.relative(rootDir, registryDir))}`);
  console.log(`Profiles planned: 3`);
  console.log(`Platform gates evaluated: ${platformPlan.gates_evaluated}`);
  console.log(`Demo gates evaluated: ${demoPlan.gates_evaluated}`);
  console.log(`Documentation-only gates evaluated: ${documentationOnlyWithNoCode.gates_evaluated}`);
  console.log(`Platform planned: ${platformPlan.summary.planned}`);
  console.log(`Demo planned: ${demoPlan.summary.planned}`);
  console.log(`Documentation-only planned: ${documentationOnlyWithNoCode.summary.planned}`);
  if (writtenArtifacts.length > 0) {
    console.log(`Plan artifacts written: ${writtenArtifacts.length}`);
    for (const artifactPath of writtenArtifacts) console.log(`Artifact: ${artifactPath}`);
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  const registries = loadRegistryFamily();

  if (options.selfTest) {
    runSelfTest(registries, options.outputDir);
  } else {
    const profileId = options.profileId ?? "platform_self_governance";
    const plan = planProfile(registries, profileId, options.targetScope, options.capabilityOverrides);
    const writtenArtifact = writePlanArtifact(plan, options.outputDir);
    if (options.json) {
      console.log(JSON.stringify(plan, null, 2));
    } else {
      printPlan(plan);
      if (writtenArtifact) console.log(`Artifact: ${writtenArtifact}`);
    }
    if (plan.result !== "pass") process.exit(1);
  }
} catch (error) {
  console.error("Child project governance gate planning failed.");
  console.error(`- ${error.message}`);
  process.exit(1);
}

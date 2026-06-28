#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Read-only HTTP API for generated child project governance gate plan artifacts.
 *
 * @implementsRequirement MR-0003REQ-0014
 * @implementsRequirement MR-0003REQ-0015
 * @implementsRequirement MR-0003REQ-0059
 * @implementsRequirement MR-0003REQ-0060
 * @implementsRequirement MR-0003REQ-0061
 * @implementsRequirement MR-0003REQ-0062
 * @implementsRequirement MR-0003REQ-0063
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0011
 * @derivedFromDecision MR-0003/ADR-0012
 * @macroRequirement MR-0003
 *
 * This module serves the generated child project governance gate plan artifacts
 * produced by `plan-child-project-governance-gates.mjs`. It is a read-only
 * API boundary for the next UI slice: callers can list available plan artifacts
 * and fetch one deterministic artifact by governance profile and target scope.
 * The canonical source remains the governed registry family under
 * `docs/reference/project-model/registers/child-project-governance`; JSON plan
 * artifacts remain generated evidence, not authoritative records.
 *
 * Side effects: `startChildProjectGovernancePlanServeCommand` starts a bounded
 * local HTTP listener when invoked by the CLI entrypoint. Request handling reads
 * JSON files from the configured generated-artifact directory. The module does
 * not execute governance gates, mutate child projects, write SQLite state, run
 * git operations, modify Project Model sources, or implement final dynamic RBAC.
 */

const currentFilePath = fileURLToPath(import.meta.url);
const defaultRootDir = path.resolve(path.dirname(currentFilePath), "..", "..", "..", "..");
const defaultHost = "127.0.0.1";
const defaultPort = 4176;
const defaultArtifactDir = path.join(defaultRootDir, "artifacts", "child-project-governance", "gate-plans");
const defaultRegistryDir = path.join(defaultRootDir, "docs", "reference", "project-model", "registers", "child-project-governance");
const requiredCapability = "child_project_governance_plan.read";
const safeIdentifierPattern = /^[a-z0-9][a-z0-9._-]*$/u;
const jsonContentType = "application/json; charset=utf-8";
const corsHeaders = Object.freeze({
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "accept, content-type, x-threat-forge-authenticated, x-threat-forge-role",
  "access-control-max-age": "300",
});
const optionNameMap = new Map([
  ["host", "host"],
  ["port", "port"],
  ["artifact-dir", "artifactDir"],
  ["artifactDir", "artifactDir"],
  ["registry-dir", "registryDir"],
  ["registryDir", "registryDir"],
]);

/**
 * @typedef {{id: string, label?: string, description?: string, [key: string]: unknown}} RegistryRecord
 * @typedef {{profile: string, target_scope: string, result?: string, summary?: Record<string, number>, gates_evaluated?: number, capability_states?: Record<string, string>, gates?: GovernanceGatePlanGate[]}} GovernanceGatePlan
 * @typedef {{id: string, label?: string, applicability_class?: string, status?: string, severity?: string, reason?: string, required_capabilities?: string[], validation_surfaces?: string[], evidence?: string[]}} GovernanceGatePlanGate
 * @typedef {{schema_version: number, artifact_type: string, generated_by?: string, implements_requirements?: string[], registry_directory?: string, plan: GovernanceGatePlan}} GovernanceGatePlanArtifact
 * @typedef {{artifactDir?: string, registryDir?: string, principalResolver?: (request: import("node:http").IncomingMessage) => Record<string, unknown>}} ChildProjectGovernancePlanServeAppOptions
 * @typedef {ChildProjectGovernancePlanServeAppOptions & {host?: string, port?: number, logger?: Pick<Console, "log"|"error">}} ChildProjectGovernancePlanServeCommandOptions
 */

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
 * Reads the value that follows a CLI option token.
 *
 * @param {string[]} argv - CLI argument tokens.
 * @param {number} index - Current option index.
 * @param {string} optionName - Human-readable option name for diagnostics.
 * @returns {string} Option value.
 */
function readNextOptionValue(argv, index, optionName) {
  const value = argv[index + 1];
  if (value === undefined || String(value).startsWith("--")) {
    throw new Error(`Missing value for --${optionName}.`);
  }
  return value;
}

/**
 * Normalizes the local server port.
 *
 * @param {string|number|undefined|null} value - Port-like value.
 * @returns {number} Valid TCP port number; `0` requests an ephemeral local port.
 */
function normalizePort(value) {
  const port = Number.parseInt(String(value ?? defaultPort), 10);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`Invalid child project governance plan serve port: ${value}.`);
  }
  return port;
}

/**
 * Resolves a repository-relative or absolute artifact directory.
 *
 * @param {string|undefined|null} value - Artifact directory option.
 * @returns {string} Absolute artifact directory.
 */
function normalizeArtifactDir(value) {
  const rawPath = String(value ?? defaultArtifactDir).trim() || defaultArtifactDir;
  return path.isAbsolute(rawPath) ? path.resolve(rawPath) : path.resolve(defaultRootDir, rawPath);
}

/**
 * Resolves a repository-relative or absolute governance registry directory.
 *
 * @param {string|undefined|null} value - Registry directory option.
 * @returns {string} Absolute registry directory.
 */
function normalizeRegistryDir(value) {
  const rawPath = String(value ?? defaultRegistryDir).trim() || defaultRegistryDir;
  return path.isAbsolute(rawPath) ? path.resolve(rawPath) : path.resolve(defaultRootDir, rawPath);
}

/**
 * Reads UTF-8 text from a repository file.
 *
 * @param {string} filePath - Absolute file path.
 * @returns {string} File text without BOM and CRLF drift.
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "").replace(/\r\n/gu, "\n");
}

/**
 * Removes simple single or double quotes from a scalar value.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string} Unquoted scalar text.
 */
function stripQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Parses a simple scalar value used by child governance registries.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string|number|boolean|null|Array<object>|object} Parsed scalar.
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
 * Parses the restricted YAML subset used by governed child governance registries.
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
 * Parses CLI/environment options for the local serve command.
 *
 * @param {string[]} [argv] - CLI arguments, excluding `node` and script path.
 * @param {Record<string, string|undefined>} [env] - Environment variables.
 * @returns {{host: string, port: number, artifactDir: string, registryDir: string, selfTest: boolean}} Normalized serve options.
 */
export function parseChildProjectGovernancePlanServeOptions(argv = process.argv.slice(2), env = process.env) {
  /** @type {Record<string, string>} */
  const options = {
    host: env.TF_CHILD_PROJECT_GOVERNANCE_PLAN_HOST || defaultHost,
    port: env.TF_CHILD_PROJECT_GOVERNANCE_PLAN_PORT || String(defaultPort),
    artifactDir: env.TF_CHILD_PROJECT_GOVERNANCE_PLAN_ARTIFACT_DIR || defaultArtifactDir,
    registryDir: env.TF_CHILD_PROJECT_GOVERNANCE_PLAN_REGISTRY_DIR || defaultRegistryDir,
  };
  let selfTest = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--self-test") {
      selfTest = true;
      continue;
    }
    if (!String(token).startsWith("--")) {
      throw new Error(`Unknown child project governance plan serve argument: ${token}.`);
    }

    const [rawName, inlineValue] = String(token).slice(2).split("=", 2);
    const optionName = optionNameMap.get(rawName);
    if (!optionName) {
      throw new Error(`Unknown child project governance plan serve option: --${rawName}.`);
    }

    const value = inlineValue ?? readNextOptionValue(argv, index, rawName);
    if (inlineValue === undefined) index += 1;
    options[optionName] = value;
  }

  return Object.freeze({
    host: String(options.host || defaultHost),
    port: normalizePort(options.port),
    artifactDir: normalizeArtifactDir(options.artifactDir),
    registryDir: normalizeRegistryDir(options.registryDir),
    selfTest,
  });
}

/**
 * Builds a conservative principal from request headers for bootstrap use.
 *
 * @param {import("node:http").IncomingMessage} request - HTTP request.
 * @returns {Record<string, unknown>} Principal object.
 */
export function resolveChildProjectGovernancePlanHeaderPrincipal(request) {
  const authenticated = String(request.headers["x-threat-forge-authenticated"] ?? "").toLowerCase() === "true";
  const role = String(request.headers["x-threat-forge-role"] ?? "").trim();
  return { authenticated, role: role || undefined };
}

/**
 * Builds the bootstrap access decision for read-only plan endpoints.
 *
 * @param {Record<string, unknown>} principal - Caller principal.
 * @returns {{authenticated: boolean, role?: string, allowed: boolean, required_capability: string, capabilities: string[]}} Access decision.
 */
function evaluateAccess(principal) {
  const authenticated = Boolean(principal?.authenticated);
  const role = String(principal?.role ?? "");
  const capabilities = authenticated && role === "registered_user" ? [requiredCapability] : [];
  return {
    authenticated,
    role: role || undefined,
    allowed: capabilities.includes(requiredCapability),
    required_capability: requiredCapability,
    capabilities,
  };
}

/**
 * Writes a JSON response.
 *
 * @param {import("node:http").ServerResponse} response - HTTP response.
 * @param {number} statusCode - HTTP status code.
 * @param {Record<string, unknown>} payload - JSON payload.
 * @returns {void}
 */
function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    ...corsHeaders,
    "content-type": jsonContentType,
    "cache-control": "no-store",
  });
  response.end(`${JSON.stringify(payload)}\n`);
}

/**
 * Writes a browser CORS preflight response for read-only local preview.
 *
 * @param {import("node:http").ServerResponse} response - HTTP response.
 * @returns {void}
 */
function writePreflight(response) {
  response.writeHead(204, corsHeaders);
  response.end();
}

/**
 * Returns true for supported read-only route pathnames.
 *
 * @param {string} pathname - Request pathname.
 * @returns {boolean} True when the path belongs to this API surface.
 */
function isKnownPath(pathname) {
  return pathname === "/api/child-project-governance/gate-plans" || pathname.startsWith("/api/child-project-governance/gate-plans/");
}

/**
 * Validates a route identifier segment.
 *
 * @param {string} value - Decoded route segment.
 * @param {string} label - Segment label.
 * @returns {string} Valid route segment.
 */
function requireSafeIdentifier(value, label) {
  if (!safeIdentifierPattern.test(value)) {
    throw Object.assign(new Error(`Invalid ${label}: ${value}.`), { statusCode: 400, code: "invalid_request" });
  }
  return value;
}

/**
 * Builds an artifact file name from safe profile and target-scope ids.
 *
 * @param {string} profile - Governance profile id.
 * @param {string} targetScope - Target scope id.
 * @returns {string} Stable artifact file name.
 */
function buildArtifactFileName(profile, targetScope) {
  return `${requireSafeIdentifier(profile, "profile")}.${requireSafeIdentifier(targetScope, "target_scope")}.plan.json`;
}

/**
 * Reads one JSON artifact file and checks the minimum envelope shape.
 *
 * @param {string} artifactPath - Absolute artifact path.
 * @returns {GovernanceGatePlanArtifact} Parsed artifact.
 */
function readPlanArtifact(artifactPath) {
  const parsed = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  if (parsed?.artifact_type !== "child_project_governance_gate_plan") {
    throw new Error(`Unsupported gate plan artifact type in ${normalizeProjectPath(path.relative(defaultRootDir, artifactPath))}.`);
  }
  if (!parsed.plan || typeof parsed.plan !== "object") {
    throw new Error(`Gate plan artifact is missing plan object: ${normalizeProjectPath(path.relative(defaultRootDir, artifactPath))}.`);
  }
  if (!parsed.plan.profile || !parsed.plan.target_scope) {
    throw new Error(`Gate plan artifact is missing profile or target_scope: ${normalizeProjectPath(path.relative(defaultRootDir, artifactPath))}.`);
  }
  return /** @type {GovernanceGatePlanArtifact} */ (parsed);
}

/**
 * Reads one child governance registry file from the configured registry directory.
 *
 * @param {string} registryDir - Absolute registry directory.
 * @param {string} fileName - Registry file name.
 * @returns {Record<string, unknown>} Parsed registry object.
 */
function readGovernanceRegistry(registryDir, fileName) {
  const registryPath = path.join(registryDir, fileName);
  if (!fs.existsSync(registryPath)) {
    throw new Error(`Missing child governance registry file: ${normalizeProjectPath(path.relative(defaultRootDir, registryPath))}.`);
  }
  return parseYaml(readText(registryPath));
}

/**
 * Converts an array of registry records into an id-indexed map.
 *
 * @param {unknown} records - Registry record array.
 * @returns {Map<string, RegistryRecord>} Registry records by id.
 */
function indexRecordsById(records) {
  const indexed = new Map();
  if (!Array.isArray(records)) return indexed;
  for (const record of records) {
    if (record && typeof record === "object" && typeof record.id === "string") {
      indexed.set(record.id, /** @type {RegistryRecord} */ (record));
    }
  }
  return indexed;
}

/**
 * Loads child governance registries needed to explain a generated gate plan.
 *
 * @param {string} registryDir - Absolute child governance registry directory.
 * @returns {Record<string, unknown>} Indexed registry read model.
 */
function loadGovernanceExplanationRegistries(registryDir) {
  const capabilitiesRegistry = readGovernanceRegistry(registryDir, "governance-capabilities.registry.yml");
  const surfacesRegistry = readGovernanceRegistry(registryDir, "validation-surfaces.registry.yml");
  const gatesRegistry = readGovernanceRegistry(registryDir, "governance-gates.registry.yml");
  const profilesRegistry = readGovernanceRegistry(registryDir, "governance-profiles.registry.yml");
  const applicabilityRegistry = readGovernanceRegistry(registryDir, "gate-applicability-classes.registry.yml");

  return Object.freeze({
    registry_directory: normalizeProjectPath(path.relative(defaultRootDir, registryDir)),
    capabilities: indexRecordsById(capabilitiesRegistry.governance_capabilities),
    capability_states: indexRecordsById(capabilitiesRegistry.capability_states),
    validation_surfaces: indexRecordsById(surfacesRegistry.validation_surfaces),
    gates: indexRecordsById(gatesRegistry.governance_gates),
    profiles: indexRecordsById(profilesRegistry.governance_profiles),
    applicability_classes: indexRecordsById(applicabilityRegistry.applicability_classes),
    execution_result_statuses: indexRecordsById(applicabilityRegistry.execution_result_statuses),
  });
}

/**
 * Converts an identifier into a fallback human label.
 *
 * @param {string} value - Identifier.
 * @returns {string} Human-readable fallback label.
 */
function humanizeIdentifier(value) {
  const words = String(value ?? "").replace(/[._-]+/gu, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Unknown";
}

/**
 * Returns a registry record label with a stable fallback.
 *
 * @param {string} id - Record id.
 * @param {RegistryRecord|undefined} record - Optional registry record.
 * @returns {string} Display label.
 */
function recordLabel(id, record) {
  return String(record?.label ?? humanizeIdentifier(id));
}

/**
 * Returns a registry record description with a stable fallback.
 *
 * @param {string} fallback - Fallback description.
 * @param {RegistryRecord|undefined} record - Optional registry record.
 * @returns {string} Display description.
 */
function recordDescription(fallback, record) {
  return String(record?.description ?? fallback);
}

/**
 * Reads a registry record array field as stable strings.
 *
 * @param {RegistryRecord|undefined} record - Optional registry record.
 * @param {string} field - Array field name.
 * @returns {string[]} String values.
 */
function recordStringArray(record, field) {
  const value = record?.[field];
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

/**
 * Reads a registry record text field with a fallback.
 *
 * @param {RegistryRecord|undefined} record - Optional registry record.
 * @param {string} field - Text field name.
 * @param {string} fallback - Fallback text.
 * @returns {string} Registry text value.
 */
function recordText(record, field, fallback) {
  const value = record?.[field];
  return typeof value === "string" && value.trim() ? value : fallback;
}

/**
 * Builds the study-oriented explanation for a selected governance profile.
 *
 * @param {string} profileId - Governance profile id from the generated plan.
 * @param {RegistryRecord|undefined} profile - Profile registry record.
 * @returns {Record<string, unknown>} Profile explanation view model.
 */
function explainProfile(profileId, profile) {
  return {
    id: profileId,
    label: recordLabel(profileId, profile),
    description: recordDescription("Governance profile selected for this gate plan.", profile),
    source_registry: "governance-profiles.registry.yml",
    concept: "A governance profile is the named baseline that chooses which capabilities and gates are relevant for a target project type.",
    why_it_matters: "The profile explains why a plan contains this gate set instead of treating every project as identical.",
    target_scope: profile?.target_scope,
    baseline_required: profile?.baseline_required,
    provisional: profile?.provisional,
    required_capabilities: Array.isArray(profile?.required_capabilities) ? profile.required_capabilities : [],
    optional_capabilities: Array.isArray(profile?.optional_capabilities) ? profile.optional_capabilities : [],
  };
}

/**
 * Builds the study-oriented explanation for the target scope field.
 *
 * @param {string} targetScope - Target scope id from the generated plan.
 * @returns {Record<string, unknown>} Target-scope explanation view model.
 */
function explainTargetScope(targetScope) {
  return {
    id: targetScope,
    label: humanizeIdentifier(targetScope),
    concept: "Target scope identifies which kind of project or platform surface the profile is being planned against.",
    why_it_matters: "Gate selection changes when the target is threat-forge itself, a resettable demo child project, or a managed child project.",
  };
}

/**
 * Builds an execution status explanation.
 *
 * @param {string|undefined} statusId - Execution status id.
 * @param {Map<string, RegistryRecord>} statuses - Execution status registry map.
 * @returns {Record<string, unknown>} Status explanation.
 */
function explainStatus(statusId, statuses) {
  const id = String(statusId ?? "unknown");
  const record = statuses.get(id);
  return {
    id,
    label: recordLabel(id, record),
    description: recordDescription("Execution or planning status for this gate.", record),
    source_registry: "gate-applicability-classes.registry.yml#execution_result_statuses",
    concept: "Execution result status says whether the gate passed, failed, is planned, is unsupported, or does not apply.",
    why_it_matters: "Users must distinguish a planned or unsupported gate from a successful validation result.",
  };
}

/**
 * Builds an applicability-class explanation.
 *
 * @param {string|undefined} classId - Applicability class id.
 * @param {Map<string, RegistryRecord>} applicabilityClasses - Applicability class registry map.
 * @returns {Record<string, unknown>} Applicability explanation.
 */
function explainApplicabilityClass(classId, applicabilityClasses) {
  const id = String(classId ?? "unknown");
  const record = applicabilityClasses.get(id);
  return {
    id,
    label: recordLabel(id, record),
    description: recordDescription("Rule family used to decide whether the gate applies.", record),
    source_registry: "gate-applicability-classes.registry.yml#applicability_classes",
    default_when_not_triggered: record?.default_when_not_triggered,
    concept: "Applicability class is the rule family used by the planner to decide whether a gate must appear in this plan.",
    why_it_mattered_for_selection: "It explains whether the gate is always required, capability-driven, platform-only, demo-only, or non-applicable with evidence.",
  };
}

/**
 * Builds a capability explanation for one gate requirement.
 *
 * @param {string} capabilityId - Capability id.
 * @param {Record<string, unknown>} registries - Indexed governance registries.
 * @param {Record<string, string>} capabilityStates - Capability states from the generated plan.
 * @returns {Record<string, unknown>} Capability explanation.
 */
function explainCapability(capabilityId, registries, capabilityStates) {
  const capabilities = /** @type {Map<string, RegistryRecord>} */ (registries.capabilities);
  const states = /** @type {Map<string, RegistryRecord>} */ (registries.capability_states);
  const capability = capabilities.get(capabilityId);
  const stateId = String(capabilityStates[capabilityId] ?? "unknown");
  const state = states.get(stateId);
  return {
    id: capabilityId,
    label: recordLabel(capabilityId, capability),
    description: recordDescription("Project or platform capability required by this gate.", capability),
    category: capability?.category,
    enables: recordText(capability, "enables", "Capability behavior is not yet described by the registry."),
    source_registry: "governance-capabilities.registry.yml#governance_capabilities",
    state: {
      id: stateId,
      label: recordLabel(stateId, state),
      description: recordDescription("Capability state recorded by the generated plan.", state),
      source_registry: "governance-capabilities.registry.yml#capability_states",
    },
    concept: "A required capability is what the project or platform must be able to expose, read, validate, or reason about before this gate can be meaningful.",
    why_it_matters: recordText(capability, "why_it_matters", "Threat analysis depends on knowing which project capabilities exist; gates are selected from those capabilities rather than from opaque UI choices."),
  };
}

/**
 * Builds a validation-surface explanation for one gate.
 *
 * @param {string} surfaceId - Validation surface id.
 * @param {Record<string, unknown>} registries - Indexed governance registries.
 * @returns {Record<string, unknown>} Validation surface explanation.
 */
function explainValidationSurface(surfaceId, registries) {
  const surfaces = /** @type {Map<string, RegistryRecord>} */ (registries.validation_surfaces);
  const surface = surfaces.get(surfaceId);
  return {
    id: surfaceId,
    label: recordLabel(surfaceId, surface),
    description: recordDescription("Concrete project, command, fixture, API, or generated artifact surface checked by this gate.", surface),
    evidence_kind: surface?.evidence_kind,
    command: surface?.command,
    checked_area: recordText(surface, "checked_area", "Concrete project area checked by this validation surface."),
    checked_artifacts: recordStringArray(surface, "checked_artifacts"),
    checked_paths: recordStringArray(surface, "checked_paths"),
    source_registry: "validation-surfaces.registry.yml#validation_surfaces",
    concept: "A validation surface is the concrete place where a gate gets evidence: repository checks, registries, generated artifacts, demo workspaces, API self-tests, frontend builds, or runtime tests.",
    why_it_matters: recordText(surface, "why_it_matters", "It tells the reader what part of the project is actually being checked, so the gate is not just an abstract policy name."),
  };
}

/**
 * Builds an explainable rationale for a generated gate plan item.
 *
 * @param {GovernanceGatePlanGate} gate - Gate item from the generated plan artifact.
 * @param {RegistryRecord|undefined} profile - Selected profile registry record.
 * @param {string} targetScope - Plan target scope.
 * @param {Record<string, unknown>} registries - Indexed governance registries.
 * @param {Record<string, string>} capabilityStates - Capability states from the generated plan.
 * @returns {Record<string, unknown>} Gate explanation view model.
 */
function explainGate(gate, profile, targetScope, registries, capabilityStates) {
  const gates = /** @type {Map<string, RegistryRecord>} */ (registries.gates);
  const applicabilityClasses = /** @type {Map<string, RegistryRecord>} */ (registries.applicability_classes);
  const statuses = /** @type {Map<string, RegistryRecord>} */ (registries.execution_result_statuses);
  const gateRecord = gates.get(gate.id);
  const profileGateIds = Array.isArray(profile?.gates) ? profile.gates : [];
  const gateTargetScopes = Array.isArray(gateRecord?.target_scopes) ? gateRecord.target_scopes : [];
  const requiredCapabilities = Array.isArray(gate.required_capabilities)
    ? gate.required_capabilities
    : recordStringArray(gateRecord, "required_capabilities");
  const validationSurfaces = Array.isArray(gate.validation_surfaces)
    ? gate.validation_surfaces
    : recordStringArray(gateRecord, "validation_surfaces");

  return {
    id: gate.id,
    label: String(gate.label ?? gateRecord?.label ?? humanizeIdentifier(gate.id)),
    source_registry: "governance-gates.registry.yml#governance_gates",
    summary: recordDescription("Governance gate check selected by the plan.", gateRecord),
    what_it_checks: recordDescription("Governance gate check selected by the plan.", gateRecord),
    checked_objects: recordStringArray(gateRecord, "checked_objects"),
    checked_entity_types: recordStringArray(gateRecord, "checked_entity_types"),
    checked_paths: recordStringArray(gateRecord, "checked_paths"),
    expected_result: recordText(gateRecord, "expected_result", "The gate produces a governed validation result when executed."),
    why_selected: String(gate.reason ?? "The profile selected this gate for the current target scope."),
    contributes_to_threat_analysis_readiness: recordText(gateRecord, "threat_analysis_contribution", "This gate helps make the project documentation, implementation evidence, or runtime boundary understandable enough to support later threat analysis."),
    status: explainStatus(gate.status, statuses),
    applicability_class: explainApplicabilityClass(gate.applicability_class ?? String(gateRecord?.applicability_class ?? "unknown"), applicabilityClasses),
    selection_rationale: {
      profile: profile?.id,
      target_scope: targetScope,
      profile_includes_gate: profileGateIds.includes(gate.id),
      target_scope_supported_by_gate: gateTargetScopes.includes(targetScope),
      raw_reason: gate.reason,
      result_when_not_applicable: gateRecord?.result_when_not_applicable,
      unsupported_behavior: gateRecord?.unsupported_behavior,
    },
    required_capabilities: requiredCapabilities.map((capabilityId) => explainCapability(capabilityId, registries, capabilityStates)),
    validation_surfaces: validationSurfaces.map((surfaceId) => explainValidationSurface(surfaceId, registries)),
    evidence: Array.isArray(gate.evidence) ? gate.evidence : [],
    expected_verification_output: recordText(gateRecord, "expected_result", "The gate produces a governed validation result when executed."),
    technical_trace: {
      raw_evidence_markers: Array.isArray(gate.evidence) ? gate.evidence : [],
      raw_gate_id: gate.id,
      raw_validation_surface_ids: validationSurfaces,
      raw_capability_ids: requiredCapabilities,
    },
  };
}

/**
 * Builds the study-oriented plan explanation view model.
 *
 * @param {GovernanceGatePlanArtifact} artifact - Generated plan artifact.
 * @param {string} registryDir - Absolute registry directory.
 * @returns {Record<string, unknown>} Explanation view model.
 */
function buildGatePlanExplanation(artifact, registryDir) {
  const registries = loadGovernanceExplanationRegistries(registryDir);
  const profiles = /** @type {Map<string, RegistryRecord>} */ (registries.profiles);
  const profile = profiles.get(artifact.plan.profile);
  const capabilityStates = artifact.plan.capability_states ?? {};
  const gates = Array.isArray(artifact.plan.gates) ? artifact.plan.gates : [];

  return {
    purpose: "Explain the generated child project governance gate plan as a study-oriented read model.",
    usage: "Use this explanation to understand what each gate checks, why the profile selected it, what capabilities it requires, and which validation surfaces provide evidence.",
    limitations: "This view is read-only. It does not execute gates, mutate child projects, update registries, run repositories, or replace the generated plan artifact.",
    source_registries: [
      `${registries.registry_directory}/governance-profiles.registry.yml`,
      `${registries.registry_directory}/governance-gates.registry.yml`,
      `${registries.registry_directory}/governance-capabilities.registry.yml`,
      `${registries.registry_directory}/validation-surfaces.registry.yml`,
      `${registries.registry_directory}/gate-applicability-classes.registry.yml`,
    ],
    field_explanations: {
      required_capabilities: {
        question: "Quali capability richiede?",
        meaning: "Capabilities describe what the project or platform must be able to expose, read, validate, or reason about for a gate to be meaningful.",
        why_it_matters: "They connect governance checks to real project capabilities, which is necessary before threat analysis can reason about assets, boundaries, flows, APIs, UI, storage, AI, or operations.",
      },
      validation_surfaces: {
        question: "Quale superficie valida?",
        meaning: "Validation surfaces describe the concrete files, registries, commands, generated artifacts, fixtures, APIs, UI builds, or tests that provide gate evidence.",
        why_it_matters: "They show what is actually checked and prevent the gate plan from becoming a list of opaque policy labels.",
      },
      why_selected: {
        question: "Perché questo gate è stato scelto?",
        meaning: "The rationale combines the selected profile, target scope, applicability class, capability state, validation surfaces, and generated planner reason.",
        why_it_matters: "A user studying threat analysis must see why a check exists before trusting its result or using it as evidence.",
      },
    },
    profile: explainProfile(artifact.plan.profile, profile),
    target_scope: explainTargetScope(artifact.plan.target_scope),
    result: explainStatus(artifact.plan.result, /** @type {Map<string, RegistryRecord>} */ (registries.execution_result_statuses)),
    gates: gates.map((gate) => explainGate(gate, profile, artifact.plan.target_scope, registries, capabilityStates)),
  };
}

/**
 * Lists available plan artifact file paths.
 *
 * @param {string} artifactDir - Artifact directory.
 * @returns {string[]} Sorted absolute artifact paths.
 */
function listArtifactPaths(artifactDir) {
  if (!fs.existsSync(artifactDir)) return [];
  return fs.readdirSync(artifactDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".plan.json"))
    .map((entry) => path.join(artifactDir, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Builds a compact list item from a plan artifact.
 *
 * @param {GovernanceGatePlanArtifact} artifact - Gate plan artifact.
 * @param {string} artifactPath - Absolute artifact path.
 * @returns {Record<string, unknown>} UI-safe summary item.
 */
function summarizeArtifact(artifact, artifactPath) {
  return {
    profile: artifact.plan.profile,
    target_scope: artifact.plan.target_scope,
    result: artifact.plan.result ?? "unknown",
    gates_evaluated: artifact.plan.gates_evaluated ?? 0,
    summary: artifact.plan.summary ?? {},
    artifact_path: normalizeProjectPath(path.relative(defaultRootDir, artifactPath)),
  };
}

/**
 * Lists gate plan artifacts as a UI-safe read model.
 *
 * @param {string} artifactDir - Artifact directory.
 * @returns {{artifact_directory: string, items: Record<string, unknown>[]}} List payload.
 */
function listGatePlans(artifactDir) {
  const items = listArtifactPaths(artifactDir).map((artifactPath) => summarizeArtifact(readPlanArtifact(artifactPath), artifactPath));
  return {
    artifact_directory: normalizeProjectPath(path.relative(defaultRootDir, artifactDir)),
    items,
  };
}

/**
 * Loads one gate plan artifact by profile and target scope.
 *
 * @param {string} artifactDir - Artifact directory.
 * @param {string} registryDir - Registry directory.
 * @param {string} profile - Governance profile id.
 * @param {string} targetScope - Target scope id.
 * @returns {{artifact_path: string, artifact: GovernanceGatePlanArtifact, explanation: Record<string, unknown>}} Detail payload.
 */
function getGatePlan(artifactDir, registryDir, profile, targetScope) {
  const artifactPath = path.join(artifactDir, buildArtifactFileName(profile, targetScope));
  if (!fs.existsSync(artifactPath)) {
    throw Object.assign(new Error(`Gate plan artifact not found: ${profile}/${targetScope}.`), { statusCode: 404, code: "not_found" });
  }
  const artifact = readPlanArtifact(artifactPath);
  return {
    artifact_path: normalizeProjectPath(path.relative(defaultRootDir, artifactPath)),
    artifact,
    explanation: buildGatePlanExplanation(artifact, registryDir),
  };
}

/**
 * Creates a native Node.js HTTP request handler for gate plan artifacts.
 *
 * @param {ChildProjectGovernancePlanServeAppOptions} [options] - Handler options.
 * @returns {(request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse) => Promise<void>} HTTP handler.
 */
export function createChildProjectGovernancePlanHttpHandler(options = {}) {
  const artifactDir = normalizeArtifactDir(options.artifactDir);
  const registryDir = normalizeRegistryDir(options.registryDir);
  const principalResolver = options.principalResolver ?? resolveChildProjectGovernancePlanHeaderPrincipal;

  return async function childProjectGovernancePlanHttpHandler(request, response) {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    const method = String(request.method ?? "GET").toUpperCase();
    const pathname = requestUrl.pathname;

    if (method === "OPTIONS" && isKnownPath(pathname)) {
      writePreflight(response);
      return;
    }

    if (method !== "GET" && isKnownPath(pathname)) {
      writeJson(response, 405, { error: "method_not_allowed", message: "Child project governance plan API is read-only." });
      return;
    }

    if (!isKnownPath(pathname)) {
      writeJson(response, 404, { error: "not_found", message: `Route not found: ${method} ${pathname}` });
      return;
    }

    try {
      const principal = principalResolver(request);
      const access = evaluateAccess(principal);
      if (!access.allowed) {
        writeJson(response, 403, { error: "access_denied", message: "Current principal cannot read child project governance plans.", access });
        return;
      }

      if (pathname === "/api/child-project-governance/gate-plans") {
        writeJson(response, 200, { access, ...listGatePlans(artifactDir) });
        return;
      }

      const match = /^\/api\/child-project-governance\/gate-plans\/([^/]+)\/([^/]+)$/u.exec(pathname);
      if (!match) {
        writeJson(response, 404, { error: "not_found", message: `Route not found: ${method} ${pathname}` });
        return;
      }

      const profile = decodeURIComponent(match[1]);
      const targetScope = decodeURIComponent(match[2]);
      writeJson(response, 200, { access, ...getGatePlan(artifactDir, registryDir, profile, targetScope) });
    } catch (error) {
      const statusCode = Number(error?.statusCode ?? 500);
      const code = String(error?.code ?? "internal_error");
      const message = statusCode >= 500 ? "Child project governance plan request failed." : String(error?.message ?? "Request failed.");
      writeJson(response, statusCode, { error: code, message });
    }
  };
}

/**
 * Builds the read-only Child Project Governance Plan serve app without listening.
 *
 * @param {ChildProjectGovernancePlanServeAppOptions} [options] - Composition options.
 * @returns {{server: import("node:http").Server, options: {artifactDir: string}}} Serve app.
 */
export function createChildProjectGovernancePlanServeApp(options = {}) {
  const artifactDir = normalizeArtifactDir(options.artifactDir);
  const registryDir = normalizeRegistryDir(options.registryDir);
  const server = http.createServer(createChildProjectGovernancePlanHttpHandler({
    artifactDir,
    registryDir,
    principalResolver: options.principalResolver,
  }));

  return Object.freeze({
    server,
    options: Object.freeze({ artifactDir, registryDir }),
  });
}

/**
 * Starts the local read-only Child Project Governance Plan HTTP server.
 *
 * @param {ChildProjectGovernancePlanServeCommandOptions} [options] - Serve options.
 * @returns {Promise<{server: import("node:http").Server, url: string, artifactDir: string}>} Started server handle.
 */
export async function startChildProjectGovernancePlanServeCommand(options = {}) {
  const host = String(options.host || defaultHost);
  const port = normalizePort(options.port ?? defaultPort);
  const artifactDir = normalizeArtifactDir(options.artifactDir);
  const registryDir = normalizeRegistryDir(options.registryDir);
  const logger = options.logger ?? console;
  const app = createChildProjectGovernancePlanServeApp({
    artifactDir,
    registryDir,
    principalResolver: options.principalResolver,
  });

  await new Promise((resolve, reject) => {
    app.server.once("error", reject);
    app.server.listen(port, host, resolve);
  });

  const address = app.server.address();
  const resolvedPort = typeof address === "object" && address ? address.port : port;
  const url = `http://${host}:${resolvedPort}`;
  logger.log(`Child Project Governance Plan read-only API listening on ${url}`);
  logger.log("Use x-threat-forge-authenticated: true and x-threat-forge-role: registered_user headers for bootstrap access.");
  logger.log(`Artifact directory: ${normalizeProjectPath(path.relative(defaultRootDir, artifactDir))}`);
  logger.log(`Registry directory: ${normalizeProjectPath(path.relative(defaultRootDir, registryDir))}`);

  return Object.freeze({ server: app.server, url, artifactDir, registryDir });
}

/**
 * Performs a JSON request for serve self-tests.
 *
 * @param {string} url - Absolute URL.
 * @param {{method?: string, authenticated?: boolean}} [options] - Request options.
 * @returns {Promise<{statusCode: number, payload: Record<string, unknown>}>} Status and parsed payload.
 */
function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);
    const request = http.request({
      hostname: requestUrl.hostname,
      port: requestUrl.port,
      path: `${requestUrl.pathname}${requestUrl.search}`,
      method: options.method ?? "GET",
      headers: {
        accept: "application/json",
        "x-threat-forge-authenticated": String(options.authenticated ?? true),
        "x-threat-forge-role": "registered_user",
      },
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          resolve({ statusCode: response.statusCode ?? 0, payload: body ? JSON.parse(body) : {} });
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("error", reject);
    request.end();
  });
}

/**
 * Writes deterministic self-test gate plan artifacts.
 *
 * @param {string} artifactDir - Temporary artifact directory.
 * @returns {void}
 */
function writeSelfTestArtifacts(artifactDir) {
  fs.mkdirSync(artifactDir, { recursive: true });
  const artifacts = [
    {
      schema_version: 1,
      artifact_type: "child_project_governance_gate_plan",
      generated_by: "self-test",
      implements_requirements: ["MR-0003REQ-0059", "MR-0003REQ-0060"],
      registry_directory: "docs/reference/project-model/registers/child-project-governance",
      plan: {
        profile: "platform_self_governance",
        target_scope: "platform_self",
        result: "pass",
        summary: { planned: 1, pass: 0, fail: 0, warning: 0, not_applicable: 0, unsupported: 0 },
        gates_evaluated: 1,
        capability_states: { child_project_management: "declared" },
        gates: [{ id: "child_governance_gate_plan_artifacts", status: "planned", evidence: ["self-test artifact"] }],
      },
    },
    {
      schema_version: 1,
      artifact_type: "child_project_governance_gate_plan",
      generated_by: "self-test",
      implements_requirements: ["MR-0003REQ-0059", "MR-0003REQ-0060"],
      registry_directory: "docs/reference/project-model/registers/child-project-governance",
      plan: {
        profile: "demo_child_project_governance",
        target_scope: "demo_child_project",
        result: "pass",
        summary: { planned: 1, pass: 0, fail: 0, warning: 0, not_applicable: 0, unsupported: 0 },
        gates_evaluated: 1,
        capability_states: { project_model: "declared" },
        gates: [{ id: "child_project_demo_workspace_reset", status: "planned", evidence: ["self-test artifact"] }],
      },
    },
  ];

  for (const artifact of artifacts) {
    const fileName = buildArtifactFileName(artifact.plan.profile, artifact.plan.target_scope);
    fs.writeFileSync(path.join(artifactDir, fileName), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  }
}

/**
 * Runs a bounded local HTTP smoke test without touching default artifacts.
 *
 * @param {Pick<Console, "log"|"error">} [logger] - Logger.
 * @returns {Promise<void>} Completion promise.
 */
export async function runChildProjectGovernancePlanServeSelfTest(logger = console) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tf-child-project-governance-plan-serve-"));
  const artifactDir = path.join(tempRoot, "gate-plans");
  const app = createChildProjectGovernancePlanServeApp({ artifactDir });
  try {
    writeSelfTestArtifacts(artifactDir);
    await new Promise((resolve, reject) => {
      app.server.once("error", reject);
      app.server.listen(0, defaultHost, resolve);
    });

    const address = app.server.address();
    const resolvedPort = typeof address === "object" && address ? address.port : 0;
    const baseUrl = `http://${defaultHost}:${resolvedPort}`;
    const listResponse = await requestJson(`${baseUrl}/api/child-project-governance/gate-plans`);
    const detailResponse = await requestJson(`${baseUrl}/api/child-project-governance/gate-plans/platform_self_governance/platform_self`);
    const forbiddenResponse = await requestJson(`${baseUrl}/api/child-project-governance/gate-plans`, { authenticated: false });
    const writeResponse = await requestJson(`${baseUrl}/api/child-project-governance/gate-plans`, { method: "POST" });

    if (listResponse.statusCode !== 200 || !Array.isArray(listResponse.payload.items) || listResponse.payload.items.length !== 2) {
      throw new Error("Serve self-test expected two listed gate plan artifacts.");
    }
    if (detailResponse.statusCode !== 200 || detailResponse.payload?.artifact?.plan?.profile !== "platform_self_governance") {
      throw new Error("Serve self-test expected platform_self_governance detail artifact.");
    }
    if (detailResponse.payload?.explanation?.profile?.id !== "platform_self_governance") {
      throw new Error("Serve self-test expected profile explanation for platform_self_governance.");
    }
    if (!Array.isArray(detailResponse.payload?.explanation?.gates) || detailResponse.payload.explanation.gates.length !== 1) {
      throw new Error("Serve self-test expected one explainable gate rationale.");
    }
    if (!detailResponse.payload?.explanation?.field_explanations?.required_capabilities) {
      throw new Error("Serve self-test expected required capability field explanation.");
    }
    if (!detailResponse.payload?.explanation?.field_explanations?.validation_surfaces) {
      throw new Error("Serve self-test expected validation surface field explanation.");
    }
    const explainedGate = detailResponse.payload.explanation.gates[0];
    if (!Array.isArray(explainedGate.checked_objects) || !explainedGate.checked_objects.includes("Generated child governance gate plan JSON artifacts.")) {
      throw new Error("Serve self-test expected gate checked-object explanation from registry metadata.");
    }
    if (!explainedGate.expected_verification_output) {
      throw new Error("Serve self-test expected gate expected verification output explanation.");
    }
    if (!Array.isArray(explainedGate.validation_surfaces?.[0]?.checked_artifacts)) {
      throw new Error("Serve self-test expected validation surface checked artifact explanation.");
    }
    if (forbiddenResponse.statusCode !== 403) {
      throw new Error("Serve self-test expected unauthenticated requests to be forbidden.");
    }
    if (writeResponse.statusCode !== 405) {
      throw new Error("Serve self-test expected non-GET requests to be rejected as read-only.");
    }

    logger.log("Child Project Governance Plan API serve self-test passed.");
    logger.log(`Artifact directory: ${normalizeProjectPath(path.relative(defaultRootDir, artifactDir))}`);
    logger.log("Endpoint: GET /api/child-project-governance/gate-plans");
    logger.log("Endpoint: GET /api/child-project-governance/gate-plans/platform_self_governance/platform_self");
    logger.log("Implemented requirement: MR-0003REQ-0014");
    logger.log("Implemented requirement: MR-0003REQ-0015");
    logger.log("Implemented requirement: MR-0003REQ-0059");
    logger.log("Implemented requirement: MR-0003REQ-0060");
    logger.log("Implemented requirement: MR-0003REQ-0061");
    logger.log("Implemented requirement: MR-0003REQ-0062");
    logger.log("Implemented requirement: MR-0003REQ-0063");
  } finally {
    await new Promise((resolve) => app.server.close(resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

/**
 * Determines whether this module is being executed as the CLI entrypoint.
 *
 * @param {string} [moduleUrl] - Current module URL.
 * @param {string|undefined} [entrypointPath] - Process entrypoint path.
 * @returns {boolean} True when this module is the process entrypoint.
 */
export function isChildProjectGovernancePlanServeCliEntrypoint(moduleUrl = import.meta.url, entrypointPath = process.argv[1]) {
  if (!entrypointPath) return false;
  try {
    return path.normalize(fileURLToPath(moduleUrl)) === path.normalize(path.resolve(entrypointPath));
  } catch {
    return false;
  }
}

/**
 * Runs the local serve command or bounded self-test and maps failures to process exit.
 *
 * @param {string[]} [argv] - CLI arguments, excluding `node` and script path.
 * @param {Record<string, string|undefined>} [env] - Environment variables.
 * @param {Pick<Console, "log"|"error">} [logger] - Logger.
 * @returns {Promise<void>} Completion promise.
 */
export async function runChildProjectGovernancePlanServeCli(argv = process.argv.slice(2), env = process.env, logger = console) {
  try {
    const options = parseChildProjectGovernancePlanServeOptions(argv, env);
    if (options.selfTest) {
      await runChildProjectGovernancePlanServeSelfTest(logger);
      return;
    }
    await startChildProjectGovernancePlanServeCommand({ ...options, logger });
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (isChildProjectGovernancePlanServeCliEntrypoint()) {
  await runChildProjectGovernancePlanServeCli();
}

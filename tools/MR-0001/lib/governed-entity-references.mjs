import fs from "node:fs";
import path from "node:path";

import { readGovernedYamlFile } from "./governed-yaml.mjs";

/**
 * @file Canonical governed entity reference grammar and resolver registry core.
 *
 * @implementsRequirement MR-0001ADR-0008REQ-0001
 * @implementsRequirement MR-0001ADR-0008REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0008REQ-0002
 * @implementsRequirement MR-0001ADR-0008REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0008
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Parses and serializes the single governed Markdown reference payload, validates
 * the canonical resolver registry, and resolves references through provider
 * functions supplied by the composition root. The module never mutates authored
 * Markdown or authoritative entity sources.
 */

export const canonicalGovernedEntityResolverRegistryPath =
  "docs/reference/project-model/registers/references/governed-entity-resolvers.registry.yml";

export const governedEntityReferenceRuleIds = Object.freeze({
  resolverRegistry: "governed-reference.resolver-registry",
  duplicateResolver: "governed-reference.duplicate-resolver",
  missingProvider: "governed-reference.missing-provider",
  noncanonicalSyntax: "governed-reference.noncanonical-syntax",
  unknownIdentifier: "governed-reference.unknown-identifier",
  ambiguousIdentifier: "governed-reference.ambiguous-identifier",
  disallowedEntityType: "governed-reference.disallowed-entity-type",
  ineligibleEntity: "governed-reference.ineligible-entity",
  titleDivergence: "governed-reference.title-divergence",
});

const allowedRegistryMembers = new Set([
  "schema_version",
  "registry_id",
  "scope",
  "resolvers",
]);
const allowedResolverMembers = new Set([
  "id",
  "entity_type",
  "status",
  "identifier_pattern",
  "source_projection_provider",
  "eligibility_provider",
]);

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredText(record, fieldName) {
  return String(record?.[fieldName] ?? "").trim();
}

function problem(ruleId, message, context = "") {
  return { rule_id: ruleId, message, context };
}

function stableProblems(problems) {
  return [...problems].sort((left, right) =>
    compare(
      `${left.rule_id}|${left.context}|${left.message}`,
      `${right.rule_id}|${right.context}|${right.message}`,
    ),
  );
}

function safeProjectPath(rootDir, projectPath) {
  const normalized = String(projectPath ?? "").replaceAll("\\", "/").trim();
  if (!normalized) throw new Error("Governed resolver registry path must not be empty.");
  const absoluteRoot = path.resolve(rootDir);
  const absolute = path.resolve(absoluteRoot, ...normalized.split("/"));
  const relative = path.relative(absoluteRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Unsafe governed resolver registry path: ${projectPath}`);
  }
  return absolute;
}

/**
 * Parses the one canonical governed reference payload.
 *
 * @param {string} payload - Candidate payload without a profile-owned container.
 * @returns {{valid: true, id: string, title: string}|{valid: false}}
 */
export function parseCanonicalGovernedReferencePayload(payload) {
  const text = String(payload ?? "");
  if (!text || text !== text.trim()) return { valid: false };
  const match = text.match(/^\[([A-Z][A-Z0-9-]*)\] ([^\r\n]+)$/u);
  if (!match || !match[2] || match[2] !== match[2].trim()) {
    return { valid: false };
  }
  return { valid: true, id: match[1], title: match[2] };
}

/**
 * Serializes a resolved entity identity into the canonical reference payload.
 *
 * @param {{id: string, title: string}} input - Canonical entity identity.
 * @returns {string} Canonical payload.
 */
export function serializeGovernedReferencePayload(input) {
  const id = String(input?.id ?? "").trim();
  const title = String(input?.title ?? "").trim();
  if (!id || !title || !/^[A-Z][A-Z0-9-]*$/u.test(id)) {
    throw new Error("Canonical governed reference serialization requires id and title.");
  }
  return `[${id}] ${title}`;
}

/**
 * Loads the canonical resolver registry.
 *
 * @param {{rootDir: string, registryPath?: string}} input - Repository context.
 * @returns {Record<string, unknown>} Parsed registry.
 */
export function loadGovernedEntityResolverRegistry(input) {
  const rootDir = path.resolve(input?.rootDir ?? process.cwd());
  const registryPath =
    input?.registryPath ?? canonicalGovernedEntityResolverRegistryPath;
  const absolute = safeProjectPath(rootDir, registryPath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Governed entity resolver registry is missing: ${registryPath}`);
  }
  return readGovernedYamlFile(absolute);
}

/**
 * Validates the canonical resolver registry and provider coverage.
 *
 * @param {{
 *   registry: Record<string, unknown>,
 *   sourceProjectionProviders?: Map<string, Function>,
 *   eligibilityProviders?: Map<string, Function>
 * }} input - Registry and provider catalogs.
 * @returns {{valid: boolean, active_resolvers: Array<Record<string, unknown>>, errors: Array<Record<string, string>>}}
 */
export function validateGovernedEntityResolverRegistry(input) {
  const registry = input?.registry;
  const sourceProjectionProviders =
    input?.sourceProjectionProviders instanceof Map
      ? input.sourceProjectionProviders
      : new Map();
  const eligibilityProviders =
    input?.eligibilityProviders instanceof Map
      ? input.eligibilityProviders
      : new Map();
  const errors = [];

  if (!isRecord(registry)) {
    errors.push(
      problem(
        governedEntityReferenceRuleIds.resolverRegistry,
        "Governed entity resolver registry must be a mapping.",
        "registry",
      ),
    );
    return { valid: false, active_resolvers: [], errors };
  }

  for (const member of Object.keys(registry)) {
    if (!allowedRegistryMembers.has(member)) {
      errors.push(
        problem(
          governedEntityReferenceRuleIds.resolverRegistry,
          `Governed entity resolver registry contains unknown member ${member}.`,
          "registry",
        ),
      );
    }
  }
  if (registry.schema_version !== 1) {
    errors.push(
      problem(
        governedEntityReferenceRuleIds.resolverRegistry,
        "Governed entity resolver registry schema_version must equal 1.",
        "registry",
      ),
    );
  }
  if (
    requiredText(registry, "registry_id") !==
    "governed-entity-resolvers-registry"
  ) {
    errors.push(
      problem(
        governedEntityReferenceRuleIds.resolverRegistry,
        "Governed entity resolver registry_id is invalid.",
        "registry",
      ),
    );
  }
  if (
    requiredText(registry, "scope") !==
    "governed_entity_reference_resolution"
  ) {
    errors.push(
      problem(
        governedEntityReferenceRuleIds.resolverRegistry,
        "Governed entity resolver registry scope is invalid.",
        "registry",
      ),
    );
  }

  const resolvers = Array.isArray(registry.resolvers) ? registry.resolvers : [];
  if (!Array.isArray(registry.resolvers) || resolvers.length === 0) {
    errors.push(
      problem(
        governedEntityReferenceRuleIds.resolverRegistry,
        "Governed entity resolver registry must declare a non-empty resolvers list.",
        "resolvers",
      ),
    );
  }

  const activeByEntityType = new Map();
  const activeResolvers = [];
  for (const [index, resolver] of resolvers.entries()) {
    const context = `resolvers[${index}]`;
    if (!isRecord(resolver)) {
      errors.push(
        problem(
          governedEntityReferenceRuleIds.resolverRegistry,
          `${context} must be a mapping.`,
          context,
        ),
      );
      continue;
    }
    for (const member of Object.keys(resolver)) {
      if (!allowedResolverMembers.has(member)) {
        errors.push(
          problem(
            governedEntityReferenceRuleIds.resolverRegistry,
            `${context} contains unknown member ${member}.`,
            context,
          ),
        );
      }
    }

    const id = requiredText(resolver, "id");
    const entityType = requiredText(resolver, "entity_type");
    const status = requiredText(resolver, "status");
    const identifierPattern = requiredText(resolver, "identifier_pattern");
    const sourceProvider = requiredText(
      resolver,
      "source_projection_provider",
    );
    const eligibilityProvider = requiredText(
      resolver,
      "eligibility_provider",
    );

    if (
      !id ||
      !entityType ||
      !status ||
      !identifierPattern ||
      !sourceProvider ||
      !eligibilityProvider
    ) {
      errors.push(
        problem(
          governedEntityReferenceRuleIds.resolverRegistry,
          `${context} must declare id, entity_type, status, identifier_pattern, source_projection_provider and eligibility_provider.`,
          context,
        ),
      );
      continue;
    }
    if (status !== "active") continue;

    let compiledPattern = null;
    try {
      compiledPattern = new RegExp(identifierPattern, "u");
    } catch {
      errors.push(
        problem(
          governedEntityReferenceRuleIds.resolverRegistry,
          `${context} identifier_pattern is not a valid regular expression.`,
          context,
        ),
      );
    }

    if (activeByEntityType.has(entityType)) {
      errors.push(
        problem(
          governedEntityReferenceRuleIds.duplicateResolver,
          `Entity type ${entityType} has multiple active resolvers.`,
          context,
        ),
      );
    } else {
      activeByEntityType.set(entityType, resolver);
    }
    if (!sourceProjectionProviders.has(sourceProvider)) {
      errors.push(
        problem(
          governedEntityReferenceRuleIds.missingProvider,
          `${context} references unavailable source projection provider ${sourceProvider}.`,
          context,
        ),
      );
    }
    if (!eligibilityProviders.has(eligibilityProvider)) {
      errors.push(
        problem(
          governedEntityReferenceRuleIds.missingProvider,
          `${context} references unavailable eligibility provider ${eligibilityProvider}.`,
          context,
        ),
      );
    }

    activeResolvers.push({
      ...structuredClone(resolver),
      compiled_identifier_pattern: compiledPattern,
    });
  }

  return {
    valid: errors.length === 0,
    active_resolvers: activeResolvers.sort((left, right) =>
      compare(left.entity_type, right.entity_type),
    ),
    errors: stableProblems(errors),
  };
}

function containsGovernedIdentifierCandidate(payload, activeResolvers) {
  const text = String(payload ?? "");
  for (const resolver of activeResolvers) {
    const patternText = String(resolver.identifier_pattern ?? "");
    if (patternText === "^BAE-[0-9]{4}$" && /\bBAE-\d{4}\b/iu.test(text)) {
      return true;
    }
    const compiled = resolver.compiled_identifier_pattern;
    if (!compiled) continue;
    const unanchoredText = patternText
      .replace(/^\^/u, "")
      .replace(/\$$/u, "");
    try {
      if (new RegExp(unanchoredText, "iu").test(text)) return true;
    } catch {
      // Registry validation already reports invalid patterns.
    }
  }
  return false;
}

function resolverForIdentifier(id, activeResolvers) {
  return activeResolvers.find((resolver) => {
    const pattern = resolver.compiled_identifier_pattern;
    if (!pattern) return false;
    pattern.lastIndex = 0;
    return pattern.test(id);
  });
}

/**
 * Creates a side-effect-free governed reference service.
 *
 * @param {{
 *   registry: Record<string, unknown>,
 *   sourceProjectionProviders: Map<string, Function>,
 *   eligibilityProviders: Map<string, Function>
 * }} input - Canonical registry and provider catalogs.
 * @returns {{
 *   validation: Record<string, unknown>,
 *   analyzePayload: (input: Record<string, unknown>) => Record<string, unknown>
 * }}
 */
export function createGovernedEntityReferenceService(input) {
  const sourceProjectionProviders =
    input?.sourceProjectionProviders instanceof Map
      ? input.sourceProjectionProviders
      : new Map();
  const eligibilityProviders =
    input?.eligibilityProviders instanceof Map
      ? input.eligibilityProviders
      : new Map();
  const validation = validateGovernedEntityResolverRegistry({
    registry: input?.registry,
    sourceProjectionProviders,
    eligibilityProviders,
  });
  if (!validation.valid) {
    throw new Error(
      `Governed entity resolver registry is invalid: ${validation.errors
        .map((entry) => `${entry.rule_id}: ${entry.message}`)
        .join(" | ")}`,
    );
  }

  const activeResolvers = validation.active_resolvers;

  return {
    validation,
    analyzePayload(request) {
      const payload = String(request?.payload ?? "");
      const allowedEntityTypes = new Set(
        Array.isArray(request?.allowedEntityTypes)
          ? request.allowedEntityTypes.map(String)
          : [],
      );
      const parsed = parseCanonicalGovernedReferencePayload(payload);

      if (!parsed.valid) {
        if (!containsGovernedIdentifierCandidate(payload, activeResolvers)) {
          return {
            recognized: false,
            valid: true,
            diagnostics: [],
          };
        }
        return {
          recognized: true,
          valid: false,
          diagnostics: [
            problem(
              governedEntityReferenceRuleIds.noncanonicalSyntax,
              "Governed entity reference must use canonical payload [<canonical-id>] <canonical-title>.",
              String(request?.positionId ?? ""),
            ),
          ],
        };
      }

      const resolver = resolverForIdentifier(parsed.id, activeResolvers);
      if (!resolver) {
        return {
          recognized: true,
          valid: false,
          parsed,
          diagnostics: [
            problem(
              governedEntityReferenceRuleIds.unknownIdentifier,
              `Governed entity identifier ${parsed.id} has no registered resolver.`,
              parsed.id,
            ),
          ],
        };
      }
      if (
        allowedEntityTypes.size > 0 &&
        !allowedEntityTypes.has(String(resolver.entity_type))
      ) {
        return {
          recognized: true,
          valid: false,
          parsed,
          diagnostics: [
            problem(
              governedEntityReferenceRuleIds.disallowedEntityType,
              `Entity type ${resolver.entity_type} is not allowed in this reference-bearing position.`,
              parsed.id,
            ),
          ],
        };
      }

      const sourceProvider = sourceProjectionProviders.get(
        String(resolver.source_projection_provider),
      );
      const projection = sourceProvider({
        currentDocument: request?.currentDocument,
        resolver: structuredClone(resolver),
      });
      const matches = (Array.isArray(projection) ? projection : []).filter(
        (entity) => String(entity?.id ?? "") === parsed.id,
      );
      if (matches.length === 0) {
        return {
          recognized: true,
          valid: false,
          parsed,
          entity_type: resolver.entity_type,
          diagnostics: [
            problem(
              governedEntityReferenceRuleIds.unknownIdentifier,
              `Governed entity identifier ${parsed.id} does not resolve.`,
              parsed.id,
            ),
          ],
        };
      }
      if (matches.length > 1) {
        return {
          recognized: true,
          valid: false,
          parsed,
          entity_type: resolver.entity_type,
          diagnostics: [
            problem(
              governedEntityReferenceRuleIds.ambiguousIdentifier,
              `Governed entity identifier ${parsed.id} resolves more than once.`,
              parsed.id,
            ),
          ],
        };
      }

      const entity = structuredClone(matches[0]);
      const eligibilityProvider = eligibilityProviders.get(
        String(resolver.eligibility_provider),
      );
      const eligibilityResult = eligibilityProvider({
        currentDocument: structuredClone(request?.currentDocument ?? {}),
        entity: structuredClone(entity),
        positionId: String(request?.positionId ?? ""),
      });
      const eligibility =
        typeof eligibilityResult === "boolean"
          ? { eligible: eligibilityResult, reason: "" }
          : {
              eligible: eligibilityResult?.eligible === true,
              reason: String(eligibilityResult?.reason ?? ""),
            };
      if (!eligibility.eligible) {
        return {
          recognized: true,
          valid: false,
          parsed,
          entity_type: resolver.entity_type,
          entity,
          eligibility,
          diagnostics: [
            problem(
              governedEntityReferenceRuleIds.ineligibleEntity,
              eligibility.reason ||
                `Governed entity ${parsed.id} is not eligible in the current document.`,
              parsed.id,
            ),
          ],
        };
      }

      const canonicalPayload = serializeGovernedReferencePayload(entity);
      const diagnostics = [];
      if (parsed.title !== String(entity.title)) {
        diagnostics.push(
          problem(
            governedEntityReferenceRuleIds.titleDivergence,
            `Governed entity reference title must equal ${JSON.stringify(
              String(entity.title),
            )}.`,
            parsed.id,
          ),
        );
      }

      return {
        recognized: true,
        valid: diagnostics.length === 0,
        parsed,
        entity_type: resolver.entity_type,
        entity,
        eligibility,
        canonical_payload: canonicalPayload,
        diagnostics: stableProblems(diagnostics),
      };
    },
  };
}

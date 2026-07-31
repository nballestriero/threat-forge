import fs from "node:fs";
import path from "node:path";

import { readGovernedYamlFile } from "./governed-yaml.mjs";
import {
  loadGovernedDocumentModelSourceSet,
  validateGovernedDocumentModelSourceSet,
} from "./governed-document-model-sources.mjs";
import {
  createDiagnostic,
  extractCollectionRecordFieldOrders,
  extractTopLevelYamlFieldOrder,
  parseMarkdownDocument,
  readUtf8,
  resolveSafeProjectPath,
  sortDiagnostics,
  validateSectionContent,
} from "./governed-document-model-validation.mjs";

/**
 * @file Complete Security Requirement model validation core.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Validates the inactive Security Requirement source scaffold and any authored
 * Security Requirement registry/body pairs through deterministic stable rules.
 * This microstep validates local structure, SEC identity, syntactic parent
 * coherence and governed-reference placement. Resolution and eligibility of
 * Functional parents and Common Findings remain owned by the cross-model
 * provider introduced in the following governed microstep.
 */

export const securityRequirementModelRuleIds = Object.freeze({
  registryRootFields: "security-requirement.registry.root.fields",
  registryRootIdentity: "security-requirement.registry.root.identity",
  registryRecordFields: "security-requirement.registry.record.fields",
  registryRecordOrder: "security-requirement.registry.record.order",
  registryIdentity: "security-requirement.registry.record.identity",
  registryControlledValue:
    "security-requirement.registry.record.controlled-value",
  registryOwner: "security-requirement.registry.record.owner",
  registryParent: "security-requirement.registry.record.parent",
  registryDerivedPath: "security-requirement.registry.record.derived-path",
  bodyHeader: "security-requirement.body.header.identity",
  bodySections: "security-requirement.body.section.structure",
  bodyContent: "security-requirement.body.section.content",
  bodyParentReference: "security-requirement.body.reference.parent",
  bodyFindingReference: "security-requirement.body.reference.finding",
  methodologyNeutrality: "security-requirement.body.methodology-neutrality",
  modelTitleMirror: "security-requirement.model.title.mirror",
});

export const inactiveSecurityRequirementModelProjectPath =
  "docs/reference/project-model/registers/document-models/models/security-requirement.model.yml";
export const inactiveSecurityRequirementBodyProfileProjectPath =
  "docs/reference/project-model/registers/document-models/profiles/security-requirement-body.profile.yml";

export const securityRequirementRegistryVariantExpectation = Object.freeze({
  id: "security-requirement",
  model_id: "security-requirement",
  discriminator_field: "requirement_type",
  discriminator_value: "security",
  fields: Object.freeze([
    Object.freeze({
      id: "security-requirement.registry.record.id",
      name: "id",
      order: 1,
      cardinality: "exactly_one",
      value_kind: "canonical_identifier",
      source_kind: "generated",
      pattern: "^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}SEC-\\d{4}$",
      mutable: false,
    }),
    Object.freeze({
      id: "security-requirement.registry.record.title",
      name: "title",
      order: 2,
      cardinality: "exactly_one",
      value_kind: "single_line_text",
      source_kind: "authored",
      terminal_punctuation: "forbidden",
      mirrors_member_id: "security-requirement.body.header.title",
    }),
    Object.freeze({
      id: "security-requirement.registry.record.status",
      name: "status",
      order: 3,
      cardinality: "exactly_one",
      value_kind: "controlled_scalar",
      source_kind: "controlled",
      value_set_id: "FIELD-VALUE-SET-0008",
    }),
    Object.freeze({
      id: "security-requirement.registry.record.requirement-type",
      name: "requirement_type",
      order: 4,
      cardinality: "exactly_one",
      value_kind: "controlled_scalar",
      source_kind: "controlled",
      value_set_id: "FIELD-VALUE-SET-0010",
      required_value: "security",
    }),
    Object.freeze({
      id: "security-requirement.registry.record.macro-requirement-id",
      name: "macro_requirement_id",
      order: 5,
      cardinality: "exactly_one",
      value_kind: "canonical_identifier",
      source_kind: "derived",
      pattern: "^MR-\\d{4}$",
      mutable: false,
    }),
    Object.freeze({
      id: "security-requirement.registry.record.decision-id",
      name: "decision_id",
      order: 6,
      cardinality: "exactly_one",
      value_kind: "canonical_identifier",
      source_kind: "derived",
      pattern: "^ADR-\\d{4}$",
      mutable: false,
    }),
    Object.freeze({
      id: "security-requirement.registry.record.parent-requirement-id",
      name: "parent_requirement_id",
      order: 7,
      cardinality: "exactly_one",
      value_kind: "canonical_identifier",
      source_kind: "authored_relation",
      pattern: "^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}$",
      parent_model_id: "functional-requirement",
      same_macro_requirement: true,
      same_decision: true,
      identity_prefix_required: true,
    }),
    Object.freeze({
      id: "security-requirement.registry.record.body-path",
      name: "body_path",
      order: 8,
      cardinality: "exactly_one",
      value_kind: "repository_relative_path",
      source_kind: "generated",
      template:
        "docs/reference/project-model/body/requirements/{macro_requirement_id}/{id}_body.md",
      mutable: false,
    }),
  ]),
});

function normalizeProjectPath(value) {
  return String(value ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//u, "")
    .trim();
}

function formatTemplate(template, values) {
  return String(template ?? "").replace(/\{([^}]+)\}/gu, (_, key) =>
    String(values[key] ?? `{${key}}`),
  );
}

function expectedNames(fields) {
  return [...(fields ?? [])]
    .sort((left, right) => left.order - right.order)
    .map((field) => field.name);
}

function sameArray(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function fieldsByName(variant) {
  return new Map((variant.fields ?? []).map((field) => [field.name, field]));
}

function push(diagnostics, ruleId, representation, sourcePath, location, message) {
  diagnostics.push(
    createDiagnostic(
      ruleId,
      "security-requirement",
      representation,
      sourcePath,
      location,
      message,
    ),
  );
}

function listRequirementRegistries(rootDir) {
  const directoryProjectPath =
    "docs/reference/project-model/registers/requirements";
  const resolved = resolveSafeProjectPath(rootDir, directoryProjectPath);

  if (!fs.existsSync(resolved.absolute)) {
    throw new Error(
      `Requirement registry directory is missing: ${directoryProjectPath}`,
    );
  }

  return fs
    .readdirSync(resolved.absolute, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        /^MR-\d{4}\.requirements\.registry\.yml$/u.test(entry.name),
    )
    .map((entry) => `${directoryProjectPath}/${entry.name}`)
    .sort((left, right) =>
      left.localeCompare(right, "en", {
        numeric: true,
        sensitivity: "base",
      }),
    );
}

function loadValueSets(sourceSet) {
  const taxonomyPath = resolveSafeProjectPath(
    sourceSet.rootDir,
    "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml",
  );
  const taxonomy = readGovernedYamlFile(taxonomyPath.absolute);

  return new Map(
    (taxonomy.field_value_sets ?? []).map((valueSet) => [
      String(valueSet.id),
      new Set((valueSet.values ?? []).map((entry) => String(entry.value))),
    ]),
  );
}

function loadMacroRequirementIds(rootDir) {
  const registryPath = resolveSafeProjectPath(
    rootDir,
    "docs/reference/project-model/registers/macro-requirements.registry.yml",
  );
  const registry = readGovernedYamlFile(registryPath.absolute);

  return new Set(
    (registry.macro_requirements ?? [])
      .map((record) => String(record.id ?? "").trim())
      .filter(Boolean),
  );
}

function loadDecisionKeys(rootDir) {
  const directoryProjectPath =
    "docs/reference/project-model/registers/decisions";
  const resolved = resolveSafeProjectPath(rootDir, directoryProjectPath);

  if (!fs.existsSync(resolved.absolute)) {
    throw new Error(`Decision registry directory is missing: ${directoryProjectPath}`);
  }

  const keys = new Set();
  for (const entry of fs.readdirSync(resolved.absolute, { withFileTypes: true })) {
    if (
      !entry.isFile() ||
      !/^MR-\d{4}\.decisions\.registry\.yml$/u.test(entry.name)
    ) {
      continue;
    }

    const registry = readGovernedYamlFile(path.join(resolved.absolute, entry.name));
    const macroRequirementId = String(registry.macro_requirement_id ?? "").trim();
    for (const decision of registry.decisions ?? []) {
      const decisionId = String(decision.id ?? "").trim();
      if (macroRequirementId && decisionId) {
        keys.add(`${macroRequirementId}/${decisionId}`);
      }
    }
  }
  return keys;
}

function aggregateSectionDiagnostics(
  diagnostics,
  section,
  sectionProfile,
  bodyPath,
) {
  const sectionDiagnostics = validateSectionContent(section, sectionProfile, {
    ruleId: securityRequirementModelRuleIds.bodyContent,
    modelId: "security-requirement",
    sourcePath: bodyPath,
  });

  if (sectionDiagnostics.length === 0) return;
  const messages = [...new Set(sectionDiagnostics.map((item) => item.message))]
    .sort();
  push(
    diagnostics,
    securityRequirementModelRuleIds.bodyContent,
    "markdown_body",
    bodyPath,
    `line:${section.line}`,
    messages.join(" "),
  );
}

function parseClassifiedReference(item, prefix) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = String(item ?? "")
    .trim()
    .match(new RegExp(`^${escapedPrefix}\\s+\\[([^\\]]+)\\]\\s+(.+)$`, "u"));
  return match
    ? { id: match[1].trim(), title: match[2].trim() }
    : null;
}

function validateParentReference(
  diagnostics,
  section,
  bodyPath,
  parentRequirementId,
) {
  const items = Array.isArray(section?.items) ? section.items : [];
  const references = items
    .map((item) => parseClassifiedReference(item, "Parent:"))
    .filter(Boolean);

  if (
    items.length !== 1 ||
    references.length !== 1 ||
    references[0].id !== parentRequirementId ||
    !/^MR-\d{4}ADR-\d{4}REQ-\d{4}$/u.test(references[0].id)
  ) {
    push(
      diagnostics,
      securityRequirementModelRuleIds.bodyParentReference,
      "markdown_body",
      bodyPath,
      section ? `line:${section.line}` : "$",
      "Parent Functional Requirement must contain exactly one canonical Parent reference matching parent_requirement_id.",
    );
  }
}

function validateFindingReferences(diagnostics, section, bodyPath) {
  const items = Array.isArray(section?.items) ? section.items : [];
  const references = items
    .map((item) => parseClassifiedReference(item, "Finding:"))
    .filter(Boolean);
  const identifiers = references.map((reference) => reference.id);

  if (
    items.length < 1 ||
    references.length !== items.length ||
    identifiers.some((identifier) => !/^FINDING-\d{4}$/u.test(identifier)) ||
    new Set(identifiers).size !== identifiers.length
  ) {
    push(
      diagnostics,
      securityRequirementModelRuleIds.bodyFindingReference,
      "markdown_body",
      bodyPath,
      section ? `line:${section.line}` : "$",
      "Finding derivation must contain one or more unique canonical Finding references.",
    );
  }
}

function validateMethodologyNeutrality(diagnostics, bodyText, bodyPath) {
  const forbidden = [
    "method_id",
    "method_payload",
    "applicability_rules",
    "failure_modes",
    "attack_classes",
    "plugin_diagnostics",
  ];
  const structuredLabel = /^\s*-\s*(?:Method|Method payload|Classification|Applicability rule|Failure mode|Attack class|Plugin diagnostic):/imu;
  const lower = String(bodyText ?? "").toLowerCase();
  const leaked = forbidden.find((token) => lower.includes(token));

  if (leaked || structuredLabel.test(bodyText)) {
    push(
      diagnostics,
      securityRequirementModelRuleIds.methodologyNeutrality,
      "markdown_body",
      bodyPath,
      "$",
      "Security Requirement sources must not contain methodology-specific fields, classifications or plugin diagnostics.",
    );
  }
}

function cloneSourceSet(sourceSet) {
  return structuredClone(sourceSet);
}

function replaceProfile(sourceSet, profileId, nextProfile) {
  const index = sourceSet.profiles.findIndex(
    (entry) => entry.value.profile_id === profileId,
  );
  if (index < 0) throw new Error(`Missing canonical profile ${profileId}.`);
  sourceSet.profiles[index] = {
    ...sourceSet.profiles[index],
    value: nextProfile,
  };
}

/**
 * Loads the active source set and overlays the inactive Security Requirement
 * model, body profile and expected Requirement variant for pre-activation tests.
 *
 * @param {{rootDir: string}} options - Repository root.
 * @returns {{sourceSet: Record<string, unknown>, activation_state: string, scaffold_sources_checked: string[]}}
 *   Augmented validation source set.
 */
export function loadSecurityRequirementValidationSourceSet(options = {}) {
  const active = loadGovernedDocumentModelSourceSet({ rootDir: options.rootDir });
  const activeSecurity = active.index.value.models.some(
    (entry) => entry.id === "security-requirement",
  );

  if (activeSecurity) {
    return {
      sourceSet: active,
      activation_state: "active",
      scaffold_sources_checked: [],
    };
  }

  const sourceSet = cloneSourceSet(active);
  const modelPath = resolveSafeProjectPath(
    sourceSet.rootDir,
    inactiveSecurityRequirementModelProjectPath,
  );
  const bodyProfilePath = resolveSafeProjectPath(
    sourceSet.rootDir,
    inactiveSecurityRequirementBodyProfileProjectPath,
  );

  if (!fs.existsSync(modelPath.absolute) || !fs.existsSync(bodyProfilePath.absolute)) {
    throw new Error("Inactive Security Requirement scaffold sources are missing.");
  }

  const model = readGovernedYamlFile(modelPath.absolute);
  const bodyProfile = readGovernedYamlFile(bodyProfilePath.absolute);
  const requirementProfileEntry = sourceSet.profiles.find(
    (entry) => entry.value.profile_id === "requirement-registry",
  );
  if (!requirementProfileEntry) {
    throw new Error("Canonical Requirement registry profile is missing.");
  }

  const requirementProfile = structuredClone(requirementProfileEntry.value);
  requirementProfile.applies_to_model_ids.push("security-requirement");
  requirementProfile.record_variants.push(
    structuredClone(securityRequirementRegistryVariantExpectation),
  );
  replaceProfile(sourceSet, "requirement-registry", requirementProfile);

  sourceSet.models.push({
    path: inactiveSecurityRequirementModelProjectPath,
    value: model,
  });
  sourceSet.profiles.push({
    path: inactiveSecurityRequirementBodyProfileProjectPath,
    value: bodyProfile,
  });
  sourceSet.index.value.models.push({
    id: "security-requirement",
    title: "Security Requirement",
    definition_path: inactiveSecurityRequirementModelProjectPath,
    registry_profile_id: "requirement-registry",
    body_profile_id: "security-requirement-body",
  });
  const requirementIndexProfile = sourceSet.index.value.representation_profiles.find(
    (entry) => entry.id === "requirement-registry",
  );
  requirementIndexProfile.applies_to_model_ids.push("security-requirement");
  sourceSet.index.value.representation_profiles.push({
    id: "security-requirement-body",
    title: "Security Requirement Markdown body",
    representation_kind: "markdown_body",
    profile_path: inactiveSecurityRequirementBodyProfileProjectPath,
    applies_to_model_ids: ["security-requirement"],
  });

  const sourceDiagnostics = validateGovernedDocumentModelSourceSet(sourceSet);
  if (sourceDiagnostics.length > 0) {
    throw new Error(
      sourceDiagnostics
        .map((diagnostic) => `${diagnostic.rule_id}: ${diagnostic.message}`)
        .join(" | "),
    );
  }

  return {
    sourceSet,
    activation_state: "inactive",
    scaffold_sources_checked: [
      inactiveSecurityRequirementModelProjectPath,
      inactiveSecurityRequirementBodyProfileProjectPath,
    ],
  };
}

/**
 * Validates the governed Security Requirement corpus and inactive scaffold.
 *
 * @param {{rootDir: string, sourceSet?: Record<string, unknown>, activationState?: string}}
 *   options - Validation options.
 * @returns {{model_id: string, activation_state: string, scaffold_sources_checked: string[], registry_paths: string[], records_checked: number, diagnostics: Array<Record<string, unknown>>}}
 *   Deterministic validation result.
 */
export function validateSecurityRequirementModel(options = {}) {
  const loaded = options.sourceSet
    ? {
        sourceSet: options.sourceSet,
        activation_state: options.activationState ?? "synthetic",
        scaffold_sources_checked: [],
      }
    : loadSecurityRequirementValidationSourceSet({ rootDir: options.rootDir });
  const sourceSet = loaded.sourceSet;
  const registryProfile = sourceSet.profiles.find(
    (entry) => entry.value.profile_id === "requirement-registry",
  )?.value;
  const bodyProfile = sourceSet.profiles.find(
    (entry) => entry.value.profile_id === "security-requirement-body",
  )?.value;
  const recordVariant = registryProfile?.record_variants?.find(
    (entry) => entry.model_id === "security-requirement",
  );

  if (!registryProfile || !bodyProfile || !recordVariant) {
    throw new Error("Canonical Security Requirement profiles are missing.");
  }

  const diagnostics = [];
  const registryPaths = listRequirementRegistries(sourceSet.rootDir);
  const macroRequirementIds = loadMacroRequirementIds(sourceSet.rootDir);
  const decisionKeys = loadDecisionKeys(sourceSet.rootDir);
  const valueSets = loadValueSets(sourceSet);
  const fieldDefinitions = fieldsByName(recordVariant);
  const expectedRoot = expectedNames(registryProfile.root_fields);
  const expectedRecord = expectedNames(recordVariant.fields);
  const expectedSections = [...bodyProfile.sections].sort(
    (left, right) => left.order - right.order,
  );
  const expectedHeadings = expectedSections.map((section) => section.heading);
  const requiredHeadings = expectedSections
    .filter((section) => section.cardinality === "exactly_one")
    .map((section) => section.heading);

  let recordsChecked = 0;
  const globalIds = new Set();

  for (const registryPath of registryPaths) {
    const resolvedRegistry = resolveSafeProjectPath(
      sourceSet.rootDir,
      registryPath,
    );
    const registryText = readUtf8(resolvedRegistry.absolute);
    const registry = readGovernedYamlFile(resolvedRegistry.absolute);
    const actualRoot = extractTopLevelYamlFieldOrder(registryText);

    if (!sameArray(actualRoot, expectedRoot)) {
      push(
        diagnostics,
        securityRequirementModelRuleIds.registryRootFields,
        "yaml_registry",
        registryPath,
        "$",
        `Root fields must appear exactly in canonical order: ${expectedRoot.join(", ")}. Found: ${actualRoot.join(", ")}.`,
      );
    }

    const fileName = path.posix.basename(registryPath);
    const pathMacroRequirementId =
      fileName.match(/^(MR-\d{4})\.requirements\.registry\.yml$/u)?.[1] ?? "";
    const rootMacroRequirementId = String(
      registry.macro_requirement_id ?? "",
    ).trim();
    const expectedRegistryId = formatTemplate(
      registryProfile.root_fields.find((field) => field.name === "registry_id")
        ?.template,
      { macro_requirement_id: rootMacroRequirementId },
    );

    if (
      !pathMacroRequirementId ||
      rootMacroRequirementId !== pathMacroRequirementId ||
      String(registry.registry_id ?? "") !== expectedRegistryId
    ) {
      push(
        diagnostics,
        securityRequirementModelRuleIds.registryRootIdentity,
        "yaml_registry",
        registryPath,
        "$",
        `Registry identity must be derived from ${pathMacroRequirementId || "<invalid-path>"}.`,
      );
    }

    const requirements = Array.isArray(registry.requirements)
      ? registry.requirements
      : [];
    const recordOrders = extractCollectionRecordFieldOrders(
      registryText,
      "requirements",
    );

    requirements.forEach((record, index) => {
      const recordId = String(record.id ?? "").trim();
      const securityIdentityCandidate =
        /^MR-\d{4}ADR-\d{4}REQ-\d{4}SEC-/u.test(recordId);
      if (
        record.requirement_type !== "security" &&
        !securityIdentityCandidate
      ) {
        return;
      }

      recordsChecked += 1;
      const sourceLocation = `$/requirements/${index}`;
      const actualNames = Object.keys(record);
      const missing = expectedRecord.filter(
        (name) => !Object.prototype.hasOwnProperty.call(record, name),
      );
      const unknown = actualNames.filter(
        (name) => !expectedRecord.includes(name),
      );

      if (missing.length || unknown.length) {
        push(
          diagnostics,
          securityRequirementModelRuleIds.registryRecordFields,
          "yaml_registry",
          registryPath,
          sourceLocation,
          `Record fields differ from the canonical security variant. Missing: ${missing.join(", ") || "none"}. Unknown: ${unknown.join(", ") || "none"}.`,
        );
      }

      if (
        recordOrders[index] &&
        !sameArray(recordOrders[index], expectedRecord)
      ) {
        push(
          diagnostics,
          securityRequirementModelRuleIds.registryRecordOrder,
          "yaml_registry",
          registryPath,
          sourceLocation,
          `Record fields must appear in canonical order: ${expectedRecord.join(", ")}.`,
        );
      }

      const id = String(record.id ?? "").trim();
      const idPattern = fieldDefinitions.get("id")?.pattern;
      const identity = id.match(
        /^(MR-\d{4})(ADR-\d{4})(REQ-\d{4})(SEC-\d{4})$/u,
      );

      if (
        !id ||
        (idPattern && !new RegExp(idPattern, "u").test(id)) ||
        globalIds.has(id)
      ) {
        push(
          diagnostics,
          securityRequirementModelRuleIds.registryIdentity,
          "yaml_registry",
          registryPath,
          `${sourceLocation}/id`,
          `Security Requirement id must be globally unique and match ${idPattern}.`,
        );
      }
      globalIds.add(id);

      for (const name of ["status", "requirement_type"]) {
        const definition = fieldDefinitions.get(name);
        const allowed = valueSets.get(definition?.value_set_id);
        const value = String(record[name] ?? "");
        if (
          definition &&
          (!allowed ||
            !allowed.has(value) ||
            (definition.required_value !== undefined &&
              value !== String(definition.required_value)))
        ) {
          push(
            diagnostics,
            securityRequirementModelRuleIds.registryControlledValue,
            "yaml_registry",
            registryPath,
            `${sourceLocation}/${name}`,
            `${name} must use the canonical Security Requirement value from ${definition.value_set_id}.`,
          );
        }
      }

      const recordMacroRequirementId = String(
        record.macro_requirement_id ?? "",
      ).trim();
      const recordDecisionId = String(record.decision_id ?? "").trim();
      const embeddedMacroRequirementId = identity?.[1] ?? "";
      const embeddedDecisionId = identity?.[2] ?? "";
      const decisionKey = `${recordMacroRequirementId}/${recordDecisionId}`;

      if (
        recordMacroRequirementId !== rootMacroRequirementId ||
        recordMacroRequirementId !== embeddedMacroRequirementId ||
        !macroRequirementIds.has(recordMacroRequirementId) ||
        recordDecisionId !== embeddedDecisionId ||
        !decisionKeys.has(decisionKey)
      ) {
        push(
          diagnostics,
          securityRequirementModelRuleIds.registryOwner,
          "logical_model",
          registryPath,
          sourceLocation,
          "Security Requirement ownership must match its registry, embedded identity and an existing Decision.",
        );
      }

      const recordParentRequirementId = String(
        record.parent_requirement_id ?? "",
      ).trim();
      const embeddedParentRequirementId = identity
        ? `${identity[1]}${identity[2]}${identity[3]}`
        : "";
      const parentPattern = fieldDefinitions.get("parent_requirement_id")?.pattern;
      if (
        !recordParentRequirementId ||
        (parentPattern &&
          !new RegExp(parentPattern, "u").test(recordParentRequirementId)) ||
        recordParentRequirementId !== embeddedParentRequirementId
      ) {
        push(
          diagnostics,
          securityRequirementModelRuleIds.registryParent,
          "logical_model",
          registryPath,
          `${sourceLocation}/parent_requirement_id`,
          "Security Requirement parent must be the Functional Requirement encoded by its SEC identity.",
        );
      }

      const bodyPathDefinition = fieldDefinitions.get("body_path");
      const expectedBodyPath = formatTemplate(bodyPathDefinition?.template, {
        id,
        macro_requirement_id: rootMacroRequirementId,
      });
      const bodyPath = normalizeProjectPath(record.body_path);

      if (bodyPath !== expectedBodyPath) {
        push(
          diagnostics,
          securityRequirementModelRuleIds.registryDerivedPath,
          "yaml_registry",
          registryPath,
          `${sourceLocation}/body_path`,
          `body_path must equal ${expectedBodyPath}.`,
        );
      }

      if (!bodyPath) return;
      let resolvedBody;
      try {
        resolvedBody = resolveSafeProjectPath(sourceSet.rootDir, bodyPath);
      } catch (error) {
        push(
          diagnostics,
          securityRequirementModelRuleIds.registryDerivedPath,
          "yaml_registry",
          registryPath,
          `${sourceLocation}/body_path`,
          error.message,
        );
        return;
      }

      if (!fs.existsSync(resolvedBody.absolute)) {
        push(
          diagnostics,
          securityRequirementModelRuleIds.registryDerivedPath,
          "yaml_registry",
          registryPath,
          `${sourceLocation}/body_path`,
          `Body file does not exist: ${bodyPath}.`,
        );
        return;
      }

      const bodyText = readUtf8(resolvedBody.absolute);
      const parsed = parseMarkdownDocument(bodyText);
      const expectedHeader = formatTemplate(bodyProfile.header.template, {
        id,
        title: record.title,
      });
      const expectedHeaderText = expectedHeader.replace(/^# /u, "");

      if (
        parsed.h1.length !== 1 ||
        parsed.h1[0].text !== expectedHeaderText
      ) {
        push(
          diagnostics,
          securityRequirementModelRuleIds.bodyHeader,
          "markdown_body",
          bodyPath,
          "$",
          `Body must contain exactly one canonical H1: ${expectedHeader}.`,
        );
      }

      const actualHeadings = parsed.sections.map((section) => section.heading);
      const missingHeadings = requiredHeadings.filter(
        (heading) => !actualHeadings.includes(heading),
      );
      const unknownHeadings = actualHeadings.filter(
        (heading) => !expectedHeadings.includes(heading),
      );
      const duplicateHeadings = actualHeadings.filter(
        (heading, position) => actualHeadings.indexOf(heading) !== position,
      );
      const canonicalPresentOrder = expectedHeadings.filter((heading) =>
        actualHeadings.includes(heading),
      );
      const actualCanonicalOrder = actualHeadings.filter((heading) =>
        expectedHeadings.includes(heading),
      );

      if (
        missingHeadings.length ||
        unknownHeadings.length ||
        duplicateHeadings.length ||
        !sameArray(actualCanonicalOrder, canonicalPresentOrder)
      ) {
        push(
          diagnostics,
          securityRequirementModelRuleIds.bodySections,
          "markdown_body",
          bodyPath,
          "$",
          `Body sections violate canonical order or cardinality. Missing: ${missingHeadings.join(", ") || "none"}. Unknown: ${unknownHeadings.join(", ") || "none"}. Duplicates: ${duplicateHeadings.join(", ") || "none"}.`,
        );
      }

      for (const sectionProfile of expectedSections) {
        const section = parsed.sections.find(
          (item) => item.heading === sectionProfile.heading,
        );
        if (!section) continue;
        aggregateSectionDiagnostics(
          diagnostics,
          section,
          sectionProfile,
          bodyPath,
        );
      }

      validateParentReference(
        diagnostics,
        parsed.sections.find(
          (section) => section.heading === "Parent Functional Requirement",
        ),
        bodyPath,
        recordParentRequirementId,
      );
      validateFindingReferences(
        diagnostics,
        parsed.sections.find(
          (section) => section.heading === "Finding derivation",
        ),
        bodyPath,
      );
      validateMethodologyNeutrality(diagnostics, bodyText, bodyPath);

      if (
        parsed.h1.length === 1 &&
        String(record.title ?? "").trim() &&
        !parsed.h1[0].text.endsWith(`— ${record.title}`)
      ) {
        push(
          diagnostics,
          securityRequirementModelRuleIds.modelTitleMirror,
          "logical_model",
          bodyPath,
          "line:1",
          "Body title must mirror the registry title exactly.",
        );
      }
    });
  }

  return {
    model_id: "security-requirement",
    activation_state: loaded.activation_state,
    scaffold_sources_checked: loaded.scaffold_sources_checked,
    registry_paths: registryPaths,
    records_checked: recordsChecked,
    diagnostics: sortDiagnostics(diagnostics),
  };
}

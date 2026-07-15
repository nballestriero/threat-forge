import fs from "node:fs";
import path from "node:path";

import { readGovernedYamlFile } from "./governed-yaml.mjs";
import { loadGovernedDocumentModelSourceSet } from "./governed-document-model-sources.mjs";
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
 * @file Complete Decision model validation core.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0002
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Validates every Decision registry and ADR Markdown body through the canonical
 * Decision model and profiles. Validation is side-effect free and returns
 * stable, deterministically ordered diagnostics for migration reports and gates.
 */

export const decisionModelRuleIds = Object.freeze({
  registryRootFields: "decision.registry.root.fields",
  registryRootIdentity: "decision.registry.root.identity",
  registryRecordFields: "decision.registry.record.fields",
  registryRecordOrder: "decision.registry.record.order",
  registryIdentity: "decision.registry.record.identity",
  registryControlledValue: "decision.registry.record.controlled-value",
  registryAuthorship: "decision.registry.record.authorship",
  registryDate: "decision.registry.record.date",
  registryOwner: "decision.registry.record.owner",
  registryDerivedPath: "decision.registry.record.derived-path",
  bodyHeader: "decision.body.header.identity",
  bodySections: "decision.body.section.structure",
  bodyContent: "decision.body.section.content",
  bodyStatusMirror: "decision.body.status.mirror",
  modelTitleMirror: "decision.model.title.mirror",
});

function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, "").trim();
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

function fieldsByName(profile) {
  return new Map((profile.record_fields ?? []).map((field) => [field.name, field]));
}

function push(diagnostics, ruleId, representation, sourcePath, location, message) {
  diagnostics.push(
    createDiagnostic(
      ruleId,
      "decision",
      representation,
      sourcePath,
      location,
      message,
    ),
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
      new Map(
        (valueSet.values ?? []).map((entry) => [
          String(entry.value),
          { ...entry },
        ]),
      ),
    ]),
  );
}

function listDecisionRegistries(rootDir) {
  const directoryProjectPath =
    "docs/reference/project-model/registers/decisions";
  const resolved = resolveSafeProjectPath(rootDir, directoryProjectPath);

  if (!fs.existsSync(resolved.absolute)) {
    throw new Error(`Decision registry directory is missing: ${directoryProjectPath}`);
  }

  return fs
    .readdirSync(resolved.absolute, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        /^MR-\d{4}\.decisions\.registry\.yml$/u.test(entry.name),
    )
    .map((entry) => `${directoryProjectPath}/${entry.name}`)
    .sort((left, right) =>
      left.localeCompare(right, "en", {
        numeric: true,
        sensitivity: "base",
      }),
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

function aggregateSectionDiagnostics(
  diagnostics,
  section,
  sectionProfile,
  bodyPath,
) {
  const sectionDiagnostics = validateSectionContent(section, sectionProfile, {
    ruleId: decisionModelRuleIds.bodyContent,
    modelId: "decision",
    sourcePath: bodyPath,
  });

  if (sectionDiagnostics.length === 0) return;

  const messages = [
    ...new Set(sectionDiagnostics.map((item) => item.message)),
  ].sort();

  push(
    diagnostics,
    decisionModelRuleIds.bodyContent,
    "markdown_body",
    bodyPath,
    `line:${section.line}`,
    messages.join(" "),
  );
}

/**
 * Validates the complete governed Decision corpus.
 *
 * @param {{
 *   rootDir: string,
 *   sourceSet?: Record<string, unknown>
 * }} options - Validation options.
 * @returns {{
 *   model_id: string,
 *   registry_paths: string[],
 *   records_checked: number,
 *   diagnostics: Array<Record<string, unknown>>
 * }} Deterministic validation result.
 */
export function validateDecisionModel(options = {}) {
  const rootDir = options.rootDir;
  const sourceSet =
    options.sourceSet ?? loadGovernedDocumentModelSourceSet({ rootDir });

  const registryProfile = sourceSet.profiles.find(
    (entry) => entry.value.profile_id === "decision-registry",
  )?.value;
  const bodyProfile = sourceSet.profiles.find(
    (entry) => entry.value.profile_id === "decision-body",
  )?.value;

  if (!registryProfile || !bodyProfile) {
    throw new Error("Canonical Decision profiles are missing.");
  }

  const diagnostics = [];
  const registryPaths = listDecisionRegistries(sourceSet.rootDir);
  const macroRequirementIds = loadMacroRequirementIds(sourceSet.rootDir);
  const valueSets = loadValueSets(sourceSet);
  const fieldDefinitions = fieldsByName(registryProfile);
  const expectedRoot = expectedNames(registryProfile.root_fields);
  const expectedRecord = expectedNames(registryProfile.record_fields);
  const expectedSections = [...bodyProfile.sections].sort(
    (left, right) => left.order - right.order,
  );
  const expectedHeadings = expectedSections.map((section) => section.heading);
  const requiredHeadings = expectedSections
    .filter((section) => section.cardinality === "exactly_one")
    .map((section) => section.heading);

  let recordsChecked = 0;

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
        decisionModelRuleIds.registryRootFields,
        "yaml_registry",
        registryPath,
        "$",
        `Root fields must appear exactly in canonical order: ${expectedRoot.join(", ")}. Found: ${actualRoot.join(", ")}.`,
      );
    }

    const fileName = path.posix.basename(registryPath);
    const pathMacroRequirementId =
      fileName.match(/^(MR-\d{4})\.decisions\.registry\.yml$/u)?.[1] ?? "";
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
        decisionModelRuleIds.registryRootIdentity,
        "yaml_registry",
        registryPath,
        "$",
        `Registry identity must be derived from ${pathMacroRequirementId || "<invalid-path>"}.`,
      );
    }

    if (!macroRequirementIds.has(rootMacroRequirementId)) {
      push(
        diagnostics,
        decisionModelRuleIds.registryOwner,
        "logical_model",
        registryPath,
        "$/macro_requirement_id",
        `Decision registry references unknown Macro-requirement ${rootMacroRequirementId || "<empty>"}.`,
      );
    }

    const records = Array.isArray(registry.decisions)
      ? registry.decisions
      : [];
    const recordOrders = extractCollectionRecordFieldOrders(
      registryText,
      "decisions",
    );
    const ids = new Set();

    records.forEach((record, index) => {
      recordsChecked += 1;
      const sourceLocation = `$/decisions/${index}`;
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
          decisionModelRuleIds.registryRecordFields,
          "yaml_registry",
          registryPath,
          sourceLocation,
          `Record fields differ from the canonical profile. Missing: ${missing.join(", ") || "none"}. Unknown: ${unknown.join(", ") || "none"}.`,
        );
      }

      if (
        recordOrders[index] &&
        !sameArray(recordOrders[index], expectedRecord)
      ) {
        push(
          diagnostics,
          decisionModelRuleIds.registryRecordOrder,
          "yaml_registry",
          registryPath,
          sourceLocation,
          `Record fields must appear in canonical order: ${expectedRecord.join(", ")}.`,
        );
      }

      const id = String(record.id ?? "").trim();
      const idPattern = fieldDefinitions.get("id")?.pattern;
      if (
        !id ||
        (idPattern && !new RegExp(idPattern, "u").test(id)) ||
        ids.has(id)
      ) {
        push(
          diagnostics,
          decisionModelRuleIds.registryIdentity,
          "yaml_registry",
          registryPath,
          `${sourceLocation}/id`,
          `Decision id must be unique in its Macro-requirement and match ${idPattern}.`,
        );
      }
      ids.add(id);

      for (const name of ["status", "decision_type"]) {
        const definition = fieldDefinitions.get(name);
        const allowed = valueSets.get(definition?.value_set_id);
        if (
          definition &&
          (!allowed || !allowed.has(String(record[name] ?? "")))
        ) {
          push(
            diagnostics,
            decisionModelRuleIds.registryControlledValue,
            "yaml_registry",
            registryPath,
            `${sourceLocation}/${name}`,
            `${name} must use a value from ${definition.value_set_id}.`,
          );
        }
      }

      if (!String(record.author ?? "").trim()) {
        push(
          diagnostics,
          decisionModelRuleIds.registryAuthorship,
          "yaml_registry",
          registryPath,
          `${sourceLocation}/author`,
          "Decision author must be a non-empty single-line value.",
        );
      }

      const date = String(record.date ?? "").trim();
      const datePattern = fieldDefinitions.get("date")?.pattern;
      if (
        !date ||
        (datePattern && !new RegExp(datePattern, "u").test(date))
      ) {
        push(
          diagnostics,
          decisionModelRuleIds.registryDate,
          "yaml_registry",
          registryPath,
          `${sourceLocation}/date`,
          `Decision date must match ${datePattern}.`,
        );
      }

      const recordMacroRequirementId = String(
        record.macro_requirement_id ?? "",
      ).trim();
      if (
        recordMacroRequirementId !== rootMacroRequirementId ||
        !macroRequirementIds.has(recordMacroRequirementId)
      ) {
        push(
          diagnostics,
          decisionModelRuleIds.registryOwner,
          "logical_model",
          registryPath,
          `${sourceLocation}/macro_requirement_id`,
          `Decision must belong to registry owner ${rootMacroRequirementId}.`,
        );
      }

      const bodyPathDefinition = fieldDefinitions.get("body_path");
      const expectedBodyPath = formatTemplate(
        bodyPathDefinition?.template,
        {
          id,
          macro_requirement_id: rootMacroRequirementId,
        },
      );
      const bodyPath = normalizeProjectPath(record.body_path);

      if (bodyPath !== expectedBodyPath) {
        push(
          diagnostics,
          decisionModelRuleIds.registryDerivedPath,
          "yaml_registry",
          registryPath,
          `${sourceLocation}/body_path`,
          `body_path must equal ${expectedBodyPath}.`,
        );
      }

      if (!bodyPath) return;

      let resolvedBody;
      try {
        resolvedBody = resolveSafeProjectPath(
          sourceSet.rootDir,
          bodyPath,
        );
      } catch (error) {
        push(
          diagnostics,
          decisionModelRuleIds.registryDerivedPath,
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
          decisionModelRuleIds.registryDerivedPath,
          "yaml_registry",
          registryPath,
          `${sourceLocation}/body_path`,
          `Body file does not exist: ${bodyPath}.`,
        );
        return;
      }

      const parsed = parseMarkdownDocument(readUtf8(resolvedBody.absolute));
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
          decisionModelRuleIds.bodyHeader,
          "markdown_body",
          bodyPath,
          "$",
          `Body must contain exactly one canonical H1: ${expectedHeader}.`,
        );
      }

      const actualHeadings = parsed.sections.map(
        (section) => section.heading,
      );
      const missingHeadings = requiredHeadings.filter(
        (heading) => !actualHeadings.includes(heading),
      );
      const unknownHeadings = actualHeadings.filter(
        (heading) => !expectedHeadings.includes(heading),
      );
      const duplicateHeadings = actualHeadings.filter(
        (heading, position) =>
          actualHeadings.indexOf(heading) !== position,
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
          decisionModelRuleIds.bodySections,
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

      const statusSection = parsed.sections.find(
        (section) => section.heading === "Status",
      );
      if (statusSection) {
        const statusValue = String(record.status ?? "");
        const statusDefinition = fieldDefinitions.get("status");
        const expectedLabel =
          valueSets
            .get(statusDefinition?.value_set_id)
            ?.get(statusValue)?.label ?? "";

        if (
          !expectedLabel ||
          statusSection.text.trim() !== expectedLabel
        ) {
          push(
            diagnostics,
            decisionModelRuleIds.bodyStatusMirror,
            "logical_model",
            bodyPath,
            `line:${statusSection.line}`,
            `Status section must equal the controlled label ${JSON.stringify(expectedLabel || statusValue)} for registry value ${JSON.stringify(statusValue)}.`,
          );
        }
      }

      if (
        parsed.h1.length === 1 &&
        String(record.title ?? "").trim() &&
        !parsed.h1[0].text.endsWith(`— ${record.title}`)
      ) {
        push(
          diagnostics,
          decisionModelRuleIds.modelTitleMirror,
          "logical_model",
          bodyPath,
          "line:1",
          "Body title must mirror the registry title exactly.",
        );
      }
    });
  }

  return {
    model_id: "decision",
    registry_paths: registryPaths,
    records_checked: recordsChecked,
    diagnostics: sortDiagnostics(diagnostics),
  };
}

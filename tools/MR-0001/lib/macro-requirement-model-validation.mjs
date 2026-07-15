import fs from "node:fs";
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
 * @file Complete Macro-requirement model validation core.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0002
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Validates Macro-requirement registry records and Markdown bodies through the
 * canonical model and profiles. It is side-effect free and returns stable,
 * deterministically ordered diagnostics suitable for migration reports and gates.
 */

export const macroRequirementModelRuleIds = Object.freeze({
  registryRootFields: "macro-requirement.registry.root.fields",
  registryRecordFields: "macro-requirement.registry.record.fields",
  registryRecordOrder: "macro-requirement.registry.record.order",
  registryIdentity: "macro-requirement.registry.record.identity",
  registryControlledValue: "macro-requirement.registry.record.controlled-value",
  registryDerivedPath: "macro-requirement.registry.record.derived-path",
  registryChildRegistry: "macro-requirement.registry.record.child-registry",
  bodyHeader: "macro-requirement.body.header.identity",
  bodySections: "macro-requirement.body.section.structure",
  bodyContent: "macro-requirement.body.section.content",
  modelTitleMirror: "macro-requirement.model.title.mirror",
});

function formatTemplate(template, values) {
  return String(template ?? "").replace(/\{([^}]+)\}/gu, (_, key) => String(values[key] ?? `{${key}}`));
}
function fieldsByName(profile) { return new Map((profile.record_fields ?? []).map((field) => [field.name, field])); }
function valueSetMap(sourceSet) {
  const taxonomy = readGovernedYamlFile(resolveSafeProjectPath(sourceSet.rootDir, "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml").absolute);
  return new Map((taxonomy.field_value_sets ?? []).map((valueSet) => [String(valueSet.id), new Set((valueSet.values ?? []).map((entry) => String(entry.value)))]));
}
function expectedNames(fields) { return (fields ?? []).sort((a,b)=>a.order-b.order).map((field)=>field.name); }
function sameArray(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function push(diagnostics, ruleId, representation, sourcePath, location, message) { diagnostics.push(createDiagnostic(ruleId, "macro-requirement", representation, sourcePath, location, message)); }

export function validateMacroRequirementModel(options = {}) {
  const rootDir = options.rootDir;
  const sourceSet = options.sourceSet ?? loadGovernedDocumentModelSourceSet({ rootDir });
  const profile = sourceSet.profiles.find((entry) => entry.value.profile_id === "macro-requirement-registry")?.value;
  const bodyProfile = sourceSet.profiles.find((entry) => entry.value.profile_id === "macro-requirement-body")?.value;
  if (!profile || !bodyProfile) throw new Error("Canonical Macro-requirement profiles are missing.");
  const registryPath = profile.source_path;
  const registryResolved = resolveSafeProjectPath(sourceSet.rootDir, registryPath);
  const registryText = readUtf8(registryResolved.absolute);
  const registry = readGovernedYamlFile(registryResolved.absolute);
  const diagnostics = [];
  const expectedRoot = expectedNames(profile.root_fields);
  const actualRoot = extractTopLevelYamlFieldOrder(registryText);
  if (!sameArray(actualRoot, expectedRoot)) push(diagnostics, macroRequirementModelRuleIds.registryRootFields, "yaml_registry", registryPath, "$", `Root fields must appear exactly in canonical order: ${expectedRoot.join(", ")}. Found: ${actualRoot.join(", ")}.`);
  const expectedRecord = expectedNames(profile.record_fields);
  const recordOrders = extractCollectionRecordFieldOrders(registryText, "macro_requirements");
  const records = Array.isArray(registry.macro_requirements) ? registry.macro_requirements : [];
  const fieldDefinitions = fieldsByName(profile);
  const valueSets = valueSetMap(sourceSet);
  const ids = new Set();
  records.forEach((record, index) => {
    const sourceLocation = `$/macro_requirements/${index}`;
    const actualNames = Object.keys(record);
    const missing = expectedRecord.filter((name) => !Object.prototype.hasOwnProperty.call(record, name));
    const unknown = actualNames.filter((name) => !expectedRecord.includes(name));
    if (missing.length || unknown.length) push(diagnostics, macroRequirementModelRuleIds.registryRecordFields, "yaml_registry", registryPath, sourceLocation, `Record fields differ from the canonical profile. Missing: ${missing.join(", ") || "none"}. Unknown: ${unknown.join(", ") || "none"}.`);
    if (recordOrders[index] && !sameArray(recordOrders[index], expectedRecord)) push(diagnostics, macroRequirementModelRuleIds.registryRecordOrder, "yaml_registry", registryPath, sourceLocation, `Record fields must appear in canonical order: ${expectedRecord.join(", ")}.`);
    const id = String(record.id ?? "");
    const idPattern = fieldDefinitions.get("id")?.pattern;
    if (!id || (idPattern && !new RegExp(idPattern, "u").test(id)) || ids.has(id)) push(diagnostics, macroRequirementModelRuleIds.registryIdentity, "yaml_registry", registryPath, `${sourceLocation}/id`, `Macro-requirement id must be unique and match ${idPattern}.`);
    ids.add(id);
    for (const name of ["status", "macro_requirement_type"]) {
      const definition = fieldDefinitions.get(name);
      const allowed = valueSets.get(definition?.value_set_id);
      if (definition && (!allowed || !allowed.has(String(record[name] ?? "")))) push(diagnostics, macroRequirementModelRuleIds.registryControlledValue, "yaml_registry", registryPath, `${sourceLocation}/${name}`, `${name} must use a value from ${definition.value_set_id}.`);
    }
    const values = { ...record, id };
    for (const name of ["body_path", "decisions_registry_path", "requirements_registry_path"]) {
      const definition = fieldDefinitions.get(name);
      const expected = formatTemplate(definition?.template, values);
      if (definition && String(record[name] ?? "") !== expected) push(diagnostics, macroRequirementModelRuleIds.registryDerivedPath, "yaml_registry", registryPath, `${sourceLocation}/${name}`, `${name} must equal ${expected}.`);
    }
    for (const name of ["decisions_registry_path", "requirements_registry_path"]) {
      const projectPath = String(record[name] ?? "");
      if (projectPath) {
        try { if (!fs.existsSync(resolveSafeProjectPath(sourceSet.rootDir, projectPath).absolute)) push(diagnostics, macroRequirementModelRuleIds.registryChildRegistry, "yaml_registry", registryPath, `${sourceLocation}/${name}`, `Required child registry does not exist: ${projectPath}.`); }
        catch (error) { push(diagnostics, macroRequirementModelRuleIds.registryChildRegistry, "yaml_registry", registryPath, `${sourceLocation}/${name}`, error.message); }
      }
    }
    const bodyPath = String(record.body_path ?? "");
    if (!bodyPath) return;
    let bodyResolved;
    try { bodyResolved = resolveSafeProjectPath(sourceSet.rootDir, bodyPath); }
    catch (error) { push(diagnostics, macroRequirementModelRuleIds.registryDerivedPath, "yaml_registry", registryPath, `${sourceLocation}/body_path`, error.message); return; }
    if (!fs.existsSync(bodyResolved.absolute)) { push(diagnostics, macroRequirementModelRuleIds.registryDerivedPath, "yaml_registry", registryPath, `${sourceLocation}/body_path`, `Body file does not exist: ${bodyPath}.`); return; }
    const parsed = parseMarkdownDocument(readUtf8(bodyResolved.absolute));
    const expectedHeader = formatTemplate(bodyProfile.header.template, { id, title: record.title });
    if (parsed.h1.length !== 1 || parsed.h1[0].text !== expectedHeader.replace(/^# /u, "")) push(diagnostics, macroRequirementModelRuleIds.bodyHeader, "markdown_body", bodyPath, "$", `Body must contain exactly one canonical H1: ${expectedHeader}.`);
    const expectedSections = [...bodyProfile.sections].sort((a,b)=>a.order-b.order);
    const expectedHeadings = expectedSections.map((section) => section.heading);
    const actualHeadings = parsed.sections.map((section) => section.heading);
    const required = expectedSections.filter((section)=>section.cardinality === "exactly_one").map((section)=>section.heading);
    const missingHeadings = required.filter((heading)=>!actualHeadings.includes(heading));
    const unknownHeadings = actualHeadings.filter((heading)=>!expectedHeadings.includes(heading));
    const duplicateHeadings = actualHeadings.filter((heading, position)=>actualHeadings.indexOf(heading)!==position);
    const canonicalPresentOrder = expectedHeadings.filter((heading)=>actualHeadings.includes(heading));
    const actualCanonicalOrder = actualHeadings.filter((heading)=>expectedHeadings.includes(heading));
    if (missingHeadings.length || unknownHeadings.length || duplicateHeadings.length || !sameArray(actualCanonicalOrder, canonicalPresentOrder)) push(diagnostics, macroRequirementModelRuleIds.bodySections, "markdown_body", bodyPath, "$", `Body sections violate canonical order or cardinality. Missing: ${missingHeadings.join(", ") || "none"}. Unknown: ${unknownHeadings.join(", ") || "none"}. Duplicates: ${duplicateHeadings.join(", ") || "none"}.`);
    for (const sectionProfile of expectedSections) {
      const section = parsed.sections.find((item)=>item.heading===sectionProfile.heading);
      if (!section) continue;
      diagnostics.push(...validateSectionContent(section, sectionProfile, { ruleId: macroRequirementModelRuleIds.bodyContent, modelId: "macro-requirement", sourcePath: bodyPath }));
    }
    if (parsed.h1.length === 1 && String(record.title ?? "") && !parsed.h1[0].text.endsWith(`— ${record.title}`)) push(diagnostics, macroRequirementModelRuleIds.modelTitleMirror, "logical_model", bodyPath, "line:1", `Body title must mirror the registry title exactly.`);
  });
  return { model_id: "macro-requirement", registry_path: registryPath, records_checked: records.length, diagnostics: sortDiagnostics(diagnostics) };
}

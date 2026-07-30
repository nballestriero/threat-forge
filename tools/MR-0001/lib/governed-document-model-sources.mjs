import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGovernedYamlFile } from "./governed-yaml.mjs";

/**
 * @file Shared loader and validator for canonical governed document model sources.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0007
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Loads the governed source schema, canonical model index, the model and
 * representation-profile definitions referenced by that index, and controlled
 * value-set identities. It also derives the canonical Requirement discriminator,
 * model, identity and parent metadata used by generic consumers. Validation is
 * side-effect free and returns deterministic diagnostics with stable rule ids
 * without imposing consumer-local cardinalities.
 */

const modulePath = fileURLToPath(import.meta.url);
const defaultRootDir = path.resolve(path.dirname(modulePath), "..", "..", "..");
export const documentModelIndexProjectPath = "docs/reference/project-model/registers/document-models/document-models.registry.yml";
export const documentModelSchemaProjectPath = "docs/reference/project-model/contracts/governed-document-model-source.schema.json";
export const documentationFieldValuesProjectPath = "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml";

const RULE = Object.freeze({
  schema: "document-model.source.schema.structure",
  unique: "document-model.source.identifier.unique",
  path: "document-model.source.path.resolution",
  modelProfile: "document-model.source.model.profile-reference",
  profileModel: "document-model.source.profile.model-reference",
  representation: "document-model.source.profile.representation-kind",
  member: "document-model.source.member.reference",
  order: "document-model.source.order.deterministic",
  valueSet: "document-model.source.value-set.reference",
  duplicatedValues: "document-model.source.value-set.no-duplication",
});
export const governedDocumentModelSourceRuleIds = Object.freeze(Object.values(RULE));

const CONSUMER_COVERAGE_RULE = Object.freeze({
  duplicate: "document-model.consumer.provider.duplicate",
  missing: "document-model.consumer.provider.missing",
  unregistered: "document-model.consumer.provider.unregistered",
});
export const governedDocumentModelConsumerCoverageRuleIds = Object.freeze(
  Object.values(CONSUMER_COVERAGE_RULE),
);

const REQUIREMENT_VARIANT_DISPATCH_RULE = Object.freeze({
  variantMissing: "document-model.requirement-variant.variant.missing",
  variantDuplicate: "document-model.requirement-variant.variant.duplicate",
  discriminatorInvalid: "document-model.requirement-variant.discriminator.invalid",
  discriminatorDuplicate: "document-model.requirement-variant.discriminator.duplicate",
  identityPatternInvalid: "document-model.requirement-variant.identity-pattern.invalid",
  parentModelUnregistered: "document-model.requirement-variant.parent-model.unregistered",
  unknownType: "document-model.requirement-variant.type.unknown",
});
export const governedRequirementVariantDispatchRuleIds = Object.freeze(
  Object.values(REQUIREMENT_VARIANT_DISPATCH_RULE),
);

function clone(value) { return structuredClone(value); }
function object(value) { return value && typeof value === "object" && !Array.isArray(value); }
function text(value) { return typeof value === "string" && value.trim() ? value.trim() : ""; }
function pointer(parent, key) { return `${parent}/${String(key).replaceAll("~", "~0").replaceAll("/", "~1")}`; }
function diagnostic(ruleId, sourcePath, location, message) { return { rule_id: ruleId, source_path: sourcePath, location, message }; }
function sortDiagnostics(values) { return values.sort((a,b)=>`${a.source_path}|${a.location}|${a.rule_id}|${a.message}`.localeCompare(`${b.source_path}|${b.location}|${b.rule_id}|${b.message}`,"en",{numeric:true})); }


export function canonicalGovernedDocumentModelIds(sourceSet) {
  return (sourceSet?.index?.value?.models ?? [])
    .map((entry) => text(entry?.id))
    .filter(Boolean);
}

export function validateGovernedDocumentModelConsumerCoverage(input) {
  const consumerId = text(input?.consumerId) || "<unknown-consumer>";
  const sourceSet = input?.sourceSet;
  const sourcePath = sourceSet?.index?.path ?? documentModelIndexProjectPath;
  const canonicalIds = canonicalGovernedDocumentModelIds(sourceSet);
  const providerIds = Array.isArray(input?.providerModelIds)
    ? input.providerModelIds.map((value) => text(value)).filter(Boolean)
    : [];
  const diagnostics = [];
  const canonicalSet = new Set(canonicalIds);
  const providerSet = new Set();

  for (const modelId of providerIds) {
    if (providerSet.has(modelId)) {
      diagnostics.push(
        diagnostic(
          CONSUMER_COVERAGE_RULE.duplicate,
          sourcePath,
          "$/models",
          `Consumer ${consumerId} declares duplicate provider model id ${modelId}.`,
        ),
      );
    }
    providerSet.add(modelId);
  }
  for (const modelId of canonicalIds) {
    if (!providerSet.has(modelId)) {
      diagnostics.push(
        diagnostic(
          CONSUMER_COVERAGE_RULE.missing,
          sourcePath,
          "$/models",
          `Consumer ${consumerId} has no provider for canonical model ${modelId}.`,
        ),
      );
    }
  }
  for (const modelId of providerSet) {
    if (!canonicalSet.has(modelId)) {
      diagnostics.push(
        diagnostic(
          CONSUMER_COVERAGE_RULE.unregistered,
          sourcePath,
          "$/models",
          `Consumer ${consumerId} declares provider for unregistered model ${modelId}.`,
        ),
      );
    }
  }
  return sortDiagnostics(diagnostics);
}

export function assertGovernedDocumentModelConsumerCoverage(input) {
  const diagnostics = validateGovernedDocumentModelConsumerCoverage(input);
  if (diagnostics.length > 0) {
    throw new Error(
      diagnostics
        .map((entry) => `${entry.rule_id}: ${entry.message}`)
        .join(" | "),
    );
  }
}

function requirementVariantDispatchError(ruleId, message) {
  const error = new Error(`${ruleId}: ${message}`);
  error.code = ruleId;
  return error;
}

/**
 * Builds the canonical dispatch for governed Requirement record variants.
 *
 * @param {Record<string, unknown>} sourceSet - Valid canonical model source set.
 * @returns {{variants: ReadonlyArray<Record<string, unknown>>, by_requirement_type: Readonly<Record<string, Record<string, unknown>>>, by_model_id: Readonly<Record<string, Record<string, unknown>>>}}
 */
export function buildGovernedRequirementVariantDispatch(sourceSet) {
  const activeModelIds = canonicalGovernedDocumentModelIds(sourceSet);
  const activeModelIdSet = new Set(activeModelIds);
  const profileById = new Map(
    (sourceSet?.profiles ?? []).map((entry) => [text(entry?.value?.profile_id), entry]),
  );
  const variants = [];
  const byRequirementType = {};
  const byModelId = {};

  for (const modelEntry of sourceSet?.index?.value?.models ?? []) {
    const modelId = text(modelEntry?.id);
    const registryProfileId = text(modelEntry?.registry_profile_id);
    const profileEntry = profileById.get(registryProfileId);
    const recordVariants = profileEntry?.value?.record_variants;
    if (!Array.isArray(recordVariants)) continue;

    const requirementVariants = recordVariants.filter(
      (variant) => text(variant?.discriminator_field) === "requirement_type",
    );
    if (requirementVariants.length === 0) continue;

    const matchingVariants = requirementVariants.filter(
      (variant) => text(variant?.model_id) === modelId,
    );
    if (matchingVariants.length === 0) {
      throw requirementVariantDispatchError(
        REQUIREMENT_VARIANT_DISPATCH_RULE.variantMissing,
        `Canonical Requirement model ${modelId} has no requirement_type record variant in ${registryProfileId}.`,
      );
    }
    if (matchingVariants.length > 1) {
      throw requirementVariantDispatchError(
        REQUIREMENT_VARIANT_DISPATCH_RULE.variantDuplicate,
        `Canonical Requirement model ${modelId} has multiple requirement_type record variants in ${registryProfileId}.`,
      );
    }

    const variant = matchingVariants[0];
    const requirementType = text(variant?.discriminator_value);
    const fields = Array.isArray(variant?.fields) ? variant.fields : [];
    const discriminatorField = fields.find(
      (field) => text(field?.name) === "requirement_type",
    );
    if (
      !requirementType ||
      text(discriminatorField?.required_value) !== requirementType
    ) {
      throw requirementVariantDispatchError(
        REQUIREMENT_VARIANT_DISPATCH_RULE.discriminatorInvalid,
        `Requirement variant ${text(variant?.id) || modelId} must declare one requirement_type field whose required_value equals its discriminator_value.`,
      );
    }
    if (Object.prototype.hasOwnProperty.call(byRequirementType, requirementType)) {
      throw requirementVariantDispatchError(
        REQUIREMENT_VARIANT_DISPATCH_RULE.discriminatorDuplicate,
        `Requirement discriminator ${requirementType} maps to both ${byRequirementType[requirementType].model_id} and ${modelId}.`,
      );
    }

    const identityField = fields.find((field) => text(field?.name) === "id");
    const identityPattern = text(identityField?.pattern);
    try {
      if (!identityPattern) throw new Error("missing pattern");
      new RegExp(identityPattern, "u");
    } catch {
      throw requirementVariantDispatchError(
        REQUIREMENT_VARIANT_DISPATCH_RULE.identityPatternInvalid,
        `Requirement variant ${text(variant?.id) || modelId} must declare a valid canonical id pattern.`,
      );
    }

    const parentField = fields.find(
      (field) => text(field?.name) === "parent_requirement_id",
    );
    const parentModelId = text(parentField?.parent_model_id);
    if (parentModelId && !activeModelIdSet.has(parentModelId)) {
      throw requirementVariantDispatchError(
        REQUIREMENT_VARIANT_DISPATCH_RULE.parentModelUnregistered,
        `Requirement variant ${text(variant?.id) || modelId} references unregistered parent model ${parentModelId}.`,
      );
    }

    const projected = Object.freeze({
      variant_id: text(variant?.id),
      model_id: modelId,
      registry_profile_id: registryProfileId,
      discriminator_field: "requirement_type",
      discriminator_value: requirementType,
      identity_pattern: identityPattern,
      field_names: Object.freeze(
        [...fields]
          .sort((left, right) => Number(left?.order ?? 0) - Number(right?.order ?? 0))
          .map((field) => text(field?.name))
          .filter(Boolean),
      ),
      parent_requirement: parentField
        ? Object.freeze({
            field_name: "parent_requirement_id",
            pattern: text(parentField?.pattern),
            parent_model_id: parentModelId,
            cardinality: text(parentField?.cardinality),
            identity_prefix_required: parentField?.identity_prefix_required === true,
            same_macro_requirement: parentField?.same_macro_requirement === true,
            same_decision: parentField?.same_decision === true,
          })
        : null,
    });
    variants.push(projected);
    byRequirementType[requirementType] = projected;
    byModelId[modelId] = projected;
  }

  return Object.freeze({
    variants: Object.freeze(variants),
    by_requirement_type: Object.freeze(byRequirementType),
    by_model_id: Object.freeze(byModelId),
  });
}

/**
 * Resolves one canonical Requirement variant and fails closed for unknown types.
 *
 * @param {ReturnType<typeof buildGovernedRequirementVariantDispatch>} dispatch - Canonical dispatch.
 * @param {unknown} requirementType - Authored requirement_type value.
 * @returns {Record<string, unknown>} Canonical variant metadata.
 */
export function resolveGovernedRequirementVariant(dispatch, requirementType) {
  const normalized = text(requirementType);
  const variant = dispatch?.by_requirement_type?.[normalized];
  if (!variant) {
    throw requirementVariantDispatchError(
      REQUIREMENT_VARIANT_DISPATCH_RULE.unknownType,
      `Unknown canonical requirement_type ${normalized || "<empty>"}.`,
    );
  }
  return variant;
}

/**
 * Tests one Requirement identifier against its canonical variant pattern.
 *
 * @param {Record<string, unknown>} variant - Canonical Requirement variant.
 * @param {unknown} identifier - Requirement identifier.
 * @returns {boolean} Whether the identifier matches the canonical pattern.
 */
export function matchesGovernedRequirementVariantIdentity(variant, identifier) {
  return new RegExp(String(variant?.identity_pattern ?? ""), "u").test(
    String(identifier ?? ""),
  );
}

function normalizeProjectPath(value) { return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, "").trim(); }
function resolveSafeProjectPath(rootDir, projectPath) {
  const normalized = normalizeProjectPath(projectPath);
  if (!normalized || path.isAbsolute(normalized) || path.win32.isAbsolute(normalized) || path.posix.isAbsolute(normalized)) throw new Error(`Unsafe repository path: ${normalized || "<empty>"}`);
  const segments = normalized.split("/");
  if (segments.some((segment)=>!segment || segment === "." || segment === "..")) throw new Error(`Unsafe repository path: ${normalized}`);
  const absolute = path.resolve(rootDir, ...segments);
  if (absolute !== rootDir && !absolute.startsWith(`${rootDir}${path.sep}`)) throw new Error(`Repository path escapes root: ${normalized}`);
  return { normalized, absolute };
}
function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath,"utf8").replace(/^\uFEFF/u,"")); }
function resolveRef(rootSchema, reference) {
  if (!String(reference).startsWith("#/") ) throw new Error(`Unsupported schema reference: ${reference}`);
  return String(reference).slice(2).split("/").reduce((value,key)=>value?.[key.replaceAll("~1","/").replaceAll("~0","~")], rootSchema);
}
function schemaErrors(value, schema, rootSchema, location="$", output=[]) {
  if (schema.$ref) return schemaErrors(value, resolveRef(rootSchema,schema.$ref), rootSchema, location, output);
  if (Array.isArray(schema.oneOf)) {
    const candidates=schema.oneOf.map((candidate)=>schemaErrors(value,candidate,rootSchema,location,[]));
    if (candidates.filter((candidate)=>candidate.length===0).length!==1) output.push(`${location} must match exactly one governed source schema kind.`);
    return output;
  }
  if (schema.const !== undefined && value !== schema.const) output.push(`${location} must equal ${JSON.stringify(schema.const)}.`);
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) output.push(`${location} must be one of ${schema.enum.join(", ")}.`);
  if (schema.type === "object") {
    if (!object(value)) { output.push(`${location} must be an object.`); return output; }
    for (const required of schema.required ?? []) if (!Object.prototype.hasOwnProperty.call(value,required)) output.push(`${location} is missing ${required}.`);
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!Object.prototype.hasOwnProperty.call(schema.properties ?? {},key)) output.push(`${pointer(location,key)} is not allowed.`);
    for (const [key,subschema] of Object.entries(schema.properties ?? {})) if (Object.prototype.hasOwnProperty.call(value,key)) schemaErrors(value[key],subschema,rootSchema,pointer(location,key),output);
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) { output.push(`${location} must be an array.`); return output; }
    if (Number.isInteger(schema.minItems) && value.length<schema.minItems) output.push(`${location} must contain at least ${schema.minItems} items.`);
    if (schema.uniqueItems && new Set(value.map((item)=>JSON.stringify(item))).size!==value.length) output.push(`${location} must contain unique items.`);
    value.forEach((item,index)=>schemaErrors(item,schema.items ?? {},rootSchema,pointer(location,index),output));
  } else if (schema.type === "string") {
    if (typeof value !== "string") output.push(`${location} must be a string.`);
    else { if (Number.isInteger(schema.minLength) && value.length<schema.minLength) output.push(`${location} must not be empty.`); if (schema.pattern && !new RegExp(schema.pattern,"u").test(value)) output.push(`${location} does not match ${schema.pattern}.`); }
  } else if (schema.type === "integer" && !Number.isInteger(value)) output.push(`${location} must be an integer.`);
  if (Number.isInteger(schema.minimum) && Number(value)<schema.minimum) output.push(`${location} must be >= ${schema.minimum}.`);
  if (Number.isInteger(schema.minProperties) && object(value) && Object.keys(value).length<schema.minProperties) output.push(`${location} must contain at least ${schema.minProperties} properties.`);
  return output;
}
function collectMemberRecords(profile) {
  const records=[];
  if (profile.representation_kind === "yaml_registry") {
    records.push(...(profile.root_fields ?? []), ...(profile.record_fields ?? []));
    for (const variant of profile.record_variants ?? []) records.push(...(variant.fields ?? []));
  } else {
    if (profile.header) records.push(profile.header, ...(profile.header.members ?? []));
    records.push(...(profile.sections ?? []));
  }
  return records;
}
function walk(value, visit, location="$" ) {
  visit(value,location);
  if (Array.isArray(value)) value.forEach((item,index)=>walk(item,visit,pointer(location,index)));
  else if (object(value)) for (const [key,item] of Object.entries(value)) walk(item,visit,pointer(location,key));
}
function validateOrder(records, sourcePath, baseLocation, diagnostics) {
  const ordered=(records ?? []).filter((record)=>Number.isInteger(record?.order));
  if (!ordered.length) return;
  const values=ordered.map((record)=>record.order);
  const expected=Array.from({length:values.length},(_,index)=>index+1);
  if (new Set(values).size!==values.length || values.some((value,index)=>value!==expected[index])) diagnostics.push(diagnostic(RULE.order,sourcePath,baseLocation,`Order values must be unique and contiguous in authored order: ${expected.join(", ")}.`));
}

export function validateGovernedDocumentModelSourceSet(sourceSet) {
  const diagnostics=[];
  const schema=sourceSet.schema;
  const documents=[sourceSet.index,...sourceSet.models,...sourceSet.profiles];
  for (const document of documents) for (const message of schemaErrors(document.value,schema,schema)) diagnostics.push(diagnostic(RULE.schema,document.path,"$",message));
  const index=sourceSet.index.value;
  const modelIds=new Set(); const profileIds=new Set(); const globalIds=new Map();
  for (const entry of index.models ?? []) { if (modelIds.has(entry.id)) diagnostics.push(diagnostic(RULE.unique,sourceSet.index.path,"$/models",`Duplicate model id: ${entry.id}`)); modelIds.add(entry.id); }
  for (const entry of index.representation_profiles ?? []) { if (profileIds.has(entry.id)) diagnostics.push(diagnostic(RULE.unique,sourceSet.index.path,"$/representation_profiles",`Duplicate profile id: ${entry.id}`)); profileIds.add(entry.id); }
  const modelById=new Map(sourceSet.models.map((document)=>[document.value.model_id,document]));
  const profileById=new Map(sourceSet.profiles.map((document)=>[document.value.profile_id,document]));
  for (const entry of index.models ?? []) {
    const loaded=modelById.get(entry.id);
    if (!loaded || loaded.path!==entry.definition_path) diagnostics.push(diagnostic(RULE.path,sourceSet.index.path,"$/models",`Model ${entry.id} definition_path does not resolve to its loaded canonical source.`));
    if (!profileIds.has(entry.registry_profile_id) || !profileIds.has(entry.body_profile_id)) diagnostics.push(diagnostic(RULE.modelProfile,sourceSet.index.path,"$/models",`Model ${entry.id} references an unknown representation profile.`));
  }
  for (const entry of index.representation_profiles ?? []) {
    const loaded=profileById.get(entry.id);
    if (!loaded || loaded.path!==entry.profile_path) diagnostics.push(diagnostic(RULE.path,sourceSet.index.path,"$/representation_profiles",`Profile ${entry.id} profile_path does not resolve to its loaded canonical source.`));
    for (const modelId of entry.applies_to_model_ids ?? []) if (!modelIds.has(modelId)) diagnostics.push(diagnostic(RULE.profileModel,sourceSet.index.path,"$/representation_profiles",`Profile ${entry.id} references unknown model ${modelId}.`));
    if (loaded && loaded.value.representation_kind!==entry.representation_kind) diagnostics.push(diagnostic(RULE.representation,loaded.path,"$/representation_kind",`Profile representation_kind differs from the index.`));
  }
  for (const document of sourceSet.profiles) {
    const profile=document.value;
    for (const modelId of profile.applies_to_model_ids ?? []) if (!modelIds.has(modelId)) diagnostics.push(diagnostic(RULE.profileModel,document.path,"$/applies_to_model_ids",`Unknown model reference: ${modelId}`));
    const indexed=(index.representation_profiles ?? []).find((entry)=>entry.id===profile.profile_id);
    if (indexed && JSON.stringify(indexed.applies_to_model_ids)!==JSON.stringify(profile.applies_to_model_ids)) diagnostics.push(diagnostic(RULE.profileModel,document.path,"$/applies_to_model_ids",`Profile model applicability differs from the canonical index.`));
    const members=collectMemberRecords(profile);
    for (const member of members) if (text(member?.id)) { const previous=globalIds.get(member.id); if (previous) diagnostics.push(diagnostic(RULE.unique,document.path,"$",`Duplicate canonical member identifier ${member.id}; first declared in ${previous}.`)); else globalIds.set(member.id,document.path); }
    validateOrder(profile.root_fields,document.path,"$/root_fields",diagnostics); validateOrder(profile.record_fields,document.path,"$/record_fields",diagnostics); validateOrder(profile.sections,document.path,"$/sections",diagnostics); for (const [indexValue,variant] of (profile.record_variants ?? []).entries()) validateOrder(variant.fields,document.path,`$/record_variants/${indexValue}/fields`,diagnostics);
    walk(profile,(value,location)=>{ if (object(value) && Object.prototype.hasOwnProperty.call(value,"values")) diagnostics.push(diagnostic(RULE.duplicatedValues,document.path,pointer(location,"values"),`Profiles must reference controlled value sets and must not embed values.`)); if (object(value) && text(value.value_set_id) && !sourceSet.valueSetIds.has(value.value_set_id)) diagnostics.push(diagnostic(RULE.valueSet,document.path,pointer(location,"value_set_id"),`Unknown controlled value set: ${value.value_set_id}`)); });
  }
  const knownMembers=new Set(globalIds.keys());
  for (const document of sourceSet.models) {
    const model=document.value; const indexed=(index.models ?? []).find((entry)=>entry.id===model.model_id);
    if (!indexed || indexed.registry_profile_id!==model.registry_profile_id || indexed.body_profile_id!==model.body_profile_id) diagnostics.push(diagnostic(RULE.modelProfile,document.path,"$",`Model profile references differ from the canonical index.`));
    for (const profileId of [model.registry_profile_id,model.body_profile_id]) { const profile=profileById.get(profileId)?.value; if (!profile || !(profile.applies_to_model_ids ?? []).includes(model.model_id)) diagnostics.push(diagnostic(RULE.modelProfile,document.path,"$",`Profile ${profileId} does not apply to model ${model.model_id}.`)); }
    walk(model.identity,(value,location)=>{ if (typeof value==="string" && location.endsWith("_member_id") && !knownMembers.has(value)) diagnostics.push(diagnostic(RULE.member,document.path,`$/identity${location.slice(1)}`,`Unknown member reference: ${value}`)); });
    for (const [ruleIndex,rule] of (model.coherence_rules ?? []).entries()) {
      if (text(rule.id)) { const previous=globalIds.get(rule.id); if (previous) diagnostics.push(diagnostic(RULE.unique,document.path,`$/coherence_rules/${ruleIndex}/id`,`Duplicate canonical rule identifier ${rule.id}; first declared in ${previous}.`)); else globalIds.set(rule.id,document.path); }
      for (const key of ["source_member_id","target_member_id"]) if (text(rule[key]) && !knownMembers.has(rule[key])) diagnostics.push(diagnostic(RULE.member,document.path,`$/coherence_rules/${ruleIndex}/${key}`,`Unknown member reference: ${rule[key]}`));
      for (const key of ["target_profile_id"]) if (text(rule[key]) && !profileIds.has(rule[key])) diagnostics.push(diagnostic(RULE.modelProfile,document.path,`$/coherence_rules/${ruleIndex}/${key}`,`Unknown profile reference: ${rule[key]}`));
      for (const key of ["owner_model_id","parent_model_id"]) if (text(rule[key]) && !modelIds.has(rule[key])) diagnostics.push(diagnostic(RULE.profileModel,document.path,`$/coherence_rules/${ruleIndex}/${key}`,`Unknown model reference: ${rule[key]}`));
      if (text(rule.value_set_id) && !sourceSet.valueSetIds.has(rule.value_set_id)) diagnostics.push(diagnostic(RULE.valueSet,document.path,`$/coherence_rules/${ruleIndex}/value_set_id`,`Unknown controlled value set: ${rule.value_set_id}`));
    }
  }
  return sortDiagnostics(diagnostics);
}

export function loadGovernedDocumentModelSourceSet(options={}) {
  const rootDir=path.resolve(options.rootDir ?? defaultRootDir);
  const schemaPath=resolveSafeProjectPath(rootDir,options.schemaProjectPath ?? documentModelSchemaProjectPath);
  const indexPath=resolveSafeProjectPath(rootDir,options.indexProjectPath ?? documentModelIndexProjectPath);
  const taxonomyPath=resolveSafeProjectPath(rootDir,options.taxonomyProjectPath ?? documentationFieldValuesProjectPath);
  const schema=readJson(schemaPath.absolute); const index=readGovernedYamlFile(indexPath.absolute); const models=[]; const profiles=[];
  for (const entry of index.models ?? []) { const resolved=resolveSafeProjectPath(rootDir,entry.definition_path); if (!fs.existsSync(resolved.absolute)) throw new Error(`Missing model definition: ${resolved.normalized}`); models.push({path:resolved.normalized,value:readGovernedYamlFile(resolved.absolute)}); }
  for (const entry of index.representation_profiles ?? []) { const resolved=resolveSafeProjectPath(rootDir,entry.profile_path); if (!fs.existsSync(resolved.absolute)) throw new Error(`Missing representation profile: ${resolved.normalized}`); profiles.push({path:resolved.normalized,value:readGovernedYamlFile(resolved.absolute)}); }
  const taxonomy=readGovernedYamlFile(taxonomyPath.absolute); const valueSetIds=new Set((taxonomy.field_value_sets ?? []).map((entry)=>String(entry.id)).filter(Boolean));
  return {rootDir,schema,index:{path:indexPath.normalized,value:index},models,profiles,valueSetIds};
}

function resolveMutationDocument(sourceSet, sourcePath) {
  if (sourceSet.index.path===sourcePath) return sourceSet.index.value;
  return [...sourceSet.models,...sourceSet.profiles].find((entry)=>entry.path===sourcePath)?.value;
}
function getAtPath(value, parts) { return parts.reduce((current,key)=>current?.[key],value); }
export function applyGovernedDocumentModelFixture(sourceSet, fixture) {
  const mutated={...sourceSet,index:{...sourceSet.index,value:clone(sourceSet.index.value)},models:sourceSet.models.map((entry)=>({...entry,value:clone(entry.value)})),profiles:sourceSet.profiles.map((entry)=>({...entry,value:clone(entry.value)})),valueSetIds:new Set(sourceSet.valueSetIds)};
  for (const operation of fixture.operations ?? []) {
    const document=resolveMutationDocument(mutated,operation.source_path); if (!document) throw new Error(`Fixture references unknown source_path: ${operation.source_path}`);
    const parts=operation.path ?? []; const parent=getAtPath(document,parts.slice(0,-1)); const key=parts.at(-1);
    if (operation.operation==="set") parent[key]=clone(operation.value);
    else if (operation.operation==="delete") delete parent[key];
    else if (operation.operation==="append_copy") { const target=getAtPath(document,parts); target.push(clone(target[operation.source_index ?? 0])); }
    else throw new Error(`Unsupported fixture operation: ${operation.operation}`);
  }
  return mutated;
}

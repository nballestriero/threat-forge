import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  applyGovernedDocumentModelFixture,
  buildGovernedRequirementVariantDispatch,
  canonicalGovernedDocumentModelIds,
  governedDocumentModelConsumerCoverageRuleIds,
  governedDocumentModelSourceRuleIds,
  governedRequirementVariantDispatchRuleIds,
  loadGovernedDocumentModelSourceSet,
  matchesGovernedRequirementVariantIdentity,
  resolveGovernedRequirementVariant,
  validateGovernedDocumentModelConsumerCoverage,
  validateGovernedDocumentModelSourceSet,
} from "../lib/governed-document-model-sources.mjs";
import { readGovernedYamlFile } from "../lib/governed-yaml.mjs";

/**
 * @file Verification of governed document model source validation.
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
 */
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..","..","..");
const fixtureRegistry=JSON.parse(fs.readFileSync(path.join(root,"tools/MR-0001/fixtures/governed-document-model-sources/negative-fixtures.registry.json"),"utf8"));
const schema=JSON.parse(fs.readFileSync(path.join(root,"docs/reference/project-model/contracts/governed-document-model-source.schema.json"),"utf8"));
const securityRequirementModelPath="docs/reference/project-model/registers/document-models/models/security-requirement.model.yml";
const securityRequirementBodyProfilePath="docs/reference/project-model/registers/document-models/profiles/security-requirement-body.profile.yml";
const documentationFieldValuesPath="docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml";
function field(id,order,extra={}) { return {id,name:id.split(".").at(-1),order,cardinality:"exactly_one",value_kind:"single_line_text",source_kind:"authored",...extra}; }
function registryProfile(id,models,rootFields,recordFields,variants=undefined) { const value={schema_version:1,profile_id:id,title:id,representation_kind:"yaml_registry",applies_to_model_ids:models,source_path_pattern:`docs/${id}.yml`,unknown_root_fields:"forbidden",unknown_record_fields:"forbidden",root_fields:rootFields}; if(recordFields)value.record_fields=recordFields;if(variants)value.record_variants=variants;return value; }
function bodyProfile(id,model,sections) { return {schema_version:1,profile_id:id,title:id,representation_kind:"markdown_body",applies_to_model_ids:[model],source_path_pattern:`docs/${id}.md`,unknown_sections:"forbidden",header:{id:`${model}.body.header`,level:1,order:1,cardinality:"exactly_one",content_kind:"governed_identity_heading",template:"# {id} — {title}",members:[{id:`${model}.body.header.id`},{id:`${model}.body.header.title`}]},sections}; }
function validSet() {
 const modelIds=["macro-requirement","decision","functional-requirement","governance-requirement"];
 const profiles=[
  {path:"docs/reference/project-model/registers/document-models/profiles/macro-requirement-registry.profile.yml",value:registryProfile("macro-requirement-registry",[modelIds[0]],[field("macro-requirement.registry.root.schema-version",1)],[field("macro-requirement.registry.record.id",1),field("macro-requirement.registry.record.title",2),field("macro-requirement.registry.record.status",3,{value_kind:"controlled_scalar",source_kind:"controlled",value_set_id:"FIELD-VALUE-SET-0012"})])},
  {path:"docs/reference/project-model/registers/document-models/profiles/macro-requirement-body.profile.yml",value:bodyProfile("macro-requirement-body",modelIds[0],[{id:"macro-requirement.body.section.intent",heading:"Intent",order:1,cardinality:"exactly_one",content_kind:"prose"}])},
  {path:"docs/reference/project-model/registers/document-models/profiles/decision-registry.profile.yml",value:registryProfile("decision-registry",[modelIds[1]],[field("decision.registry.root.schema-version",1)],[field("decision.registry.record.id",1),field("decision.registry.record.title",2),field("decision.registry.record.status",3,{value_kind:"controlled_scalar",source_kind:"controlled",value_set_id:"FIELD-VALUE-SET-0007"})])},
  {path:"docs/reference/project-model/registers/document-models/profiles/decision-body.profile.yml",value:bodyProfile("decision-body",modelIds[1],[{id:"decision.body.section.status",heading:"Status",order:1,cardinality:"exactly_one",content_kind:"controlled_scalar_label",value_set_id:"FIELD-VALUE-SET-0007"},{id:"decision.body.section.context",heading:"Context",order:2,cardinality:"exactly_one",content_kind:"prose"}])},
  {path:"docs/reference/project-model/registers/document-models/profiles/requirement-registry.profile.yml",value:registryProfile("requirement-registry",modelIds.slice(2),[field("requirement.registry.root.schema-version",1)],undefined,[{id:modelIds[2],model_id:modelIds[2],discriminator_field:"requirement_type",discriminator_value:"functional",fields:[field("functional-requirement.registry.record.id",1,{pattern:"^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}$"}),field("functional-requirement.registry.record.title",2),field("functional-requirement.registry.record.requirement-type",3,{name:"requirement_type",required_value:"functional"})]},{id:modelIds[3],model_id:modelIds[3],discriminator_field:"requirement_type",discriminator_value:"governance",fields:[field("governance-requirement.registry.record.id",1,{pattern:"^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}GOV-\\d{4}$"}),field("governance-requirement.registry.record.title",2),field("governance-requirement.registry.record.requirement-type",3,{name:"requirement_type",required_value:"governance"}),field("governance-requirement.registry.record.parent-requirement-id",4,{name:"parent_requirement_id",pattern:"^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}$",parent_model_id:"functional-requirement",identity_prefix_required:true,same_macro_requirement:true,same_decision:true})]}])},
  {path:"docs/reference/project-model/registers/document-models/profiles/functional-requirement-body.profile.yml",value:bodyProfile("functional-requirement-body",modelIds[2],[{id:"functional-requirement.body.section.intent",heading:"Intent",order:1,cardinality:"exactly_one",content_kind:"prose"}])},
  {path:"docs/reference/project-model/registers/document-models/profiles/governance-requirement-body.profile.yml",value:bodyProfile("governance-requirement-body",modelIds[3],[{id:"governance-requirement.body.section.intent",heading:"Intent",order:1,cardinality:"exactly_one",content_kind:"prose"}])},
 ];
 const index={schema_version:1,registry_id:"governed-document-models-registry",scope:"governed_project_model_documents",models:modelIds.map((id,index)=>({id,title:id,definition_path:`docs/reference/project-model/registers/document-models/models/${id}.model.yml`,registry_profile_id:index<2?`${id}-registry`:"requirement-registry",body_profile_id:`${id}-body`})),representation_profiles:profiles.map(({path,value})=>({id:value.profile_id,title:value.title,representation_kind:value.representation_kind,profile_path:path,applies_to_model_ids:value.applies_to_model_ids}))};
 const models=modelIds.map((id,modelIndex)=>({path:index.models[modelIndex].definition_path,value:{schema_version:1,model_id:id,title:id,description:id,registry_profile_id:index.models[modelIndex].registry_profile_id,body_profile_id:index.models[modelIndex].body_profile_id,identity:{registry_id_member_id:`${id}.registry.record.id`,body_id_member_id:`${id}.body.header.id`,registry_title_member_id:`${id}.registry.record.title`,body_title_member_id:`${id}.body.header.title`},coherence_rules:[{id:`${id}.model.header.identity`,kind:"mirrored_identity",source_member_id:`${id}.registry.record.id`,target_member_id:`${id}.body.header.id`} ]}}));
 return {schema,index:{path:"docs/reference/project-model/registers/document-models/document-models.registry.yml",value:index},models,profiles,valueSetIds:new Set(["FIELD-VALUE-SET-0007","FIELD-VALUE-SET-0012"])};
}
function extendedSet() {
 const sourceSet=structuredClone(validSet());
 const modelId="synthetic-extension";
 const registryPath="docs/reference/project-model/registers/document-models/profiles/synthetic-extension-registry.profile.yml";
 const registry=registryProfile(
  "synthetic-extension-registry",
  [modelId],
  [field("synthetic-extension.registry.root.schema-version",1)],
  [
   field("synthetic-extension.registry.record.id",1),
   field("synthetic-extension.registry.record.title",2),
  ],
 );
 const bodyPath="docs/reference/project-model/registers/document-models/profiles/synthetic-extension-body.profile.yml";
 const body=bodyProfile(
  "synthetic-extension-body",
  modelId,
  [{id:"synthetic-extension.body.section.intent",heading:"Intent",order:1,cardinality:"exactly_one",content_kind:"prose"}],
 );
 sourceSet.profiles.push(
  {path:registryPath,value:registry},
  {path:bodyPath,value:body},
 );
 sourceSet.index.value.representation_profiles.push(
  {id:registry.profile_id,title:registry.title,representation_kind:registry.representation_kind,profile_path:registryPath,applies_to_model_ids:registry.applies_to_model_ids},
  {id:body.profile_id,title:body.title,representation_kind:body.representation_kind,profile_path:bodyPath,applies_to_model_ids:body.applies_to_model_ids},
 );
 const definitionPath="docs/reference/project-model/registers/document-models/models/synthetic-extension.model.yml";
 sourceSet.index.value.models.push({
  id:modelId,
  title:modelId,
  definition_path:definitionPath,
  registry_profile_id:registry.profile_id,
  body_profile_id:body.profile_id,
 });
 sourceSet.models.push({
  path:definitionPath,
  value:{
   schema_version:1,
   model_id:modelId,
   title:modelId,
   description:modelId,
   registry_profile_id:registry.profile_id,
   body_profile_id:body.profile_id,
   identity:{
    registry_id_member_id:"synthetic-extension.registry.record.id",
    body_id_member_id:"synthetic-extension.body.header.id",
    registry_title_member_id:"synthetic-extension.registry.record.title",
    body_title_member_id:"synthetic-extension.body.header.title",
   },
   coherence_rules:[{
    id:"synthetic-extension.model.header.identity",
    kind:"mirrored_identity",
    source_member_id:"synthetic-extension.registry.record.id",
    target_member_id:"synthetic-extension.body.header.id",
   }],
  },
 });
 return sourceSet;
}
function extendedRequirementSet() {
 const sourceSet=validSet();
 const modelId="synthetic-requirement";
 const requirementProfile=sourceSet.profiles.find((entry)=>entry.value.profile_id==="requirement-registry");
 requirementProfile.value.applies_to_model_ids.push(modelId);
 requirementProfile.value.record_variants.push({
  id:modelId,
  model_id:modelId,
  discriminator_field:"requirement_type",
  discriminator_value:"synthetic",
  fields:[
   field("synthetic-requirement.registry.record.id",1,{pattern:"^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}SYN-\\d{4}$"}),
   field("synthetic-requirement.registry.record.title",2),
   field("synthetic-requirement.registry.record.requirement-type",3,{name:"requirement_type",required_value:"synthetic"}),
   field("synthetic-requirement.registry.record.parent-requirement-id",4,{name:"parent_requirement_id",pattern:"^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}$",parent_model_id:"functional-requirement",identity_prefix_required:true,same_macro_requirement:true,same_decision:true}),
  ],
 });
 const bodyPath="docs/reference/project-model/registers/document-models/profiles/synthetic-requirement-body.profile.yml";
 const body=bodyProfile("synthetic-requirement-body",modelId,[{id:"synthetic-requirement.body.section.intent",heading:"Intent",order:1,cardinality:"exactly_one",content_kind:"prose"}]);
 sourceSet.profiles.push({path:bodyPath,value:body});
 sourceSet.index.value.representation_profiles.push({id:body.profile_id,title:body.title,representation_kind:body.representation_kind,profile_path:bodyPath,applies_to_model_ids:body.applies_to_model_ids});
 const definitionPath="docs/reference/project-model/registers/document-models/models/synthetic-requirement.model.yml";
 sourceSet.index.value.models.push({id:modelId,title:modelId,definition_path:definitionPath,registry_profile_id:"requirement-registry",body_profile_id:body.profile_id});
 sourceSet.models.push({path:definitionPath,value:{schema_version:1,model_id:modelId,title:modelId,description:modelId,registry_profile_id:"requirement-registry",body_profile_id:body.profile_id,identity:{registry_id_member_id:"synthetic-requirement.registry.record.id",body_id_member_id:"synthetic-requirement.body.header.id",registry_title_member_id:"synthetic-requirement.registry.record.title",body_title_member_id:"synthetic-requirement.body.header.title"},coherence_rules:[{id:"synthetic-requirement.model.header.identity",kind:"mirrored_identity",source_member_id:"synthetic-requirement.registry.record.id",target_member_id:"synthetic-requirement.body.header.id"}]}});
 return sourceSet;
}

function readCanonicalYaml(projectPath) {
 return readGovernedYamlFile(path.join(root,...projectPath.split("/")));
}
function securityRequirementActivationCandidate() {
 return {
  requirementTypeValue:{
   value:"security",
   meaning:"Concrete specialized requirement type that defines one methodology-independent security obligation derived from accepted Common Findings for an existing Functional Requirement.",
   is_specialized:true,
   requires_parent_requirement:true,
   allowed_parent_requirement_types:["functional"],
  },
  recordVariant:{
   id:"security-requirement",
   model_id:"security-requirement",
   discriminator_field:"requirement_type",
   discriminator_value:"security",
   fields:[
    {id:"security-requirement.registry.record.id",name:"id",order:1,cardinality:"exactly_one",value_kind:"canonical_identifier",source_kind:"generated",pattern:"^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}SEC-\\d{4}$",mutable:false},
    {id:"security-requirement.registry.record.title",name:"title",order:2,cardinality:"exactly_one",value_kind:"single_line_text",source_kind:"authored",terminal_punctuation:"forbidden",mirrors_member_id:"security-requirement.body.header.title"},
    {id:"security-requirement.registry.record.status",name:"status",order:3,cardinality:"exactly_one",value_kind:"controlled_scalar",source_kind:"controlled",value_set_id:"FIELD-VALUE-SET-0008"},
    {id:"security-requirement.registry.record.requirement-type",name:"requirement_type",order:4,cardinality:"exactly_one",value_kind:"controlled_scalar",source_kind:"controlled",value_set_id:"FIELD-VALUE-SET-0010",required_value:"security"},
    {id:"security-requirement.registry.record.macro-requirement-id",name:"macro_requirement_id",order:5,cardinality:"exactly_one",value_kind:"canonical_identifier",source_kind:"derived",pattern:"^MR-\\d{4}$",mutable:false},
    {id:"security-requirement.registry.record.decision-id",name:"decision_id",order:6,cardinality:"exactly_one",value_kind:"canonical_identifier",source_kind:"derived",pattern:"^ADR-\\d{4}$",mutable:false},
    {id:"security-requirement.registry.record.parent-requirement-id",name:"parent_requirement_id",order:7,cardinality:"exactly_one",value_kind:"canonical_identifier",source_kind:"authored_relation",pattern:"^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}$",parent_model_id:"functional-requirement",same_macro_requirement:true,same_decision:true,identity_prefix_required:true},
    {id:"security-requirement.registry.record.body-path",name:"body_path",order:8,cardinality:"exactly_one",value_kind:"repository_relative_path",source_kind:"generated",template:"docs/reference/project-model/body/requirements/{macro_requirement_id}/{id}_body.md",mutable:false},
   ],
  },
 };
}
function inactiveSecurityRequirementSet() {
 const activeSourceSet=loadGovernedDocumentModelSourceSet({rootDir:root});
 const sourceSet=structuredClone(activeSourceSet);
 const model=readCanonicalYaml(securityRequirementModelPath);
 const bodyProfile=readCanonicalYaml(securityRequirementBodyProfilePath);
 const candidate=securityRequirementActivationCandidate();
 const requirementProfile=sourceSet.profiles.find((entry)=>entry.value.profile_id==="requirement-registry");
 const requirementProfileIndex=sourceSet.index.value.representation_profiles.find((entry)=>entry.id==="requirement-registry");
 if(!requirementProfile || !requirementProfileIndex) throw new Error("Canonical Requirement registry profile is missing.");
 requirementProfile.value.applies_to_model_ids.push(model.model_id);
 requirementProfile.value.record_variants.push(candidate.recordVariant);
 requirementProfileIndex.applies_to_model_ids.push(model.model_id);
 sourceSet.models.push({path:securityRequirementModelPath,value:model});
 sourceSet.profiles.push({path:securityRequirementBodyProfilePath,value:bodyProfile});
 sourceSet.index.value.models.push({id:model.model_id,title:model.title,definition_path:securityRequirementModelPath,registry_profile_id:model.registry_profile_id,body_profile_id:model.body_profile_id});
 sourceSet.index.value.representation_profiles.push({id:bodyProfile.profile_id,title:bodyProfile.title,representation_kind:bodyProfile.representation_kind,profile_path:securityRequirementBodyProfilePath,applies_to_model_ids:bodyProfile.applies_to_model_ids});
 return {activeSourceSet,sourceSet,model,bodyProfile,candidate};
}

test("accepts the current canonical source set",()=>assert.deepEqual(validateGovernedDocumentModelSourceSet(validSet()),[]));
test("accepts a coherent additional model without fixed cardinalities",()=>assert.deepEqual(validateGovernedDocumentModelSourceSet(extendedSet()),[]));
test("derives canonical model ids from the index in authored order",()=>assert.deepEqual(canonicalGovernedDocumentModelIds(extendedSet()),["macro-requirement","decision","functional-requirement","governance-requirement","synthetic-extension"]));
test("publishes unique stable rule identifiers",()=>{const rules=[...governedDocumentModelSourceRuleIds,...governedDocumentModelConsumerCoverageRuleIds,...governedRequirementVariantDispatchRuleIds];assert.equal(new Set(rules).size,rules.length);});
test("derives Requirement type model identity fields and parent metadata from canonical variants",()=>{const dispatch=buildGovernedRequirementVariantDispatch(validSet());assert.deepEqual(dispatch.variants.map((variant)=>variant.discriminator_value),["functional","governance"]);const governance=resolveGovernedRequirementVariant(dispatch,"governance");assert.equal(governance.model_id,"governance-requirement");assert.equal(governance.parent_requirement.parent_model_id,"functional-requirement");assert.ok(governance.field_names.includes("parent_requirement_id"));assert.equal(matchesGovernedRequirementVariantIdentity(governance,"MR-0001ADR-0001REQ-0001GOV-0001"),true);});
test("dispatches a synthetic additional Requirement variant without consumer-local changes",()=>{const sourceSet=extendedRequirementSet();assert.deepEqual(validateGovernedDocumentModelSourceSet(sourceSet),[]);const dispatch=buildGovernedRequirementVariantDispatch(sourceSet);const synthetic=resolveGovernedRequirementVariant(dispatch,"synthetic");assert.equal(synthetic.model_id,"synthetic-requirement");assert.equal(synthetic.parent_requirement.parent_model_id,"functional-requirement");assert.equal(matchesGovernedRequirementVariantIdentity(synthetic,"MR-0001ADR-0001REQ-0001SYN-0001"),true);});
test("validates the active Security Requirement source without synthetic overlay",()=>{
 const sourceSet=loadGovernedDocumentModelSourceSet(root);
 const original=structuredClone(sourceSet);
 assert.deepEqual(canonicalGovernedDocumentModelIds(sourceSet),["macro-requirement","decision","functional-requirement","governance-requirement","security-requirement"]);
 assert.equal(sourceSet.index.value.models.filter((entry)=>entry.id==="security-requirement").length,1);
 assert.equal(sourceSet.index.value.representation_profiles.filter((entry)=>entry.id==="security-requirement-body").length,1);
 assert.deepEqual(validateGovernedDocumentModelSourceSet(sourceSet),[]);
 const dispatch=buildGovernedRequirementVariantDispatch(sourceSet);
 const security=resolveGovernedRequirementVariant(dispatch,"security");
 assert.equal(security.model_id,"security-requirement");
 assert.equal(security.parent_requirement.parent_model_id,"functional-requirement");
 assert.equal(security.parent_requirement.identity_prefix_required,true);
 assert.equal(security.parent_requirement.same_macro_requirement,true);
 assert.equal(security.parent_requirement.same_decision,true);
 assert.deepEqual(security.field_names,["id","title","status","requirement_type","macro_requirement_id","decision_id","parent_requirement_id","body_path"]);
 assert.equal(matchesGovernedRequirementVariantIdentity(security,"MR-0001ADR-0001REQ-0001SEC-0001"),true);
 assert.equal(matchesGovernedRequirementVariantIdentity(security,"MR-0001ADR-0001REQ-0001GOV-0001"),false);
 const model=sourceSet.models.find((entry)=>entry.value.model_id==="security-requirement")?.value;
 const bodyProfile=sourceSet.profiles.find((entry)=>entry.value.profile_id==="security-requirement-body")?.value;
 assert.equal(model?.registry_profile_id,"requirement-registry");
 assert.equal(model?.body_profile_id,"security-requirement-body");
 assert.deepEqual(bodyProfile?.sections.map((section)=>section.heading),["Intent","Parent Functional Requirement","Finding derivation","Security obligation","Scope","Acceptance"]);
 assert.deepEqual(bodyProfile?.reference_positions.map((position)=>position.allowed_entity_types),[["functional_requirement"],["common_analysis_finding"]]);
 const taxonomy=readCanonicalYaml(documentationFieldValuesPath);
 const activeRequirementTypes=taxonomy.field_value_sets.find((entry)=>entry.id==="FIELD-VALUE-SET-0010").values.map((entry)=>entry.value);
 assert.deepEqual(activeRequirementTypes,["functional","governance","security"]);
 assert.deepEqual(sourceSet,original);
});
test("rejects duplicate and unknown Requirement discriminators deterministically",()=>{const sourceSet=extendedRequirementSet();const profile=sourceSet.profiles.find((entry)=>entry.value.profile_id==="requirement-registry");profile.value.record_variants.at(-1).discriminator_value="functional";profile.value.record_variants.at(-1).fields.find((field)=>field.name==="requirement_type").required_value="functional";assert.throws(()=>buildGovernedRequirementVariantDispatch(sourceSet),(error)=>error.code==="document-model.requirement-variant.discriminator.duplicate");const dispatch=buildGovernedRequirementVariantDispatch(validSet());assert.throws(()=>resolveGovernedRequirementVariant(dispatch,"unknown"),(error)=>error.code==="document-model.requirement-variant.type.unknown");});
test("accepts exact registry-derived consumer coverage",()=>{const sourceSet=extendedSet();assert.deepEqual(validateGovernedDocumentModelConsumerCoverage({consumerId:"test-consumer",sourceSet,providerModelIds:canonicalGovernedDocumentModelIds(sourceSet)}),[]);});
test("accepts a canonical model id projection without reconstructing a source set",()=>{const canonicalModelIds=["model-a","model-b"];assert.deepEqual(validateGovernedDocumentModelConsumerCoverage({consumerId:"projected-consumer",canonicalModelIds,providerModelIds:[...canonicalModelIds],sourcePath:"projected-catalog"}),[]);});
test("detects missing unregistered and duplicate consumer providers deterministically",()=>{
 const sourceSet=extendedSet();
 const original=structuredClone(sourceSet);
 const providers=["decision","macro-requirement","decision","functional-requirement","governance-requirement","unknown-model"];
 const diagnostics=validateGovernedDocumentModelConsumerCoverage({consumerId:"test-consumer",sourceSet,providerModelIds:providers});
 assert.deepEqual(new Set(diagnostics.map((item)=>item.rule_id)),new Set(["document-model.consumer.provider.duplicate","document-model.consumer.provider.missing","document-model.consumer.provider.unregistered"]));
 assert.deepEqual(diagnostics,validateGovernedDocumentModelConsumerCoverage({consumerId:"test-consumer",sourceSet,providerModelIds:[...providers].reverse()}));
 assert.deepEqual(sourceSet,original);
 assert.deepEqual(providers,["decision","macro-requirement","decision","functional-requirement","governance-requirement","unknown-model"]);
});
for (const record of fixtureRegistry.fixtures) test(`negative fixture ${record.id} triggers declared stable rules`,()=>{const fixture=JSON.parse(fs.readFileSync(path.join(root,...record.fixture_path.split("/")),"utf8"));const diagnostics=validateGovernedDocumentModelSourceSet(applyGovernedDocumentModelFixture(validSet(),fixture));const rules=new Set(diagnostics.map((item)=>item.rule_id));for(const expected of record.expected_rule_ids)assert.ok(rules.has(expected),`${record.id} missing ${expected}: ${JSON.stringify(diagnostics)}`);});

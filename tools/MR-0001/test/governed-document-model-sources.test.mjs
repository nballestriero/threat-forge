import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  applyGovernedDocumentModelFixture,
  canonicalGovernedDocumentModelIds,
  governedDocumentModelConsumerCoverageRuleIds,
  governedDocumentModelSourceRuleIds,
  validateGovernedDocumentModelConsumerCoverage,
  validateGovernedDocumentModelSourceSet,
} from "../lib/governed-document-model-sources.mjs";

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
  {path:"docs/reference/project-model/registers/document-models/profiles/requirement-registry.profile.yml",value:registryProfile("requirement-registry",modelIds.slice(2),[field("requirement.registry.root.schema-version",1)],undefined,[{id:modelIds[2],model_id:modelIds[2],discriminator_field:"requirement_type",discriminator_value:"functional",fields:[field("functional-requirement.registry.record.id",1),field("functional-requirement.registry.record.title",2)]},{id:modelIds[3],model_id:modelIds[3],discriminator_field:"requirement_type",discriminator_value:"governance",fields:[field("governance-requirement.registry.record.id",1),field("governance-requirement.registry.record.title",2)]}])},
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
test("accepts the current canonical source set",()=>assert.deepEqual(validateGovernedDocumentModelSourceSet(validSet()),[]));
test("accepts a coherent fifth model without fixed cardinalities",()=>assert.deepEqual(validateGovernedDocumentModelSourceSet(extendedSet()),[]));
test("derives canonical model ids from the index in authored order",()=>assert.deepEqual(canonicalGovernedDocumentModelIds(extendedSet()),["macro-requirement","decision","functional-requirement","governance-requirement","synthetic-extension"]));
test("publishes unique stable rule identifiers",()=>assert.equal(new Set([...governedDocumentModelSourceRuleIds,...governedDocumentModelConsumerCoverageRuleIds]).size,governedDocumentModelSourceRuleIds.length+governedDocumentModelConsumerCoverageRuleIds.length));
test("accepts exact registry-derived consumer coverage",()=>{const sourceSet=extendedSet();assert.deepEqual(validateGovernedDocumentModelConsumerCoverage({consumerId:"test-consumer",sourceSet,providerModelIds:canonicalGovernedDocumentModelIds(sourceSet)}),[]);});
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

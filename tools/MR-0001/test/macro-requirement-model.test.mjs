import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { macroRequirementModelRuleIds, validateMacroRequirementModel } from "../lib/macro-requirement-model-validation.mjs";

/**
 * @file Deterministic verification of the Macro-requirement complete-model checker.
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0002ADR-0004REQ-0002GOV-0002
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 */
const repositoryRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..","..","..");
const fixtureRegistry=JSON.parse(fs.readFileSync(path.join(repositoryRoot,"tools/MR-0001/fixtures/macro-requirement-model/negative-fixtures.registry.json"),"utf8"));
function write(root,projectPath,text){const target=path.join(root,...projectPath.split("/"));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text,"utf8");}
function makeRoot(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"tf-macro-model-"));
 for(const relative of ["docs/reference/project-model/contracts","docs/reference/project-model/registers/document-models","docs/reference/project-model/registers/taxonomies"]){fs.cpSync(path.join(repositoryRoot,relative),path.join(root,relative),{recursive:true});}
 write(root,"docs/reference/project-model/registers/macro-requirements.registry.yml",`schema_version: 1\nregistry_id: governed-documentation-macro-requirements-registry\nproject: threat-forge\n\nmacro_requirements:\n  - id: MR-0001\n    title: Canonical model\n    status: draft\n    macro_requirement_type: functional\n    body_path: docs/reference/project-model/body/macro-requirements/MR-0001_body.md\n    decisions_registry_path: docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml\n    requirements_registry_path: docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml\n`);
 write(root,"docs/reference/project-model/body/macro-requirements/MR-0001_body.md",`# MR-0001 — Canonical model\n\n## Intent\n\nCanonical intent.\n\n## Context\n\nCanonical context.\n\n## Macro obligation\n\n- ThreatForge must govern documentation.\n\n## Scope\n\n- Includes: governed documentation\n- Excludes: ordinary notes\n`);
 write(root,"docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml","schema_version: 1\ndecisions: []\n");
 write(root,"docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml","schema_version: 1\nrequirements: []\n");
 return root;
}
function applyFixture(root,fixture){for(const operation of fixture.operations??[]){const target=path.join(root,...operation.file.split("/"));const before=fs.readFileSync(target,"utf8");assert.ok(before.includes(operation.find),`fixture find text missing in ${operation.file}`);fs.writeFileSync(target,before.replace(operation.find,operation.replace),"utf8");}for(const projectPath of fixture.delete_files??[])fs.rmSync(path.join(root,...projectPath.split("/")));}

test("accepts a canonical Macro-requirement logical model",()=>{const root=makeRoot();try{assert.deepEqual(validateMacroRequirementModel({rootDir:root}).diagnostics,[]);}finally{fs.rmSync(root,{recursive:true,force:true});}});
test("publishes unique stable Macro-requirement rule identifiers",()=>{const ids=Object.values(macroRequirementModelRuleIds);assert.equal(new Set(ids).size,ids.length);});
for(const record of fixtureRegistry.fixtures){test(`negative fixture ${record.id} triggers declared stable rules`,()=>{const root=makeRoot();try{const fixture=JSON.parse(fs.readFileSync(path.join(repositoryRoot,...record.fixture_path.split("/")),"utf8"));applyFixture(root,fixture);const diagnostics=validateMacroRequirementModel({rootDir:root}).diagnostics;const rules=new Set(diagnostics.map((item)=>item.rule_id));for(const expected of record.expected_rule_ids)assert.ok(rules.has(expected),`${record.id} did not trigger ${expected}`);assert.ok(diagnostics.length>0);}finally{fs.rmSync(root,{recursive:true,force:true});}});}

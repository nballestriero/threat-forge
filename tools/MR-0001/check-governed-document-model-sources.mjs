#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyGovernedDocumentModelFixture, loadGovernedDocumentModelSourceSet, validateGovernedDocumentModelSourceSet } from "./lib/governed-document-model-sources.mjs";

/**
 * @file Canonical governed document model source checker.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Validates only canonical model and representation-profile definitions. It
 * intentionally does not validate the active document corpus before migration.
 */
const scriptPath=fileURLToPath(import.meta.url); const rootDir=process.env.TF_DOCUMENT_MODEL_SOURCE_ROOT?path.resolve(process.env.TF_DOCUMENT_MODEL_SOURCE_ROOT):path.resolve(path.dirname(scriptPath),"..","..");
const fixtureRegistryPath="tools/MR-0001/fixtures/governed-document-model-sources/negative-fixtures.registry.json";
const implemented=["MR-0001ADR-0007REQ-0001","MR-0001ADR-0007REQ-0001GOV-0001","MR-0001ADR-0007REQ-0002GOV-0001"];
let sourceSet; const errors=[]; let fixtureCount=0;
try { sourceSet=loadGovernedDocumentModelSourceSet({rootDir}); errors.push(...validateGovernedDocumentModelSourceSet(sourceSet).map((item)=>`${item.rule_id} ${item.source_path} ${item.location}: ${item.message}`)); } catch(error) { errors.push(error.message); }
if (sourceSet) {
  try {
    const registry=JSON.parse(fs.readFileSync(path.join(rootDir,...fixtureRegistryPath.split("/")),"utf8"));
    for (const record of registry.fixtures ?? []) {
      fixtureCount+=1; const fixturePath=path.join(rootDir,...String(record.fixture_path).split("/")); const fixture=JSON.parse(fs.readFileSync(fixturePath,"utf8"));
      if (record.model_id!==fixture.model_id) errors.push(`${record.id} fixture model_id differs from registry.`);
      const diagnostics=validateGovernedDocumentModelSourceSet(applyGovernedDocumentModelFixture(sourceSet,fixture)); const rules=new Set(diagnostics.map((item)=>item.rule_id));
      for (const expected of record.expected_rule_ids ?? []) if (!rules.has(expected)) errors.push(`${record.id} did not trigger expected rule ${expected}.`);
      if (diagnostics.length===0) errors.push(`${record.id} negative fixture unexpectedly passed.`);
    }
  } catch(error) { errors.push(`Negative fixture execution failed: ${error.message}`); }
}
if (errors.length) {
  console.error("Governed document model source check failed."); for (const id of implemented) console.error(`Implemented requirement: ${id}`); console.error(`Models checked: ${sourceSet?.models.length ?? 0}`); console.error(`Profiles checked: ${sourceSet?.profiles.length ?? 0}`); console.error(`Negative fixtures checked: ${fixtureCount}`); console.error("Warnings: 0"); console.error(`Errors: ${errors.length}`); for (const error of errors) console.error(`ERROR: ${error}`); process.exit(1);
}
console.log("Governed document model source check passed."); for (const id of implemented) console.log(`Implemented requirement: ${id}`); console.log(`Models checked: ${sourceSet.models.length}`); console.log(`Profiles checked: ${sourceSet.profiles.length}`); console.log(`Controlled value sets available: ${sourceSet.valueSetIds.size}`); console.log(`Negative fixtures checked: ${fixtureCount}`); console.log("Warnings: 0"); console.log("Errors: 0");

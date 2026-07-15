#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateMacroRequirementModel } from "./lib/macro-requirement-model-validation.mjs";

/**
 * @file Macro-requirement complete-model checker and migration reporter.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0002
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Default mode is enforce for future check-registry activation. --report writes
 * deterministic migration reports and remains non-blocking for model violations.
 */
const scriptPath=fileURLToPath(import.meta.url);
const rootDir=process.env.TF_MACRO_REQUIREMENT_MODEL_ROOT?path.resolve(process.env.TF_MACRO_REQUIREMENT_MODEL_ROOT):path.resolve(path.dirname(scriptPath),"..","..");
const reportMode=process.argv.includes("--report");
const unknown=process.argv.slice(2).filter((arg)=>arg!=="--report"&&arg!=="--enforce");
if (unknown.length) { console.error(`Unsupported arguments: ${unknown.join(", ")}`); process.exit(2); }
let result;
try { result=validateMacroRequirementModel({rootDir}); } catch(error) { console.error(`Macro-requirement model validation could not run: ${error.message}`); process.exit(2); }
const reportDir=path.join(rootDir,"artifacts","governed-document-models"); fs.mkdirSync(reportDir,{recursive:true});
const report={checker:"check-macro-requirement-model",mode:reportMode?"report":"enforce",implemented_requirements:["MR-0001ADR-0007REQ-0002","MR-0001ADR-0007REQ-0002GOV-0001","MR-0001ADR-0007REQ-0002GOV-0002"],...result,error_count:result.diagnostics.filter((item)=>item.severity==="error").length,warning_count:result.diagnostics.filter((item)=>item.severity==="warning").length};
fs.writeFileSync(path.join(reportDir,"macro-requirement.report.json"),`${JSON.stringify(report,null,2)}\n`,`utf8`);
const markdown=["# Macro-requirement model migration report","",`Mode: ${report.mode}`,`Records checked: ${report.records_checked}`,`Errors: ${report.error_count}`,`Warnings: ${report.warning_count}`,"","## Diagnostics","",...(report.diagnostics.length?report.diagnostics.map((item)=>`- [${item.rule_id}] ${item.source_path} ${item.location}: ${item.message}`):["None."]),""];
fs.writeFileSync(path.join(reportDir,"macro-requirement.report.md"),markdown.join("\n"),"utf8");
console.log(report.error_count===0?"Macro-requirement model check passed.":reportMode?"Macro-requirement migration report completed.":"Macro-requirement model check failed.");
for (const id of report.implemented_requirements) console.log(`Implemented requirement: ${id}`);
console.log(`Mode: ${report.mode}`); console.log(`Records checked: ${report.records_checked}`); console.log(`Warnings: ${report.warning_count}`); console.log(`Errors: ${report.error_count}`); console.log("Report: artifacts/governed-document-models/macro-requirement.report.json");
for (const item of report.diagnostics) console.log(`${item.severity.toUpperCase()}: [${item.rule_id}] ${item.source_path} ${item.location}: ${item.message}`);
if (!reportMode && report.error_count>0) process.exit(1);

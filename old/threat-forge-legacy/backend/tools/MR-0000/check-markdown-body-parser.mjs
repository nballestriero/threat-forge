#!/usr/bin/env node
import { getMarkdownSectionTitles, parseMarkdownBody } from "./lib/markdown-body-parser.mjs";

/**
 * @file Deterministic self-check for the shared Markdown body parser utility.
 *
 * @implementsRequirement MR-0001REQ-0022
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0000
 * @macroRequirement MR-0001
 *
 * This checker verifies the shared parser behavior required before ADR and
 * Requirement body validators consume it. It intentionally checks only parser
 * structure extraction and does not validate any ADR or Requirement profile.
 *
 * Side effects: writes diagnostics to stdout/stderr and exits with non-zero code
 * on failure. It does not mutate project files or generate artifacts.
 */

const errors = [];

/**
 * Records a diagnostic when a condition is false.
 *
 * @param {boolean} condition - Condition that must hold.
 * @param {string} message - Diagnostic message.
 * @returns {void}
 */
function assert(condition, message) {
  if (!condition) errors.push(message);
}

const sample = `# MR-0001REQ-0022 Shared Markdown body parser utility\r\n\r\n## Intent\r\n\r\nParse governed Markdown.\r\n\r\n\`\`\`text\r\n## Ignored fenced heading\r\n\`\`\`\r\n\r\n## Requirement\r\n\r\nReturn deterministic sections.\r\n`;

const parsed = parseMarkdownBody(sample, {
  sourcePath: "docs\\reference\\project-model\\body\\requirements\\MR-0001\\MR-0001REQ-0022_body.md",
});

assert(parsed.sourcePath === "docs/reference/project-model/body/requirements/MR-0001/MR-0001REQ-0022_body.md", "sourcePath must be normalized to forward slashes.");
assert(parsed.h1?.title === "MR-0001REQ-0022 Shared Markdown body parser utility", "parser must extract the first H1 title.");
assert(parsed.h1?.line === 1, "parser must preserve H1 line number.");
assert(parsed.startsWithH1 === true, "parser must report when the first content line is the H1.");
assert(JSON.stringify(getMarkdownSectionTitles(parsed)) === JSON.stringify(["Intent", "Requirement"]), "parser must extract only level-2 sections outside fenced code blocks, in order.");
assert(parsed.sections[0]?.line === 3, "parser must preserve first section line number.");
assert(parsed.sections[1]?.line === 11, "parser must preserve second section line number after fenced code blocks.");
assert(parsed.sections[0]?.content.includes("Parse governed Markdown."), "parser must capture section content.");

const noInitialH1 = parseMarkdownBody("Intro\n\n# Late H1\n\n## Section\n");
assert(noInitialH1.h1?.line === 3, "parser must still report a non-initial H1.");
assert(noInitialH1.startsWithH1 === false, "parser must report when the first content line is not the H1.");

if (errors.length > 0) {
  console.error("Markdown body parser check failed.");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Markdown body parser check passed.");
console.log("Implemented requirement: MR-0001REQ-0022");

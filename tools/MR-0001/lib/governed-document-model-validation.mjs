import fs from "node:fs";
import path from "node:path";

/**
 * @file Shared complete-model validation primitives for governed documents.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Provides deterministic diagnostics, YAML field-order extraction, Markdown
 * section parsing and profile-driven content checks reusable by model entrypoints.
 * Side effects: reads UTF-8 files only through exported helpers.
 */

export function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, "").trim();
}

export function resolveSafeProjectPath(rootDir, projectPath) {
  const normalized = normalizeProjectPath(projectPath);
  if (!normalized || path.isAbsolute(normalized) || path.win32.isAbsolute(normalized) || path.posix.isAbsolute(normalized)) {
    throw new Error(`Unsafe repository path: ${normalized || "<empty>"}`);
  }
  const parts = normalized.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) throw new Error(`Unsafe repository path: ${normalized}`);
  const absolute = path.resolve(rootDir, ...parts);
  if (absolute !== rootDir && !absolute.startsWith(`${rootDir}${path.sep}`)) throw new Error(`Repository path escapes root: ${normalized}`);
  return { normalized, absolute };
}

export function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "").replace(/\r\n/gu, "\n");
}

export function createDiagnostic(ruleId, modelId, representation, sourcePath, location, message, severity = "error") {
  return { rule_id: ruleId, model_id: modelId, representation, source_path: sourcePath, location, severity, message };
}

export function sortDiagnostics(diagnostics) {
  return [...diagnostics].sort((left, right) =>
    `${left.source_path}|${left.location}|${left.rule_id}|${left.message}`.localeCompare(
      `${right.source_path}|${right.location}|${right.rule_id}|${right.message}`,
      "en",
      { numeric: true, sensitivity: "base" },
    ),
  );
}

export function extractTopLevelYamlFieldOrder(text) {
  return String(text).split("\n").filter((line) => /^[A-Za-z_][A-Za-z0-9_-]*:/u.test(line)).map((line) => line.slice(0, line.indexOf(":")));
}

export function extractCollectionRecordFieldOrders(text, collectionName) {
  const lines = String(text).split("\n");
  const start = lines.findIndex((line) => line === `${collectionName}:`);
  if (start < 0) return [];
  const records = [];
  let current = null;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line && !line.startsWith(" ")) break;
    const first = line.match(/^  - ([A-Za-z_][A-Za-z0-9_-]*):/u);
    if (first) {
      current = [first[1]];
      records.push(current);
      continue;
    }
    const field = line.match(/^    ([A-Za-z_][A-Za-z0-9_-]*):/u);
    if (field && current) current.push(field[1]);
  }
  return records;
}

export function parseMarkdownDocument(text) {
  const lines = String(text).split("\n");
  const h1 = [];
  const sections = [];
  let current = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const h1Match = line.match(/^# (.+)$/u);
    if (h1Match) h1.push({ text: h1Match[1], line: index + 1 });
    const h2Match = line.match(/^## (.+)$/u);
    if (h2Match) {
      current = { heading: h2Match[1], line: index + 1, lines: [] };
      sections.push(current);
    } else if (current) current.lines.push(line);
  }
  for (const section of sections) {
    while (section.lines.length && !section.lines[0].trim()) section.lines.shift();
    while (section.lines.length && !section.lines.at(-1).trim()) section.lines.pop();
    section.text = section.lines.join("\n");
    section.items = section.lines.filter((line) => /^- /u.test(line)).map((line) => line.slice(2));
    section.paragraphs = section.text.split(/\n\s*\n/gu).map((value) => value.trim()).filter(Boolean).filter((value) => !value.startsWith("- "));
  }
  return { h1, sections };
}

function endsWithPeriod(value) { return /\.\s*$/u.test(value); }
function containsNormativeKeyword(value) { return /\b(?:must|must not|shall|shall not|should|should not|may)\b/iu.test(value); }
function countMustObligations(value) { return [...String(value).matchAll(/\bmust(?:\s+not)?\b/giu)].length; }

export function validateSectionContent(section, profileSection, context) {
  const diagnostics = [];
  const push = (message, location = `line:${section.line}`) => diagnostics.push(createDiagnostic(context.ruleId, context.modelId, "markdown_body", context.sourcePath, location, message));
  const items = section.items;
  if (Number.isInteger(profileSection.minimum_paragraphs) && section.paragraphs.length < profileSection.minimum_paragraphs) push(`Section ${profileSection.heading} requires at least ${profileSection.minimum_paragraphs} prose paragraph(s).`);
  const minimumItems = profileSection.minimum_items ?? profileSection.minimum_items_when_present;
  if (Number.isInteger(minimumItems) && items.length < minimumItems) push(`Section ${profileSection.heading} requires at least ${minimumItems} list item(s).`);
  if (profileSection.normative_keywords === "forbidden" && containsNormativeKeyword(section.text)) push(`Section ${profileSection.heading} must not contain normative keywords.`);
  if (Array.isArray(profileSection.normative_keywords)) {
    for (const item of items) {
      const count = countMustObligations(item);
      if (count !== 1) push(`Each ${profileSection.heading} item must contain exactly one must or must not obligation.`);
      if (profileSection.item_subject === "explicit" && /^(?:must|must not)\b/iu.test(item)) push(`Each ${profileSection.heading} item must declare an explicit subject before the obligation.`);
      if (profileSection.item_subject === "explicit_verification_subject" && !/^The verification must(?: not)?\b/u.test(item)) push(`Each ${profileSection.heading} item must start with an explicit verification subject.`);
    }
  }
  if (Array.isArray(profileSection.allowed_prefixes)) {
    const allowedPrefixes = profileSection.allowed_prefixes.map((prefix) => {
      if (typeof prefix === "string") return prefix;
      if (prefix && typeof prefix === "object" && !Array.isArray(prefix)) {
        const key = Object.keys(prefix)[0] ?? "";
        return `${key.replace(/^["']/u, "")}:`;
      }
      return String(prefix ?? "");
    });
    for (const item of items) if (!allowedPrefixes.some((prefix) => item.startsWith(prefix))) push(`Each ${profileSection.heading} item must start with one allowed prefix: ${allowedPrefixes.join(", ")}.`);
  }
  if (profileSection.required_item_prefix) for (const item of items) if (!item.startsWith(profileSection.required_item_prefix)) push(`Each ${profileSection.heading} item must start with ${JSON.stringify(profileSection.required_item_prefix)}.`);
  if (profileSection.terminal_punctuation === "period") for (const item of items) if (!endsWithPeriod(item)) push(`Each ${profileSection.heading} item must end with a period.`);
  if (profileSection.terminal_punctuation === "forbidden") for (const item of items) if (/[.!?;:]\s*$/u.test(item)) push(`Each ${profileSection.heading} item must not end with terminal punctuation.`);
  if (profileSection.duplicate_items === "forbidden" && new Set(items).size !== items.length) push(`Section ${profileSection.heading} must not contain duplicate items.`);
  return diagnostics;
}

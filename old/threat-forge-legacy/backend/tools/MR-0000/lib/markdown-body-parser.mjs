/**
 * @file Shared deterministic Markdown body parser for governed project-model bodies.
 *
 * @implementsRequirement MR-0001REQ-0022
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0001
 *
 * The parser extracts structural metadata that body validators can use without
 * hardcoding ADR or Requirement section names. It deliberately parses only the
 * Markdown structure needed by governed body-format validators: the first H1,
 * level-2 sections, section order, line numbers, and fenced-code awareness.
 *
 * Side effects: none. This module does not read files, mutate project files,
 * validate document-specific profiles, or emit diagnostics by itself.
 */

/**
 * Normalizes Markdown line endings to LF while preserving text content.
 *
 * @param {string} markdown - Markdown text to normalize.
 * @returns {string} Markdown text with LF line endings.
 */
export function normalizeMarkdownLineEndings(markdown) {
  return String(markdown ?? "").replace(/\r\n/gu, "\n").replace(/\r/gu, "\n");
}

/**
 * Converts a path-like value to a stable forward-slash display path.
 *
 * @param {string|null|undefined} sourcePath - Optional source path.
 * @returns {string|null} Normalized source path, or null when not provided.
 */
export function normalizeMarkdownSourcePath(sourcePath) {
  if (sourcePath === null || sourcePath === undefined || sourcePath === "") return null;
  return String(sourcePath).replaceAll("\\", "/");
}

/**
 * Parses a Markdown ATX heading line outside fenced code blocks.
 *
 * @param {string} line - Single Markdown line.
 * @returns {{level:number,title:string,raw:string}|null} Parsed heading, or null.
 */
function parseAtxHeading(line) {
  const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(line.trimEnd());
  if (!match) return null;
  return {
    level: match[1].length,
    title: match[2].trim(),
    raw: line,
  };
}

/**
 * Detects the start or end of a fenced code block.
 *
 * @param {string} line - Single Markdown line.
 * @returns {boolean} True when the line toggles a fenced code block.
 */
function isFenceToggle(line) {
  return /^\s*(```+|~~~+)/u.test(line);
}

/**
 * Returns the first non-empty line in a Markdown body.
 *
 * @param {string[]} lines - Markdown lines.
 * @returns {{line:number,text:string}|null} First non-empty line metadata, or null.
 */
function findFirstContentLine(lines) {
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== "") {
      return { line: index + 1, text: lines[index] };
    }
  }
  return null;
}

/**
 * Parses governed Markdown body structure without applying document-specific rules.
 *
 * Validators use the returned structure together with governed body-format
 * profiles to check required sections, order, extra sections, H1 patterns, and
 * body-path diagnostics. This parser intentionally does not know about ADR,
 * Requirement, security, performance, or RTM-specific section names.
 *
 * @param {string} markdown - Markdown body text.
 * @param {{sourcePath?: string|null}} [options] - Optional parser metadata.
 * @returns {{sourcePath:string|null,lineCount:number,firstContentLine:{line:number,text:string}|null,h1:{level:number,title:string,raw:string,line:number}|null,startsWithH1:boolean,sections:Array<{level:number,title:string,raw:string,line:number,startLine:number,endLine:number,content:string}>,headings:Array<{level:number,title:string,raw:string,line:number}>}} Parsed body metadata.
 */
export function parseMarkdownBody(markdown, options = {}) {
  const normalized = normalizeMarkdownLineEndings(markdown);
  const lines = normalized.split("\n");
  const firstContentLine = findFirstContentLine(lines);
  const headings = [];
  const sections = [];
  let h1 = null;
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (isFenceToggle(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    const heading = parseAtxHeading(line);
    if (!heading) continue;

    const headingWithLine = { ...heading, line: index + 1 };
    headings.push(headingWithLine);

    if (heading.level === 1 && h1 === null) {
      h1 = headingWithLine;
    }

    if (heading.level === 2) {
      sections.push({
        ...headingWithLine,
        startLine: index + 1,
        endLine: lines.length,
        content: "",
      });
    }
  }

  for (let index = 0; index < sections.length; index += 1) {
    const current = sections[index];
    const next = sections[index + 1];
    current.endLine = next ? next.startLine - 1 : lines.length;
    current.content = lines.slice(current.startLine, current.endLine).join("\n").replace(/\n$/u, "");
  }

  return {
    sourcePath: normalizeMarkdownSourcePath(options.sourcePath),
    lineCount: lines.length,
    firstContentLine,
    h1,
    startsWithH1: Boolean(h1 && firstContentLine && h1.line === firstContentLine.line),
    sections,
    headings,
  };
}

/**
 * Returns section titles in their original document order.
 *
 * @param {{sections:Array<{title:string}>}} parsedBody - Parsed body metadata.
 * @returns {string[]} Ordered section titles.
 */
export function getMarkdownSectionTitles(parsedBody) {
  return Array.isArray(parsedBody?.sections) ? parsedBody.sections.map((section) => section.title) : [];
}

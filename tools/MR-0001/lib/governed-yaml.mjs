import fs from "node:fs";

/**
 * @file Parser YAML ristretto condiviso per i registri governati.
 *
 * @implementsRequirement MR-0001ADR-0004REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0004
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Parses only the deterministic YAML subset used by current governed
 * registries. It is not a general-purpose YAML implementation and deliberately
 * rejects unsupported or ambiguous structures.
 *
 * Side effects: readGovernedYamlFile reads one UTF-8 file; parsing functions
 * have no side effects.
 */

/** @param {string} value @returns {string} */
function stripQuotes(value) {
  const trimmed = String(value ?? "").trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

/**
 * Parses one scalar supported by governed registries.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string|number|boolean|null|Array<unknown>|Record<string, unknown>}
 */
function parseScalar(value) {
  const trimmed = String(value ?? "").trim();

  if (trimmed === "[]") return [];
  if (trimmed === "{}") return {};
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+$/u.test(trimmed)) return Number.parseInt(trimmed, 10);

  return stripQuotes(trimmed);
}

/** @param {string} line @returns {number} */
function countIndent(line) {
  if (/^\t+/u.test(line) || /^ *\t/u.test(line)) {
    throw new Error("Tabs are not supported for YAML indentation.");
  }

  return line.match(/^ */u)?.[0].length ?? 0;
}

/**
 * Assigns one mapping key and rejects duplicate keys rather than silently
 * replacing an earlier governed value.
 *
 * @param {Record<string, unknown>} parent - Mapping receiving the value.
 * @param {string} key - YAML mapping key.
 * @param {unknown} value - Parsed value.
 * @param {number} lineNumber - One-based source line number.
 * @returns {void}
 */
function assignMappingValue(parent, key, value, lineNumber) {
  if (Object.prototype.hasOwnProperty.call(parent, key)) {
    throw new Error(`Duplicate YAML mapping key "${key}" at line ${lineNumber}.`);
  }

  parent[key] = value;
}

/**
 * Parses the deterministic YAML subset used by ThreatForge registries.
 *
 * Supported constructs: mappings, sequences, simple scalars, empty arrays and
 * objects, and literal block scalars introduced by `|`.
 *
 * @param {string} text - Governed YAML text.
 * @returns {Record<string, unknown>} Parsed root mapping.
 */
export function parseGovernedYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = String(text ?? "")
    .replace(/^\uFEFF/u, "")
    .replace(/\r\n?/gu, "\n")
    .split("\n");

  function getParent(indent) {
    while (
      stack.length > 1 &&
      stack[stack.length - 1].indent >= indent
    ) {
      stack.pop();
    }

    return stack[stack.length - 1].value;
  }

  function nextMeaningfulLine(startIndex) {
    for (
      let index = startIndex + 1;
      index < lines.length;
      index += 1
    ) {
      const candidate = lines[index];

      if (
        candidate.trim() &&
        !candidate.trimStart().startsWith("#")
      ) {
        return candidate;
      }
    }

    return "";
  }

  function readBlock(startIndex, baseIndent) {
    const block = [];
    let index = startIndex;

    while (index + 1 < lines.length) {
      const next = lines[index + 1];
      const nextIndent = countIndent(next);

      if (next.trim() && nextIndent <= baseIndent) break;

      index += 1;
      block.push(
        next.slice(Math.min(baseIndent + 2, next.length)),
      );
    }

    return {
      text: block.join("\n").replace(/\n$/u, ""),
      nextIndex: index,
    };
  }

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const raw = lines[index];

    if (
      !raw.trim() ||
      raw.trimStart().startsWith("#")
    ) {
      continue;
    }

    const indent = countIndent(raw);
    const trimmed = raw.trim();

    if (trimmed.startsWith("- ")) {
      const parent = getParent(indent);

      if (!Array.isArray(parent)) {
        throw new Error(
          `Invalid YAML sequence indentation at line ${index + 1}.`,
        );
      }

      const itemText = trimmed.slice(2).trim();
      const colonIndex = itemText.indexOf(":");

      if (colonIndex === -1) {
        parent.push(parseScalar(itemText));
        continue;
      }

      const key = itemText.slice(0, colonIndex).trim();
      const rawValue = itemText
        .slice(colonIndex + 1)
        .trim();

      if (!key) {
        throw new Error(
          `Missing YAML sequence mapping key at line ${index + 1}.`,
        );
      }

      const item = {};
      parent.push(item);

      if (rawValue === "|") {
        const block = readBlock(index, indent);
        assignMappingValue(item, key, block.text, index + 1);
        index = block.nextIndex;
      } else if (rawValue === "") {
        const nextLine = nextMeaningfulLine(index);
        const value = nextLine.trim().startsWith("- ")
          ? []
          : {};

        assignMappingValue(item, key, value, index + 1);
        stack.push({ indent, value: item });
        stack.push({
          indent: indent + 2,
          value,
        });
      } else {
        assignMappingValue(item, key, parseScalar(rawValue), index + 1);
        stack.push({ indent, value: item });
      }

      continue;
    }

    const colonIndex = trimmed.indexOf(":");

    if (colonIndex === -1) {
      throw new Error(
        `Invalid YAML mapping entry at line ${index + 1}.`,
      );
    }

    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed
      .slice(colonIndex + 1)
      .trim();

    if (!key) {
      throw new Error(
        `Missing YAML mapping key at line ${index + 1}.`,
      );
    }

    const parent = getParent(indent);

    if (
      !parent ||
      typeof parent !== "object" ||
      Array.isArray(parent)
    ) {
      throw new Error(
        `Invalid YAML mapping parent at line ${index + 1}.`,
      );
    }

    if (rawValue === "|") {
      const block = readBlock(index, indent);
      assignMappingValue(parent, key, block.text, index + 1);
      index = block.nextIndex;
    } else if (rawValue === "") {
      const nextLine = nextMeaningfulLine(index);
      const value = nextLine.trim().startsWith("- ")
        ? []
        : {};

      assignMappingValue(parent, key, value, index + 1);
      stack.push({ indent, value });
    } else {
      assignMappingValue(parent, key, parseScalar(rawValue), index + 1);
    }
  }

  return root;
}

/**
 * Reads and parses one governed UTF-8 YAML file.
 *
 * The caller remains responsible for selecting and validating the canonical
 * repository-relative source path.
 *
 * @param {string} filePath - File-system path selected by the caller.
 * @returns {Record<string, unknown>} Parsed root mapping.
 */
export function readGovernedYamlFile(filePath) {
  const normalized = String(filePath ?? "").trim();

  if (!normalized) {
    throw new Error(
      "Governed YAML file path must not be empty.",
    );
  }

  if (!fs.existsSync(normalized)) {
    throw new Error(
      `Governed YAML file is missing: ${normalized}`,
    );
  }

  const stat = fs.statSync(normalized);

  if (!stat.isFile()) {
    throw new Error(
      `Governed YAML path is not a file: ${normalized}`,
    );
  }

  try {
    return parseGovernedYaml(
      fs.readFileSync(normalized, "utf8"),
    );
  } catch (error) {
    throw new Error(
      `Cannot parse governed YAML file ${normalized}: ${error.message}`,
    );
  }
}

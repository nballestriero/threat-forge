import {
  governedEntityReferenceRuleIds,
} from "../../MR-0001/lib/governed-entity-references.mjs";

/**
 * @file Governed entity reference diagnostics, hover and quick-fix projection.
 *
 * @implementsRequirement MR-0002ADR-0006REQ-0004
 * @implementsRequirement MR-0002ADR-0006REQ-0004GOV-0001
 * @implementsRequirement MR-0001ADR-0008REQ-0001
 * @implementsRequirement MR-0001ADR-0008REQ-0002
 * @derivedFromDecision MR-0002/ADR-0006
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Applies the shared governed reference service only to positions declared by
 * the applicable body profile. This module adds diagnostics, BAE hover details
 * and canonical-title quick fixes without creating entities or mutating files.
 */

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function normalizeAllowedPrefix(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const key = String(Object.keys(value)[0] ?? "")
      .replace(/^["']+/u, "")
      .replace(/["']+$/u, "")
      .replace(/:+$/u, "")
      .trim();
    if (key) return `${key}:`;
  }
  return "";
}

function referencePayloadFromLine(line, position) {
  if (position.container_kind !== "classified_list_item") return null;
  const prefixes = Array.isArray(position.allowed_prefixes)
    ? position.allowed_prefixes
        .map(normalizeAllowedPrefix)
        .filter(Boolean)
    : [];
  if (prefixes.length === 0) return null;
  const alternation = [...prefixes]
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join("|");
  const match = String(line).match(
    new RegExp(`^\\s*-\\s*(?:${alternation})\\s+(.+)$`, "u"),
  );
  if (!match) return null;

  let payload = match[1];
  const startCharacter = String(line).length - payload.length;
  let endCharacter = String(line).length;
  if (position.terminal_punctuation === "period" && payload.endsWith(".")) {
    payload = payload.slice(0, -1);
    endCharacter -= 1;
  }
  return { payload, startCharacter, endCharacter };
}

function hoverMarkdown(result) {
  const entity = result.entity ?? {};
  const origin = entity.origin ?? {};
  const provenance = Array.isArray(entity.provenance)
    ? entity.provenance
    : [];
  const lines = [
    `**${String(entity.id ?? "")} — ${String(entity.title ?? "")}**`,
    `Entity type: \`${String(result.entity_type ?? "")}\``,
    `Base type: \`${String(entity.base_type ?? "")}\``,
    `Lifecycle: \`${String(entity.lifecycle_state ?? "")}\``,
    "",
    String(entity.meaning ?? ""),
    "",
    `Origin: \`${String(origin.kind ?? "")}\` · \`${String(
      origin.source_id ?? "",
    )}\``,
    `Source: \`${String(origin.source_path ?? "")}\``,
  ];
  if (provenance.length > 0) {
    lines.push(
      "",
      "**Provenance**",
      ...provenance.map(
        (entry) =>
          `- \`${String(entry.relation ?? "")}\` · \`${String(
            entry.source_id ?? "",
          )}\` · \`${String(entry.source_path ?? "")}\``,
      ),
    );
  }
  return lines.join("\n");
}

/**
 * Adds governed reference assistance to the mutable result accumulators owned by
 * the editor-independent Markdown core.
 *
 * @param {Record<string, unknown>} input - Analysis context and accumulators.
 * @returns {{positions_checked: number, references_checked: number}}
 */
export function applyGovernedMarkdownReferenceAssistance(input) {
  const profile = input?.profile ?? {};
  const parsed = input?.parsed ?? {};
  const record = input?.record ?? {};
  const referenceService = input?.referenceService;
  const diagnostics = input?.diagnostics;
  const hovers = input?.hovers;
  const quickFixes = input?.quickFixes;
  const lineRange = input?.lineRange;

  if (
    !referenceService ||
    !Array.isArray(profile.reference_positions) ||
    !Array.isArray(parsed.sections) ||
    !Array.isArray(parsed.lines)
  ) {
    return { positions_checked: 0, references_checked: 0 };
  }

  const sectionProfileById = new Map(
    (profile.sections ?? []).map((section) => [String(section.id), section]),
  );
  let positionsChecked = 0;
  let referencesChecked = 0;

  for (const position of profile.reference_positions) {
    positionsChecked += 1;
    const sectionProfile = sectionProfileById.get(String(position.section_id));
    if (!sectionProfile) continue;
    const occurrences = parsed.sections.filter(
      (section) => section.heading === sectionProfile.heading,
    );
    for (const occurrence of occurrences) {
      for (
        let lineIndex = occurrence.lineIndex + 1;
        lineIndex <= occurrence.endLineIndex;
        lineIndex += 1
      ) {
        const extracted = referencePayloadFromLine(
          parsed.lines[lineIndex] ?? "",
          position,
        );
        if (!extracted) continue;
        const result = referenceService.analyzePayload({
          payload: extracted.payload,
          allowedEntityTypes: position.allowed_entity_types ?? [],
          currentDocument: record,
          positionId: String(position.id ?? ""),
        });
        if (!result.recognized) continue;
        referencesChecked += 1;

        const range = lineRange(
          parsed.lines,
          lineIndex,
          extracted.startCharacter,
          extracted.endCharacter,
        );
        let quickFixId = null;
        if (
          result.canonical_payload &&
          result.diagnostics?.some(
            (entry) =>
              entry.rule_id ===
              governedEntityReferenceRuleIds.titleDivergence,
          )
        ) {
          quickFixId = `replace-governed-reference:${lineIndex}:${String(
            result.parsed?.id ?? "",
          )}`;
          quickFixes.set(quickFixId, {
            id: quickFixId,
            title: `Restore canonical reference title for ${String(
              result.parsed?.id ?? "",
            )}`,
            edits: [
              {
                range,
                new_text: result.canonical_payload,
              },
            ],
          });
        }

        for (const item of result.diagnostics ?? []) {
          diagnostics.push({
            rule_id: item.rule_id,
            severity: "error",
            message: item.message,
            range,
            quick_fix_ids:
              quickFixId &&
              item.rule_id ===
                governedEntityReferenceRuleIds.titleDivergence
                ? [quickFixId]
                : [],
          });
        }
        if (result.entity) {
          hovers.unshift({
            range,
            markdown: hoverMarkdown(result),
          });
        }
      }
    }
  }

  return {
    positions_checked: positionsChecked,
    references_checked: referencesChecked,
  };
}

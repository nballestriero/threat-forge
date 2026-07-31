import fs from "node:fs";

import {
  parseMarkdownDocument,
  readUtf8,
  resolveSafeProjectPath,
} from "./governed-document-model-validation.mjs";
import { matchesGovernedRequirementVariantIdentity } from "./governed-document-model-sources.mjs";

/**
 * @file Security Requirement cross-model relation provider.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Resolves the Functional parent and Common Finding references through an
 * injected governed entity reference service. The provider consumes only the
 * methodology-neutral Common Finding relation projection and never executes or
 * requires a methodology plugin.
 */

export const securityRequirementCrossModelRuleIds = Object.freeze({
  parent: "security-requirement.cross-model.parent",
  parentBody: "security-requirement.cross-model.parent-body",
  findingResolution: "security-requirement.cross-model.finding.resolution",
  findingAccepted: "security-requirement.cross-model.finding.accepted",
  findingAffectedParent:
    "security-requirement.cross-model.finding.affected-parent",
  findingProvenance: "security-requirement.cross-model.finding.provenance",
});

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function classifiedPayload(item, prefix) {
  const value = text(item);
  return value.startsWith(`${prefix} `) ? value.slice(prefix.length + 1) : "";
}

function sectionByHeading(parsed, heading) {
  return parsed.sections.find((section) => section.heading === heading) ?? null;
}

function push(context, ruleId, entry, location, message) {
  context.pushDiagnostic(
    ruleId,
    "logical_model",
    entry.sourcePath,
    location,
    message,
  );
}

/**
 * Creates the explicit Security Requirement cross-model provider.
 *
 * @param {{referenceService: {analyzePayload: Function}}} input - Reference service.
 * @returns {Readonly<Record<string, unknown>>} Cross-model provider.
 */
export function createSecurityRequirementCrossModelProvider(input) {
  const referenceService = input?.referenceService;
  if (!referenceService || typeof referenceService.analyzePayload !== "function") {
    throw new TypeError(
      "Security Requirement cross-model provider requires a governed reference service.",
    );
  }

  return Object.freeze({
    model_id: "security-requirement",
    collect() {},
    validate(context, entry) {
      const record = entry.record ?? {};
      const id = text(record.id);
      const macroRequirementId = text(record.macro_requirement_id);
      const decisionId = text(record.decision_id);
      const parentMetadata = entry.variant?.parent_requirement;
      const parentId = text(record[parentMetadata?.field_name]);
      const parentEntry = context.recordsByModelId
        .get(text(parentMetadata?.parent_model_id))
        ?.get(parentId);
      const parent = parentEntry?.record ?? null;
      const parentValid =
        matchesGovernedRequirementVariantIdentity(entry.variant, id) &&
        Boolean(parent) &&
        (parentMetadata?.identity_prefix_required !== true || id.startsWith(parentId)) &&
        (parentMetadata?.same_macro_requirement !== true ||
          text(parent?.macro_requirement_id) === macroRequirementId) &&
        (parentMetadata?.same_decision !== true ||
          text(parent?.decision_id) === decisionId) &&
        macroRequirementId === entry.rootMacroRequirementId &&
        macroRequirementId === entry.declaredOwnerId;

      if (!parentValid) {
        push(
          context,
          securityRequirementCrossModelRuleIds.parent,
          entry,
          `${entry.sourceLocation}/parent_requirement_id`,
          `Security Requirement ${id || "<unknown>"} must resolve to the Functional Requirement encoded by its SEC identity and preserve the same Macro-requirement and Decision chain.`,
        );
      }

      const bodyPath = text(record.body_path);
      let parsed;
      try {
        const resolved = resolveSafeProjectPath(context.rootDir, bodyPath);
        if (!fs.existsSync(resolved.absolute)) throw new Error("body source is missing");
        parsed = parseMarkdownDocument(readUtf8(resolved.absolute));
      } catch (error) {
        push(
          context,
          securityRequirementCrossModelRuleIds.parentBody,
          entry,
          `${entry.sourceLocation}/body_path`,
          `Security Requirement cross-model references cannot be read: ${error.message}.`,
        );
        return;
      }

      const currentDocument = {
        id,
        model_id: "security-requirement",
        macro_requirement_id: macroRequirementId,
        decision_id: decisionId,
        parent_requirement_id: parentId,
      };
      const parentSection = sectionByHeading(parsed, "Parent Functional Requirement");
      const parentPayload = classifiedPayload(parentSection?.items?.[0], "Parent:");
      const parentResult = referenceService.analyzePayload({
        payload: parentPayload,
        allowedEntityTypes: ["functional_requirement"],
        currentDocument,
        positionId:
          "security-requirement.body.reference.parent-functional-requirement",
      });
      if (
        !parentResult.valid ||
        text(parentResult.entity?.id) !== parentId ||
        text(parentResult.entity?.title) !== text(parent?.title)
      ) {
        push(
          context,
          securityRequirementCrossModelRuleIds.parentBody,
          entry,
          bodyPath,
          "Security Requirement body parent reference must resolve canonically to parent_requirement_id and its authoritative Functional Requirement title.",
        );
      }

      const findingSection = sectionByHeading(parsed, "Finding derivation");
      for (const [index, item] of (findingSection?.items ?? []).entries()) {
        const payload = classifiedPayload(item, "Finding:");
        const result = referenceService.analyzePayload({
          payload,
          allowedEntityTypes: ["common_analysis_finding"],
          currentDocument,
          positionId: "security-requirement.body.reference.finding-derivation",
        });
        const location = `${bodyPath}#finding-${index + 1}`;
        if (!result.valid) {
          const ineligible = (result.diagnostics ?? []).some(
            (diagnostic) =>
              diagnostic.rule_id === "governed-reference.ineligible-entity",
          );
          push(
            context,
            ineligible
              ? securityRequirementCrossModelRuleIds.findingAccepted
              : securityRequirementCrossModelRuleIds.findingResolution,
            entry,
            location,
            ineligible
              ? "Every Common Finding referenced by a Security Requirement must have explicit review_state accepted."
              : "Every Common Finding reference must resolve uniquely with its canonical title through the common analysis model boundary.",
          );
          continue;
        }

        const finding = result.entity ?? {};
        const affected = Array.isArray(finding.affected_subjects)
          ? finding.affected_subjects
          : [];
        if (
          !affected.some(
            (subject) =>
              text(subject?.kind) === "functional_requirement" &&
              text(subject?.id) === parentId,
          )
        ) {
          push(
            context,
            securityRequirementCrossModelRuleIds.findingAffectedParent,
            entry,
            location,
            `Common Finding ${text(finding.id) || "<unknown>"} must identify parent Functional Requirement ${parentId || "<empty>"} among its affected governed subjects.`,
          );
        }
        if (
          !/^ANALYSIS-\d{4}$/u.test(text(finding.analysis_record_id)) ||
          !text(finding.source_path)
        ) {
          push(
            context,
            securityRequirementCrossModelRuleIds.findingProvenance,
            entry,
            location,
            `Common Finding ${text(finding.id) || "<unknown>"} must preserve one originating Analysis Record and canonical repository source path.`,
          );
        }
      }
    },
  });
}

#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { loadGovernedDocumentModelSourceSet } from "./lib/governed-document-model-sources.mjs";
import {
  createGovernedEntityReferenceService,
  loadGovernedEntityResolverRegistry,
} from "./lib/governed-entity-references.mjs";
import { loadAndValidateBaseAnalysisRegistry } from "../MR-0003/lib/base-analysis-registry.mjs";
import {
  evaluateBaseAnalysisReferenceEligibility,
} from "../MR-0003/lib/base-analysis-reference-eligibility.mjs";

/**
 * @file Canonical governed entity reference consistency checker.
 *
 * @implementsRequirement MR-0001ADR-0008REQ-0001
 * @implementsRequirement MR-0001ADR-0008REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0008REQ-0002
 * @implementsRequirement MR-0001ADR-0008REQ-0002GOV-0001
 * @implementsRequirement MR-0003ADR-0002REQ-0001
 * @implementsRequirement MR-0003ADR-0002REQ-0001GOV-0001
 * @derivedFromDecision MR-0001/ADR-0008
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = process.env.TF_GOVERNED_ENTITY_REFERENCES_ROOT
  ? path.resolve(process.env.TF_GOVERNED_ENTITY_REFERENCES_ROOT)
  : path.resolve(scriptDir, "..", "..");

function parseTestCount(output) {
  const match = String(output ?? "").match(/(?:#|ℹ)\s*tests\s+(\d+)/u);
  return match ? Number(match[1]) : 0;
}

function verifyProfiles(activeEntityTypes) {
  const sourceSet = loadGovernedDocumentModelSourceSet({ rootDir });
  const profiles = sourceSet.profiles.filter(
    (entry) => entry.value.representation_kind === "markdown_body",
  );
  let positionCount = 0;
  for (const entry of profiles) {
    const profile = entry.value;
    if (!Array.isArray(profile.reference_positions)) {
      throw new Error(
        `Markdown profile ${profile.profile_id} must declare reference_positions.`,
      );
    }
    const sectionIds = new Set(
      (profile.sections ?? []).map((section) => String(section.id)),
    );
    for (const position of profile.reference_positions) {
      positionCount += 1;
      if (!sectionIds.has(String(position.section_id))) {
        throw new Error(
          `Reference position ${position.id} targets unknown section ${position.section_id}.`,
        );
      }
      if (position.container_kind !== "classified_list_item") {
        throw new Error(
          `Reference position ${position.id} uses unsupported container ${position.container_kind}.`,
        );
      }
      if (
        !Array.isArray(position.allowed_prefixes) ||
        position.allowed_prefixes.length === 0
      ) {
        throw new Error(
          `Reference position ${position.id} must declare allowed_prefixes.`,
        );
      }
      for (const entityType of position.allowed_entity_types ?? []) {
        if (!activeEntityTypes.has(String(entityType))) {
          throw new Error(
            `Reference position ${position.id} allows unregistered entity type ${entityType}.`,
          );
        }
      }
    }
  }
  return { profiles: profiles.length, positions: positionCount };
}

try {
  const bae = loadAndValidateBaseAnalysisRegistry({ rootDir });
  if (!bae.valid) {
    throw new Error(
      `Canonical BAE registry is invalid: ${bae.errors
        .map((entry) => `${entry.rule_id}: ${entry.message}`)
        .join(" | ")}`,
    );
  }
  const registry = loadGovernedEntityResolverRegistry({ rootDir });
  const service = createGovernedEntityReferenceService({
    registry,
    sourceProjectionProviders: new Map([
      ["base-analysis-registry-reference-source", () => bae.projection],
    ]),
    eligibilityProviders: new Map([
      [
        "base-analysis-documentary-precedence",
        ({ currentDocument, entity }) =>
          evaluateBaseAnalysisReferenceEligibility({
            currentDocument,
            entity,
            documentsByPath: new Map(),
          }),
      ],
    ]),
  });
  const activeEntityTypes = new Set(
    service.validation.active_resolvers.map((entry) =>
      String(entry.entity_type),
    ),
  );
  const profileResult = verifyProfiles(activeEntityTypes);
  const testResult = spawnSync(
    process.execPath,
    [
      "--test",
      path.resolve(
        rootDir,
        "tools/MR-0001/test/governed-entity-references.test.mjs",
      ),
      path.resolve(
        rootDir,
        "tools/MR-0003/test/base-analysis-reference-eligibility.test.mjs",
      ),
    ],
    {
      cwd: rootDir,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
    },
  );
  if (testResult.error || testResult.status !== 0) {
    throw new Error(
      `Governed entity reference tests failed:\n${testResult.stdout ?? ""}\n${testResult.stderr ?? ""}`,
    );
  }
  const testCount = parseTestCount(
    `${testResult.stdout ?? ""}\n${testResult.stderr ?? ""}`,
  );
  if (testCount < 21) {
    throw new Error(
      `Governed entity reference verification count is incomplete: ${testCount}.`,
    );
  }

  console.log("Governed entity reference check passed.");
  console.log("Implemented requirement: MR-0001ADR-0008REQ-0001");
  console.log("Implemented requirement: MR-0001ADR-0008REQ-0001GOV-0001");
  console.log("Implemented requirement: MR-0001ADR-0008REQ-0002");
  console.log("Implemented requirement: MR-0001ADR-0008REQ-0002GOV-0001");
  console.log("Implemented requirement: MR-0003ADR-0002REQ-0001");
  console.log(
    "Implemented requirement: MR-0003ADR-0002REQ-0001GOV-0001",
  );
  console.log(`Resolvers checked: ${service.validation.active_resolvers.length}`);
  console.log(`Markdown profiles checked: ${profileResult.profiles}`);
  console.log(`Reference positions checked: ${profileResult.positions}`);
  console.log(`Reference tests checked: ${testCount}`);
  console.log("Warnings: 0");
  console.log("Errors: 0");
} catch (error) {
  console.error("Governed entity reference check failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

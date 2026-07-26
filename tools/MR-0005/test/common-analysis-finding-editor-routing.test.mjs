import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCommonAnalysisFindingEditorRoutingProjection,
  commonAnalysisFindingEditorRoutingRequirementId,
  mergeCommonAnalysisFindingEditorRouting,
  validateCommonAnalysisFindingEditorRouting,
} from "../lib/common-analysis-finding-editor-routing.mjs";

/**
 * @file Common Finding editor routing verification.
 *
 * @implementsRequirement MR-0005ADR-0002REQ-0001GOV-0004
 * @derivedFromDecision MR-0005/ADR-0002
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Verifies canonical routing derivation, deterministic settings merging and
 * rejection of missing, stale, divergent or duplicate schema associations.
 */

test("derives Common Finding routing and schema from canonical metadata", () => {
  const projection =
    buildCommonAnalysisFindingEditorRoutingProjection();

  assert.equal(
    projection.requirementId,
    commonAnalysisFindingEditorRoutingRequirementId,
  );
  assert.equal(
    projection.schemaProjectPath,
    ".vscode/schemas/common-analysis-finding.schema.json",
  );
  assert.equal(
    projection.schemaAssociationKey,
    "./.vscode/schemas/common-analysis-finding.schema.json",
  );
  assert.equal(
    projection.fileGlob,
    "**/*.analysis-finding.yml",
  );
  assert.deepEqual(
    JSON.parse(projection.schemaText),
    projection.schema,
  );
  assert.equal(
    projection.schema["x-threatforge"].file_glob,
    projection.fileGlob,
  );
});

test("merges exactly one canonical route while preserving unrelated settings", () => {
  const projection =
    buildCommonAnalysisFindingEditorRoutingProjection();

  const settings = {
    "editor.tabSize": 2,
    "yaml.schemas": {
      "./.vscode/schemas/unrelated.schema.json": [
        "**/*.unrelated.yml",
      ],
      "./.vscode/schemas/stale-common-finding.schema.json": [
        projection.fileGlob,
        "**/*.preserved.yml",
      ],
    },
  };

  const merged =
    mergeCommonAnalysisFindingEditorRouting(settings);

  assert.equal(merged["editor.tabSize"], 2);
  assert.deepEqual(
    merged["yaml.schemas"][
      "./.vscode/schemas/unrelated.schema.json"
    ],
    ["**/*.unrelated.yml"],
  );
  assert.deepEqual(
    merged["yaml.schemas"][
      "./.vscode/schemas/stale-common-finding.schema.json"
    ],
    ["**/*.preserved.yml"],
  );
  assert.deepEqual(
    merged["yaml.schemas"][projection.schemaAssociationKey],
    [projection.fileGlob],
  );

  assert.equal(
    validateCommonAnalysisFindingEditorRouting(merged)
      .schemaAssociationKey,
    projection.schemaAssociationKey,
  );
});

test("rejects missing, stale and duplicate Common Finding routes", () => {
  const projection =
    buildCommonAnalysisFindingEditorRoutingProjection();

  assert.throws(() =>
    validateCommonAnalysisFindingEditorRouting({
      "yaml.schemas": {},
    }));

  assert.throws(() =>
    validateCommonAnalysisFindingEditorRouting({
      "yaml.schemas": {
        [projection.schemaAssociationKey]: [
          "**/*.wrong-analysis-finding.yml",
        ],
      },
    }));

  assert.throws(() =>
    validateCommonAnalysisFindingEditorRouting({
      "yaml.schemas": {
        [projection.schemaAssociationKey]: [
          projection.fileGlob,
        ],
        "./.vscode/schemas/duplicate.schema.json": [
          projection.fileGlob,
        ],
      },
    }));
});

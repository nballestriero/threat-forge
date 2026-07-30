import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildGovernedDocumentCrossModelProviderCatalog,
  governedDocumentCrossModelProviderModelIds,
  governedDocumentCrossModelProviders,
} from "../lib/governed-document-cross-model-providers.mjs";
import {
  canonicalGovernedDocumentModelIds,
  loadGovernedDocumentModelSourceSet,
  validateGovernedDocumentModelSourceSet,
} from "../lib/governed-document-model-sources.mjs";

/**
 * @file Extension-readiness verification for cross-model relation providers.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0007
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 */

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);

function field(id, name, order) {
  return {
    id,
    name,
    order,
    cardinality: "exactly_one",
    value_kind: "single_line_text",
    source_kind: "authored",
  };
}

function extendSourceSet(sourceSet) {
  const extended = structuredClone(sourceSet);
  const modelId = "synthetic-extension";
  const registryProfileId = "synthetic-extension-registry";
  const bodyProfileId = "synthetic-extension-body";
  const registryPath =
    "docs/reference/project-model/registers/document-models/profiles/synthetic-extension-registry.profile.yml";
  const bodyPath =
    "docs/reference/project-model/registers/document-models/profiles/synthetic-extension-body.profile.yml";
  const definitionPath =
    "docs/reference/project-model/registers/document-models/models/synthetic-extension.model.yml";

  const registryProfile = {
    schema_version: 1,
    profile_id: registryProfileId,
    title: "Synthetic extension YAML registry",
    representation_kind: "yaml_registry",
    applies_to_model_ids: [modelId],
    source_path_pattern: "docs/synthetic-extension.registry.yml",
    unknown_root_fields: "forbidden",
    unknown_record_fields: "forbidden",
    root_fields: [
      {
        ...field(
          "synthetic-extension.registry.root.schema-version",
          "schema_version",
          1,
        ),
        value_kind: "positive_integer",
        source_kind: "format_managed",
        fixed_value: 1,
      },
    ],
    record_fields: [
      field("synthetic-extension.registry.record.id", "id", 1),
      field("synthetic-extension.registry.record.title", "title", 2),
    ],
  };
  const bodyProfile = {
    schema_version: 1,
    profile_id: bodyProfileId,
    title: "Synthetic extension Markdown body",
    representation_kind: "markdown_body",
    applies_to_model_ids: [modelId],
    source_path_pattern: "docs/synthetic-extension-body.md",
    unknown_sections: "forbidden",
    header: {
      id: "synthetic-extension.body.header",
      level: 1,
      order: 1,
      cardinality: "exactly_one",
      content_kind: "governed_identity_heading",
      template: "# {id} — {title}",
      members: [
        { id: "synthetic-extension.body.header.id" },
        { id: "synthetic-extension.body.header.title" },
      ],
    },
    sections: [
      {
        id: "synthetic-extension.body.section.intent",
        heading: "Intent",
        order: 1,
        cardinality: "exactly_one",
        content_kind: "prose",
      },
    ],
  };
  const model = {
    schema_version: 1,
    model_id: modelId,
    title: "Synthetic extension",
    description: "Synthetic model used only to prove consumer extensibility.",
    registry_profile_id: registryProfileId,
    body_profile_id: bodyProfileId,
    identity: {
      registry_id_member_id: "synthetic-extension.registry.record.id",
      body_id_member_id: "synthetic-extension.body.header.id",
      registry_title_member_id: "synthetic-extension.registry.record.title",
      body_title_member_id: "synthetic-extension.body.header.title",
    },
    coherence_rules: [
      {
        id: "synthetic-extension.model.header.identity",
        kind: "mirrored_identity",
        source_member_id: "synthetic-extension.registry.record.id",
        target_member_id: "synthetic-extension.body.header.id",
      },
    ],
  };

  extended.index.value.models.push({
    id: modelId,
    title: model.title,
    definition_path: definitionPath,
    registry_profile_id: registryProfileId,
    body_profile_id: bodyProfileId,
  });
  extended.index.value.representation_profiles.push(
    {
      id: registryProfileId,
      title: registryProfile.title,
      representation_kind: "yaml_registry",
      profile_path: registryPath,
      applies_to_model_ids: [modelId],
    },
    {
      id: bodyProfileId,
      title: bodyProfile.title,
      representation_kind: "markdown_body",
      profile_path: bodyPath,
      applies_to_model_ids: [modelId],
    },
  );
  extended.models.push({ path: definitionPath, value: model });
  extended.profiles.push(
    { path: registryPath, value: registryProfile },
    { path: bodyPath, value: bodyProfile },
  );
  return extended;
}

test("covers the current canonical inventory exactly", () => {
  const sourceSet = loadGovernedDocumentModelSourceSet({
    rootDir: repositoryRoot,
  });
  const catalog = buildGovernedDocumentCrossModelProviderCatalog(sourceSet);
  assert.deepEqual(
    catalog.provider_model_ids,
    canonicalGovernedDocumentModelIds(sourceSet),
  );
  assert.deepEqual(
    catalog.provider_model_ids,
    governedDocumentCrossModelProviderModelIds,
  );
});

test("a coherent model extension exposes the missing cross-model provider", () => {
  const sourceSet = loadGovernedDocumentModelSourceSet({
    rootDir: repositoryRoot,
  });
  const extended = extendSourceSet(sourceSet);
  const before = structuredClone(extended);
  assert.deepEqual(validateGovernedDocumentModelSourceSet(extended), []);
  assert.throws(
    () => buildGovernedDocumentCrossModelProviderCatalog(extended),
    /document-model\.consumer\.provider\.missing: Consumer governed-document-cross-model-coherence has no provider for canonical model synthetic-extension\./u,
  );
  assert.deepEqual(extended, before);
});

test("the same extension is accepted after one explicit provider is supplied", () => {
  const sourceSet = loadGovernedDocumentModelSourceSet({
    rootDir: repositoryRoot,
  });
  const extended = extendSourceSet(sourceSet);
  const syntheticProvider = Object.freeze({
    model_id: "synthetic-extension",
    collect() {},
    validate() {},
  });
  const providers = [...governedDocumentCrossModelProviders, syntheticProvider];
  const originalProviders = [...providers];
  const catalog = buildGovernedDocumentCrossModelProviderCatalog(
    extended,
    providers,
  );
  assert.deepEqual(
    catalog.provider_model_ids,
    canonicalGovernedDocumentModelIds(extended),
  );
  assert.deepEqual(providers, originalProviders);
});

test("duplicate and unregistered cross-model providers fail deterministically", () => {
  const sourceSet = loadGovernedDocumentModelSourceSet({
    rootDir: repositoryRoot,
  });
  assert.throws(
    () =>
      buildGovernedDocumentCrossModelProviderCatalog(sourceSet, [
        ...governedDocumentCrossModelProviders,
        governedDocumentCrossModelProviders[0],
      ]),
    /document-model\.consumer\.provider\.duplicate/u,
  );
  assert.throws(
    () =>
      buildGovernedDocumentCrossModelProviderCatalog(sourceSet, [
        ...governedDocumentCrossModelProviders,
        { model_id: "unregistered", collect() {}, validate() {} },
      ]),
    /document-model\.consumer\.provider\.unregistered/u,
  );
});

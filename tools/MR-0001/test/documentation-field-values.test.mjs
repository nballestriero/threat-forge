import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDocumentationFieldValueCatalog,
  documentationFieldValuesRegistryProjectPath,
  getDocumentationFieldValueSetByName,
  loadDocumentationFieldValueCatalog,
  resolveDocumentationFieldValue,
  resolveDocumentationFieldValueSet,
} from "../lib/documentation-field-values.mjs";
import { readGovernedYamlFile } from "../lib/governed-yaml.mjs";

/**
 * @file Verifica del catalogo e resolver dei campi controllati.
 *
 * @implementsRequirement MR-0001ADR-0004REQ-0002
 * @derivedFromDecision MR-0001/ADR-0004
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Verifies canonical provenance, metadata preservation, deterministic catalog
 * generation and strict contextual resolution without inferred values or
 * fallback aliases.
 */

const testPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(testPath), "..", "..", "..");
const taxonomyPath = path.join(
  projectRoot,
  ...documentationFieldValuesRegistryProjectPath.split("/"),
);
const decisionRegistryPath =
  "docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml";

/** @returns {Record<string, unknown>} */
function readCanonicalTaxonomy() {
  return readGovernedYamlFile(taxonomyPath);
}

/** @param {Record<string, unknown>} taxonomy @param {string} name */
function findTaxonomyValueSet(taxonomy, name) {
  return taxonomy.field_value_sets.find((entry) => entry.name === name);
}

test("loads the canonical taxonomy and declares its provenance", () => {
  const catalog = loadDocumentationFieldValueCatalog({ rootDir: projectRoot });
  const taxonomy = readCanonicalTaxonomy();

  assert.equal(catalog.catalog_id, "documentation-field-value-catalog");
  assert.equal(
    catalog.canonical_source.registry_path,
    documentationFieldValuesRegistryProjectPath,
  );
  assert.equal(catalog.canonical_source.registry_id, taxonomy.registry_id);
  assert.equal(catalog.canonical_source.schema_version, taxonomy.schema_version);
  assert.equal(catalog.field_value_sets.length, taxonomy.field_value_sets.length);
});

test("preserves canonical value-set and value metadata without local copies", () => {
  const taxonomy = readCanonicalTaxonomy();
  const catalog = buildDocumentationFieldValueCatalog(taxonomy);
  const sourceValueSet = findTaxonomyValueSet(taxonomy, "requirement_type");
  const catalogValueSet = getDocumentationFieldValueSetByName(
    catalog,
    "requirement_type",
  );

  for (const [key, value] of Object.entries(sourceValueSet)) {
    if (key !== "values") assert.deepEqual(catalogValueSet[key], value);
  }

  for (const sourceValue of sourceValueSet.values) {
    const catalogValue = catalogValueSet.values.find(
      (entry) => entry.value === sourceValue.value,
    );

    assert.ok(catalogValue, `Missing canonical value ${sourceValue.value}.`);
    for (const [key, value] of Object.entries(sourceValue)) {
      assert.deepEqual(catalogValue[key], value);
    }
    assert.deepEqual(catalogValue.canonical_source, {
      registry_id: taxonomy.registry_id,
      registry_path: documentationFieldValuesRegistryProjectPath,
      value_set_id: sourceValueSet.id,
    });
  }
});

test("builds an immutable deterministic catalog without mutating its source", () => {
  const taxonomy = readCanonicalTaxonomy();
  const original = structuredClone(taxonomy);
  const reordered = structuredClone(taxonomy);

  reordered.field_value_sets.reverse();
  for (const valueSet of reordered.field_value_sets) valueSet.values.reverse();

  const catalog = buildDocumentationFieldValueCatalog(taxonomy);
  const reorderedCatalog = buildDocumentationFieldValueCatalog(reordered);

  assert.deepEqual(taxonomy, original);
  assert.deepEqual(reorderedCatalog, catalog);
  assert.ok(Object.isFrozen(catalog));
  assert.ok(Object.isFrozen(catalog.field_value_sets));
  assert.ok(Object.isFrozen(catalog.field_value_sets[0]));
  assert.ok(Object.isFrozen(catalog.field_value_sets[0].values[0]));
});

test("resolves canonical value sets and values by semantic and document context", () => {
  const catalog = loadDocumentationFieldValueCatalog({ rootDir: projectRoot });

  const byName = getDocumentationFieldValueSetByName(catalog, "decision_status");
  const byContext = resolveDocumentationFieldValueSet(catalog, {
    registryPath: `./${decisionRegistryPath.replaceAll("/", "\\")}`,
    recordType: "decisions",
    fieldName: "status",
  });
  const accepted = resolveDocumentationFieldValue(catalog, {
    registryPath: decisionRegistryPath,
    recordType: "decisions",
    fieldName: "status",
    value: "accepted",
  });

  assert.strictEqual(byContext, byName);
  assert.equal(accepted.value, "accepted");
  assert.match(accepted.meaning, /valid and applies/u);
  assert.equal(accepted.canonical_source.value_set_id, byName.id);
});

test("rejects unknown names, contexts and values instead of inferring fallbacks", () => {
  const catalog = loadDocumentationFieldValueCatalog({ rootDir: projectRoot });

  assert.throws(
    () => getDocumentationFieldValueSetByName(catalog, "invented_status"),
    /Unknown field value set name/u,
  );
  assert.throws(
    () => resolveDocumentationFieldValueSet(catalog, {
      registryPath:
        "docs/reference/project-model/registers/unknown.registry.yml",
      recordType: "unknown_records",
      fieldName: "status",
    }),
    /No controlled field value set matches context/u,
  );
  assert.throws(
    () => resolveDocumentationFieldValue(catalog, {
      registryPath: decisionRegistryPath,
      recordType: "decisions",
      fieldName: "status",
      value: "invented",
    }),
    /does not define controlled value invented/u,
  );
});

test("rejects duplicate canonical identities and applicability", () => {
  const taxonomy = readCanonicalTaxonomy();
  const decisionStatus = findTaxonomyValueSet(taxonomy, "decision_status");

  for (const mutation of [
    (duplicate) => { duplicate.name = "duplicate_decision_status"; },
    (duplicate) => { duplicate.id = "FIELD-VALUE-SET-9999"; },
    (duplicate) => {
      duplicate.id = "FIELD-VALUE-SET-9999";
      duplicate.name = "duplicate_decision_status";
    },
  ]) {
    const duplicateTaxonomy = structuredClone(taxonomy);
    const duplicate = structuredClone(decisionStatus);
    mutation(duplicate);
    duplicateTaxonomy.field_value_sets.push(duplicate);

    assert.throws(
      () => buildDocumentationFieldValueCatalog(duplicateTaxonomy),
      /Duplicate field value set (?:id|name|applicability)/u,
    );
  }
});

test("rejects overlapping applicability patterns at resolution time", () => {
  const taxonomy = readCanonicalTaxonomy();
  const broadTaxonomy = structuredClone(taxonomy);
  const broadValueSet = structuredClone(
    findTaxonomyValueSet(broadTaxonomy, "decision_status"),
  );

  broadValueSet.id = "FIELD-VALUE-SET-9999";
  broadValueSet.name = "broad_decision_status";
  broadValueSet.applies_to_registry =
    "docs/reference/project-model/registers/**";
  broadTaxonomy.field_value_sets.push(broadValueSet);

  const catalog = buildDocumentationFieldValueCatalog(broadTaxonomy);

  assert.throws(
    () => resolveDocumentationFieldValueSet(catalog, {
      registryPath: decisionRegistryPath,
      recordType: "decisions",
      fieldName: "status",
    }),
    /Ambiguous controlled field value set context/u,
  );
});

test("rejects unsafe canonical source paths before reading", () => {
  assert.throws(
    () => loadDocumentationFieldValueCatalog({
      rootDir: projectRoot,
      taxonomyProjectPath: "../outside.yml",
    }),
    /Canonical source path is unsafe/u,
  );
});

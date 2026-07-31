# Security Requirement implementation inventory draft

This file is a temporary implementation inventory for the Security Requirement milestone.

It is not a Macro-requirement, not a Decision, not a Requirement, not a canonical registry, not a governed body and not an implementation authorization. Canonical obligations remain owned by MR-0001/ADR-0009, MR-0001ADR-0009REQ-0001 and MR-0001ADR-0009REQ-0001GOV-0001. The existing milestone draft remains the workflow plan; this file records the baseline-specific inspection result.

Inspection date: 2026-07-30.

## 1. Inspected baseline

```text
69319ae — refactor: complete governed document model extensibility cleanup
master tracking origin/master
```

Operational scope is the repository root. `old/` is reference-only legacy material and is excluded from implementation scope.

## 2. Inspection conclusion

No new Decision or Requirement is needed before implementation.

Existing obligations cover the complete milestone:

- `MR-0001/ADR-0009` defines Security Requirement identity, Functional Requirement parentage, accepted Common Finding derivation and methodology independence.
- `MR-0001ADR-0009REQ-0001` governs the canonical model, shared Requirement registry variant, dedicated Markdown body, SEC identity, parent mirror, Finding references and reverse projection.
- `MR-0001ADR-0009REQ-0001GOV-0001` governs complete-model validation, cross-model coherence, stable diagnostics and negative fixtures.
- `MR-0001ADR-0008REQ-0002` and `MR-0001ADR-0008REQ-0002GOV-0001` govern the new Functional Requirement reference resolver and its source and eligibility providers.
- `MR-0001ADR-0010REQ-0002` and `MR-0001ADR-0010REQ-0002GOV-0001` govern exact provider coverage for every registry-derived consumer.
- `MR-0002ADR-0004REQ-0004` and `MR-0002ADR-0004REQ-0004GOV-0001` govern runtime authoring, preview, confirmation, atomic writes and rollback.
- `MR-0002ADR-0005REQ-0003` and `MR-0002ADR-0005REQ-0003GOV-0001` govern the generated VS Code authoring-request schema and thin adapter.
- `MR-0002ADR-0006REQ-0001`, `MR-0002ADR-0006REQ-0001GOV-0001`, `MR-0002ADR-0006REQ-0002` and `MR-0002ADR-0006REQ-0002GOV-0001` govern live Markdown assistance and VS Code delegation.
- `MR-0002ADR-0006REQ-0004` and `MR-0002ADR-0006REQ-0004GOV-0001` govern completion, hover, diagnostics and quick fixes for governed references.
- `MR-0004ADR-0001REQ-0003` and `MR-0004ADR-0001REQ-0004` govern Target Project validation and shared authoring reuse.

The implementation must not create a central Common Finding registry, execute a methodology plugin, infer acceptance, mutate Analysis Records or Findings, or activate Governance Requirement children of Security Requirements.

## 3. Representation decision confirmed by inspection

No new governed-reference container kind is required.

The existing `classified_list_item` reference position can represent both relations:

```text
## Parent Functional Requirement

- Parent: [MR-0001ADR-0001REQ-0001] Canonical Functional Requirement title
```

```text
## Finding derivation

- Finding: [FINDING-0002] Canonical accepted Finding title

Explanatory prose may follow the governed Finding items and explain how the selected Findings justify the Security obligation.
```

The Security Requirement validator remains responsible for exactly one Parent item, one or more unique Finding items, parent/body mirror coherence, accepted-state resolution and parent-to-Finding affected-subject coherence.

## 4. Canonical source inventory

### Existing files to modify only during atomic activation

```text
docs/reference/project-model/registers/document-models/document-models.registry.yml
docs/reference/project-model/registers/document-models/profiles/requirement-registry.profile.yml
docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml
docs/reference/project-model/registers/references/governed-entity-resolvers.registry.yml
```

### New canonical source files

```text
docs/reference/project-model/registers/document-models/models/security-requirement.model.yml
docs/reference/project-model/registers/document-models/profiles/security-requirement-body.profile.yml
```

### Confirmed unchanged canonical contract

```text
docs/reference/project-model/contracts/governed-document-model-source.schema.json
```

The current contract already supports model descriptors, Requirement record variants, Markdown sections and profile-declared `classified_list_item` reference positions.

## 5. Complete-model validation inventory

### New artifacts

```text
tools/MR-0001/lib/security-requirement-model-validation.mjs
tools/MR-0001/check-security-requirement-model.mjs
tools/MR-0001/test/security-requirement-model.test.mjs
tools/MR-0001/fixtures/security-requirement-model/negative-fixtures.registry.json
tools/MR-0001/fixtures/security-requirement-model/**
```

### Existing artifacts to extend

```text
tools/MR-0001/test/governed-document-model-sources.test.mjs
tools/MR-0001/lib/governed-document-cross-model-providers.mjs
tools/MR-0001/lib/governed-document-model-coherence-validation.mjs
tools/MR-0001/check-governed-document-model-coherence.mjs
tools/MR-0001/test/governed-document-cross-model-providers.test.mjs
tools/MR-0001/test/governed-document-model-coherence.test.mjs
```

Required evidence includes malformed SEC identity, wrong discriminator, missing or extra registry fields, invalid parent, ownership divergence, parent-body mismatch, missing or duplicate Finding references, unresolved/proposed/rejected Finding, Finding not affecting the parent, invalid reference position, method-specific leakage and plugin dependency.

## 6. Governed entity reference inventory

A Functional Requirement is not currently a registered referenceable entity. Security Requirement activation therefore requires one new resolver entry and provider bundle.

### New provider artifact

```text
tools/MR-0001/lib/governed-document-reference-providers.mjs
```

This provider projects canonical Functional Requirement identities and titles from validated Requirement registries. Its eligibility rule restricts the parent candidate to the Security Requirement's Macro-requirement and Decision context.

### Existing artifacts to extend

```text
docs/reference/project-model/registers/references/governed-entity-resolvers.registry.yml
tools/MR-0001/check-governed-entity-references.mjs
tools/MR-0001/test/governed-entity-references.test.mjs
```

The Common Finding resolver and accepted-state provider already exist and remain authoritative:

```text
tools/MR-0005/check-common-analysis-findings.mjs
tools/MR-0005/lib/common-analysis-finding-reference-eligibility.mjs
```

They are consumed, not redefined. Security-specific parent-to-Finding coherence remains in the Security Requirement validator and cross-model provider.

## 7. Governed authoring inventory

### Existing runtime and schema consumers to extend

```text
tools/MR-0002/build-governed-document-authoring-catalog.mjs
tools/MR-0002/create-governed-document.mjs
tools/MR-0002/build-governed-document-authoring-schema.mjs
tools/MR-0002/check-governed-document-authoring-contract.mjs
```

The Security runtime provider must:

- select exactly one Functional Requirement parent;
- allocate `<parent-id>SEC-####`;
- generate the registry parent field and body parent reference from one canonical selection;
- accept one or more accepted Common Finding identifiers;
- render each Finding exactly once in the Finding derivation section;
- support explanatory derivation prose;
- avoid storing Finding identifiers in the Requirement registry;
- use the existing preview, confirmation, transaction and rollback boundary.

The Security schema provider must project parent candidates and accepted Finding candidates without editor-owned lists.

### Existing verification artifacts to extend

```text
tools/MR-0002/tests/build-governed-document-authoring-catalog-shared-consumers.test.mjs
tools/MR-0002/tests/create-governed-document-core.test.mjs
tools/MR-0002/tests/run-governed-document-authoring.test.mjs
tools/MR-0002/tests/materialize-vscode-governed-document-authoring-adapter.test.mjs
tools/MR-0002/fixtures/governed-document-authoring-contract/**
```

### Generated projection

```text
.vscode/schemas/governed-document-authoring.schema.json
```

It remains generated through the registered materializer. The materialization registry and VS Code settings/tasks are not expected to require authored domain-rule changes.

## 8. Markdown and VS Code assistance inventory

### Existing core artifacts to extend

```text
tools/MR-0002/lib/governed-markdown-assistance.mjs
tools/MR-0002/lib/governed-markdown-reference-assistance.mjs
tools/MR-0002/check-governed-markdown-assistance.mjs
```

Required Security assistance:

- canonical section completion for all six sections;
- next-missing-section priority;
- Functional parent completion in the Parent Functional Requirement position;
- accepted Common Finding completion in the Finding derivation position;
- filtering by the selected parent Functional Requirement where applicable;
- generic hover for Functional Requirement identity and authoritative source;
- Common Finding hover including review state and originating Analysis Record;
- live diagnostics for invalid, unresolved, ineligible or title-divergent references;
- canonical-title quick fixes;
- structure, order, duplicate and content diagnostics through Security stable rule IDs;
- no repository mutation and no adapter-owned Security rules.

### Existing verification artifacts to extend

```text
tools/MR-0002/tests/governed-markdown-assistance.test.mjs
tools/MR-0002/tests/governed-markdown-bae-references.test.mjs
tools/MR-0002/tests/vscode-governed-markdown-assistance-adapter.test.mjs
```

The VS Code extension source remains a thin adapter and is not expected to contain Security-specific logic:

```text
tools/MR-0002/vscode-governed-markdown-assistance/extension.cjs
```

## 9. Target Project inventory

### Existing validation consumer to extend

```text
tools/MR-0004/run-target-project-check.mjs
tools/MR-0004/test/target-project-check.test.mjs
```

The Target Project checker currently has an explicit complete-model validator provider map. It must add exactly one Security Requirement validator provider.

### Shared authoring consumer requiring verification, not a new provider

```text
tools/MR-0004/lib/target-project-authoring.mjs
tools/MR-0004/test/target-project-authoring.test.mjs
```

Target Project authoring already reuses the engine authoring catalog, canonical Requirement dispatch and shared transaction core. It should receive Security support through the shared core; only focused regression evidence is required.

## 10. Explorer inventory

No operational Project Model Explorer consumer exists at repository root on baseline `69319ae`. Search results are confined to `old/threat-forge-legacy`, which is excluded from operational scope.

No Explorer implementation file is changed in this milestone. A future active Explorer must consume the canonical model index and Requirement dispatch, but legacy files must not be revived or patched.

## 11. Gate and trace inventory

Existing governance registries to update as implementation artifacts are introduced:

```text
docs/reference/project-model/registers/checks/local-governance-checks.registry.yml
docs/reference/project-model/registers/implementation/implementation-trace.registry.yml
```

The complete-model suite must include the Security Requirement test. The source-extension suite must prove that activation fails until every runtime, schema, cross-model, Markdown assistance and Target Project provider is present.

The repository projection registry remains structurally unchanged:

```text
docs/reference/project-model/registers/materialization/repository-projections.registry.yml
```

Its existing governed-document authoring schema materializer will regenerate the VS Code schema after activation.

## 12. Case-study and reverse-projection inventory

These changes remain deferred until after atomic model activation.

### Existing case-study artifacts to extend

```text
tools/MR-0005/check-common-finding-case-study.mjs
tools/MR-0005/test/common-finding-case-study.test.mjs
examples/case-studies/documentation-to-base-analysis/docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml
examples/case-studies/documentation-to-base-analysis/docs/reference/project-model/body/requirements/MR-0001/<security-requirement-id>_body.md
```

The current case study intentionally rejects any Security Requirement claim. That boundary must be replaced only when the canonical model is active and validated.

### New derived traceability artifacts

```text
tools/MR-0001/lib/security-requirement-finding-traceability.mjs
tools/MR-0001/check-security-requirement-finding-traceability.mjs
tools/MR-0001/test/security-requirement-finding-traceability.test.mjs
```

The projection is rebuilt read-only from validated Common Finding sources and valid Security Requirement body references. It is not an authored registry and does not mutate either side.

## 13. Confirmed implementation sequence

```text
1. baseline-specific inspection and Requirement coverage — complete in this draft
2. isolated model/profile/variant scaffold using synthetic source sets
3. complete-model validator and stable negative fixtures
4. Functional parent resolver plus Security cross-model and Finding coherence
5. governed runtime authoring and authoring-request schema providers
6. Markdown core and VS Code assistance
7. Target Project and remaining coordinated consumers
8. integrated inactive-model verification and missing-provider proof
9. atomic canonical activation and generated projection refresh
10. case study, reverse Finding traceability, full gate and milestone closure
```

## 14. Exit condition for this inspection microstep

The inspection is complete because:

- every canonical source affected by activation is identified;
- every model-specific and registry-derived consumer is identified;
- every VS Code authoring and Markdown assistance boundary is identified;
- Target Project support is separated into validation-provider work and shared-core regression evidence;
- legacy Explorer files are explicitly excluded;
- every planned change is owned by an existing canonical Requirement;
- no code, schema, profile, registry or model activation has been performed.

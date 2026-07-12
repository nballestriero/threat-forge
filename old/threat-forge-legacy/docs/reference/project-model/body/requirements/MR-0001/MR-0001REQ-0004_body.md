# MR-0001REQ-0004 — Validazione dei campi controllati dei registri ADR

## Intent

This requirement preserves the governed obligation defined by `MR-0001REQ-0004` and keeps it readable under the canonical Requirement body format.

## Requirement

### Previous section: Intent

The project model must validate the structured fields used by ADR registry records.

### Previous section: Requirement

Every functional ADR registry record must expose the required controlled fields defined by the ADR governance registry.

The validation must ensure that ADR registry metadata is deterministic, complete, and cross-checked against existing project model records. ADR identity is contextual: the complete decision identity is `macro_requirement_id` + `id`.

At minimum, the validation must check that:

* each ADR id is unique within the owning macro-requirement scope;
* each ADR id matches the controlled ADR identifier pattern;
* each ADR status belongs to the controlled ADR status list;
* each ADR decision type belongs to the controlled decision type list;
* each ADR macro requirement reference points to an existing macro requirement;
* duplicate ADR ids are allowed across different macro requirements when their `macro_requirement_id` values differ;
* each ADR body path is present, normalized, and points to an existing Markdown body file;
* unsupported fields are rejected or reported according to the ADR governance registry rules.

### Previous section: Verification

The deterministic validator is implemented by:

```text
tools/docs/check-adr-registry-fields.mjs
```

The validator must be executable through:

```text
npm run docs:adr-registry-fields
```

The project model graph must link this requirement to the validator with `implemented_by`, and must link the validator back to this requirement with `verifies`.

## Scope

This requirement applies to the project-model governance artifact, validator, registry, graph relation, or workflow described by its registry record and deriving ADR.

It does not expand the original implementation scope. This rewrite only normalizes the Markdown body structure so the Requirement body format can be checked deterministically.

## Rules

- The requirement must remain registered in its macro-requirement registry.
- The requirement body must remain connected to the same requirement id through `body_path`.
- The requirement must preserve the original governed obligation while using the canonical body sections.
- Future implementation or verification details must be introduced through dedicated governed micropassi when they are not already present.

## Acceptance Criteria

```gherkin
Scenario: Requirement body is canonical
  Given requirement `MR-0001REQ-0004` is registered in the project model
  When the Requirement body format validator checks its body file
  Then the body starts with an H1 containing `MR-0001REQ-0004`
  And the body contains the canonical functional requirement sections
  And the body preserves the original governed obligation
```

## Verification Expectation

The Requirement body format validator must verify that this body conforms to the governed functional requirement body profile.

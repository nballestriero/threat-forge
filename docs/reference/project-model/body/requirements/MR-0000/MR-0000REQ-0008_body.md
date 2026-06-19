# MR-0000REQ-0008 — Traversal canonico top-down del project model

## Intent

This requirement preserves the governed obligation defined by `MR-0000REQ-0008` and keeps it readable under the canonical Requirement body format.

## Requirement

### Previous section: Intent

Il grafo deve essere navigabile a partire dalla macro-area, perché la macro-area è la radice logica di decisioni, requisiti, implementazioni e verifiche.

### Previous section: Requirement

Il project model deve supportare traversal canonico top-down:

```text
MR -> ADR -> REQ -> TOOL -> verifica
```

La relazione canonica tra macro-requirement e ADR dovrà essere MR-rooted, per esempio:

```text
MR -> has_decision -> ADR
```

La relazione corrente `ADR belongs_to MR` potrà restare solo finché necessaria alla migrazione, ma non deve essere il modello canonico di traversal a regime.

### Previous section: Verification

Una futura verifica dovrà controllare che ogni ADR governata da un macro-requirement sia raggiungibile dalla macro-area tramite la relazione top-down canonica.

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
  Given requirement `MR-0000REQ-0008` is registered in the project model
  When the Requirement body format validator checks its body file
  Then the body starts with an H1 containing `MR-0000REQ-0008`
  And the body contains the canonical functional requirement sections
  And the body preserves the original governed obligation
```

## Verification Expectation

The Requirement body format validator must verify that this body conforms to the governed functional requirement body profile.

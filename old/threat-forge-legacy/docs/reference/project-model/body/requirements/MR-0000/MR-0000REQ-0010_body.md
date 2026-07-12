# MR-0000REQ-0010 — Orchestrazione dei validator specializzati per formati canonici e coerenza codice-documentazione

## Intent

This requirement preserves the governed obligation defined by `MR-0000REQ-0010` and keeps it readable under the canonical Requirement body format.

## Requirement

### Previous section: Intent

Il sistema deve verificare i formati canonici e la coerenza tra documentazione, codice e grafo tramite controlli specializzati orchestrati da `MR-0000`.

### Previous section: Requirement

Il runner MR-0000 deve orchestrare validator specializzati per controllare progressivamente:

- formato dei record e body delle macro-requirement;
- formato dei record e body ADR;
- formato dei record e body dei requisiti;
- formato e tassonomie dei grafi;
- coerenza tra requisiti, tool, codice e verifiche;
- coerenza tra path dichiarati nei registry e file presenti nel repository.

Ogni validator specializzato deve restare governato da ADR, requisito e relazioni grafo dedicate prima della sua introduzione o migrazione.

### Previous section: Verification

Una futura verifica dovrà dimostrare che il runner MR-0000 invoca i validator specializzati e aggrega gli esiti in un unico controllo di stato sistema.

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
  Given requirement `MR-0000REQ-0010` is registered in the project model
  When the Requirement body format validator checks its body file
  Then the body starts with an H1 containing `MR-0000REQ-0010`
  And the body contains the canonical functional requirement sections
  And the body preserves the original governed obligation
```

## Verification Expectation

The Requirement body format validator must verify that this body conforms to the governed functional requirement body profile.

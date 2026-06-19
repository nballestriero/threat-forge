# MR-0000REQ-0006 — Refactor del validator del formato grafo sotto MR-0000

## Intent

This requirement preserves the governed obligation defined by `MR-0000REQ-0006` and keeps it readable under the canonical Requirement body format.

## Requirement

### Previous section: Intent

Il controllo del formato dei grafi è un controllo trasversale di stato del sistema e deve essere governato da `MR-0000`.

### Previous section: Requirement

Il validator del formato grafo deve essere collocato sotto:

```text
backend/tools/MR-0000/check-graph-format.mjs
```

Il comando pubblico deve restare:

```text
npm run docs:graph-format
```

Il validator deve continuare a verificare:

- struttura dei file grafo elencati in `graph.index.yml`;
- tipi nodo ammessi;
- predicati SPO ammessi;
- coerenza tra subject/object e tipi ammessi dai predicati;
- assenza di inferenze semantiche non dichiarate nei file governati.

Il file sorgente del validator deve dichiarare tramite JSDoc i requisiti implementati, le decisioni di origine e il macro-requirement che governa il tool.

### Previous section: Verification

Il comando:

```text
npm run docs:graph-format
```

deve terminare con codice successo `0` quando i grafi, il contratto tecnico e i registri tecnici sono coerenti.

Il grafo `GRAPH-0000` deve collegare questo requisito al validator con `implemented_by` e il validator al requisito con `verifies`.

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
  Given requirement `MR-0000REQ-0006` is registered in the project model
  When the Requirement body format validator checks its body file
  Then the body starts with an H1 containing `MR-0000REQ-0006`
  And the body contains the canonical functional requirement sections
  And the body preserves the original governed obligation
```

## Verification Expectation

The Requirement body format validator must verify that this body conforms to the governed functional requirement body profile.

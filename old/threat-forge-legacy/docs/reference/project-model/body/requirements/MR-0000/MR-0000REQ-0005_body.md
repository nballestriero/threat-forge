# MR-0000REQ-0005 — Collocazione dei contratti tecnici dei validator MR-0000

## Intent

This requirement preserves the governed obligation defined by `MR-0000REQ-0005` and keeps it readable under the canonical Requirement body format.

## Requirement

### Previous section: Intent

I contratti tecnici stabili applicati dai validator MR-0000 devono stare vicino ai tool che li eseguono.

### Previous section: Requirement

I contratti tecnici e i registri tecnici usati da un validator trasversale di `MR-0000` devono essere collocati sotto la stessa area backend del tool che li applica.

Per il controllo del formato grafo, i file canonici devono essere:

```text
backend/tools/MR-0000/contracts/graph-format.contract.json
backend/tools/MR-0000/registries/graph-node-types.registry.yml
backend/tools/MR-0000/registries/spo-predicates.registry.yml
```

I file grafo concreti restano sotto:

```text
docs/reference/project-model/registers/graph/*.graph.yml
```

La documentazione deve descrivere tali file e può referenziarli, ma il validator deve leggere la copia canonica collocata vicino al tool.

### Previous section: Verification

Il comando:

```text
npm run docs:graph-format
```

verifica che il validator trovi e usi i contratti tecnici collocati sotto `backend/tools/MR-0000/`.

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
  Given requirement `MR-0000REQ-0005` is registered in the project model
  When the Requirement body format validator checks its body file
  Then the body starts with an H1 containing `MR-0000REQ-0005`
  And the body contains the canonical functional requirement sections
  And the body preserves the original governed obligation
```

## Verification Expectation

The Requirement body format validator must verify that this body conforms to the governed functional requirement body profile.

# MR-0000REQ-0004 — Identità ADR contestuale per macro-requirement

## Intent

This requirement preserves the governed obligation defined by `MR-0000REQ-0004` and keeps it readable under the canonical Requirement body format.

## Requirement

### Previous section: Intent

Le ADR devono poter usare identificativi sequenziali locali alla macro-area che le possiede.

### Previous section: Requirement

Un ADR id deve essere univoco dentro il proprio `macro_requirement_id`, non nell'intero corpus del project model.

L'identità completa di una decisione è la coppia:

```text
macro_requirement_id + id
```

Per esempio, le seguenti decisioni sono distinte e valide:

```text
MR-0000/ADR-0001
MR-0001/ADR-0001
```

Il validator dei registri ADR deve quindi rilevare duplicati solo quando due ADR hanno lo stesso `id` nello stesso `macro_requirement_id`.

Il validator deve continuare a verificare che:

* ogni ADR id rispetti il pattern controllato;
* ogni ADR dichiari un `macro_requirement_id` esistente;
* ogni ADR del registry dichiari lo stesso `macro_requirement_id` del registry che la contiene;
* ogni `body_path` punti a un file esistente e coerente con la macro-area;
* campi e valori controllati restino governati dall'ADR governance registry.

### Previous section: Verification

Il controllo è implementato dal validator dei campi ADR:

```text
tools/docs/check-adr-registry-fields.mjs
```

Il comando di verifica è:

```text
npm run docs:adr-registry-fields
```

Il grafo deve collegare questo requisito al validator con `implemented_by` e deve collegare il validator al requisito con `verifies`.

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
  Given requirement `MR-0000REQ-0004` is registered in the project model
  When the Requirement body format validator checks its body file
  Then the body starts with an H1 containing `MR-0000REQ-0004`
  And the body contains the canonical functional requirement sections
  And the body preserves the original governed obligation
```

## Verification Expectation

The Requirement body format validator must verify that this body conforms to the governed functional requirement body profile.

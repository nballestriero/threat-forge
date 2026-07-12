# MR-0000REQ-0001 — Governance dei controlli trasversali comuni

## Intent

This requirement preserves the governed obligation defined by `MR-0000REQ-0001` and keeps it readable under the canonical Requirement body format.

## Requirement

### Previous section: Intent

Il project model deve rappresentare i controlli trasversali comuni tramite `MR-0000`, senza assegnarli impropriamente a una macro area funzionale specifica.

### Previous section: Requirement

I controlli comuni del repository e del project model devono appartenere semanticamente a `MR-0000` quando governano regole trasversali applicabili a più macro-requirement.

Un controllo comune può essere una decisione, un requisito, un registry, una policy, un contratto, un validator o un tool che non appartiene a una singola macro area funzionale.

I controlli comuni devono dichiarare il proprio ambito tramite registry, policy o contratto controllato, invece di duplicare relazioni grafo istanza-per-istanza verso ogni record controllato quando l'ambito è comune e dichiarabile in modo compatto.

### Previous section: Acceptance Criteria

* `MR-0000` è il contenitore semantico dei controlli trasversali comuni.
* Le decisioni e i requisiti comuni sono collocati sotto `MR-0000`.
* Il grafo comune di `MR-0000` è separato dal grafo funzionale di `MR-0001`.
* I controlli trasversali futuri devono essere introdotti tramite ADR, requisito e grafo prima di introdurre o modificare tool.
* I tool trasversali futuri devono essere collegati al requisito che li introduce e devono dichiarare il loro ambito tramite policy o registry controllato.

### Previous section: Verification

Questo requisito non introduce ancora un tool di verifica.

La verifica minima di questo passo è documentale e strutturale:

```text
npm run docs:graph-format
npm run docs:pages
node tools/docs/check-docs-structure.mjs
npm run docs:adr-registry-fields
```

Un micropasso successivo potrà introdurre controlli deterministici dedicati per verificare che i graph file siano separati per macro-requirement e che i controlli comuni non vengano modellati nel grafo funzionale sbagliato.

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
  Given requirement `MR-0000REQ-0001` is registered in the project model
  When the Requirement body format validator checks its body file
  Then the body starts with an H1 containing `MR-0000REQ-0001`
  And the body contains the canonical functional requirement sections
  And the body preserves the original governed obligation
```

## Verification Expectation

The Requirement body format validator must verify that this body conforms to the governed functional requirement body profile.

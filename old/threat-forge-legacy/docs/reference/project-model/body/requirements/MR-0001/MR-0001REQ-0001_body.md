# MR-0001REQ-0001 — Validazione della struttura documentale canonica

## Intent

This requirement preserves the governed obligation defined by `MR-0001REQ-0001` and keeps it readable under the canonical Requirement body format.

## Requirement

### Previous section: Descrizione

Il repository deve mantenere una struttura documentale canonica sotto `docs/`.

La struttura documentale canonica è derivata da `ADR-0001` e deve rendere verificabile la separazione Diátaxis adottata dal progetto.

Il requisito appartiene al macro-requisito `MR-0001`.

### Previous section: Regole

* La directory `docs/` deve esistere.
* Le directory canoniche Diátaxis devono esistere:

  * `docs/tutorials/`
  * `docs/how-to/`
  * `docs/reference/`
  * `docs/explanation/`
* Le directory canoniche vuote devono essere versionabili tramite `.gitkeep`.
* Non devono esistere directory top-level non canoniche sotto `docs/`.
* La struttura `docs/reference/project-model/` deve esistere.
* La validazione deve essere eseguibile tramite tool deterministico.

### Previous section: Esclusioni

Questo requisito non valida ancora:

* formato Markdown;
* link interni;
* coerenza semantica dei registri;
* contenuto dei body;
* relazioni del grafo.

Questi controlli devono essere modellati come requisiti separati prima di essere implementati.

### Previous section: Acceptance Criteria

```gherkin
Scenario: Validazione della struttura documentale canonica
  Given la validazione viene eseguita sul repository
  When il tool analizza la directory docs
  Then il processo termina con codice successo 0
  And la directory docs esiste
  And le directory tutorials, how-to, reference ed explanation esistono
  And le directory canoniche vuote sono versionabili tramite .gitkeep
  And non esistono directory top-level non canoniche sotto docs
  And la struttura docs/reference/project-model esiste
```

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
  Given requirement `MR-0001REQ-0001` is registered in the project model
  When the Requirement body format validator checks its body file
  Then the body starts with an H1 containing `MR-0001REQ-0001`
  And the body contains the canonical functional requirement sections
  And the body preserves the original governed obligation
```

## Verification Expectation

The Requirement body format validator must verify that this body conforms to the governed functional requirement body profile.

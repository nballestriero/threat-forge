# MR-0001REQ-0001: Validazione della Struttura Documentale Canonica

## Descrizione

Il repository deve mantenere una struttura documentale canonica sotto `docs/`.

La struttura documentale canonica è derivata da `ADR-0001` e deve rendere verificabile la separazione Diátaxis adottata dal progetto.

Il requisito appartiene al macro-requisito `MR-0001`.

## Regole

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

## Esclusioni

Questo requisito non valida ancora:

* formato Markdown;
* link interni;
* coerenza semantica dei registri;
* contenuto dei body;
* relazioni del grafo.

Questi controlli devono essere modellati come requisiti separati prima di essere implementati.

## Acceptance Criteria

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

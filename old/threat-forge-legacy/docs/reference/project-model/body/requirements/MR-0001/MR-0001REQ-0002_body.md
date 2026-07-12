# MR-0001REQ-0002 — Registro controllato dei tipi nodo del grafo

## Intent

This requirement preserves the governed obligation defined by `MR-0001REQ-0002` and keeps it readable under the canonical Requirement body format.

## Requirement

### Previous section: Descrizione

Il project model deve definire i tipi nodo del grafo in un registro dedicato.

Il registro dei tipi nodo del grafo deve essere separato dai grafi concreti, dal registro dei predicati SPO e dal contratto di formato del grafo.

Il requisito deriva dalla decisione `ADR-0002` e appartiene al macro-requisito `MR-0001`.

### Previous section: Regole

* Il registro dei tipi nodo del grafo deve esistere in:
  `backend/tools/MR-0000/registries/graph-node-types.registry.yml`
* Il registro deve definire solo tipi nodo e relazioni di specializzazione tra tipi.
* Il registro può distinguere tra tipi astratti e tipi concreti.
* I tipi concreti possono dichiarare quali tipi astratti soddisfano.
* Il registro non deve definire predicati SPO.
* Il registro non deve contenere relazioni concrete tra nodi.
* Il registro non deve contenere contenuto lungo o descrizioni operative estese.
* I file grafo devono usare solo tipi nodo dichiarati in questo registro.
* La validazione dell’uso dei tipi nodo deve essere eseguibile tramite tool deterministico.

### Previous section: Esclusioni

Questo requisito non valida ancora:

* il registro dei predicati SPO;
* le etichette inverse dei predicati;
* la completezza semantica delle relazioni;
* la presenza dei file implementativi collegati ai nodi;
* la chiusura completa requisito → implementazione → verifica.

Questi controlli devono essere modellati come requisiti separati prima di essere implementati.

### Previous section: Acceptance Criteria

```gherkin
Scenario: Validazione del registro dei tipi nodo del grafo
  Given la validazione viene eseguita sul project model
  When il tool analizza i file grafo
  Then il registro dei tipi nodo del grafo esiste
  And ogni nodo del grafo usa un tipo dichiarato nel registro
  And i tipi concreti possono soddisfare tipi astratti dichiarati
  And il processo termina con codice successo 0
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
  Given requirement `MR-0001REQ-0002` is registered in the project model
  When the Requirement body format validator checks its body file
  Then the body starts with an H1 containing `MR-0001REQ-0002`
  And the body contains the canonical functional requirement sections
  And the body preserves the original governed obligation
```

## Verification Expectation

The Requirement body format validator must verify that this body conforms to the governed functional requirement body profile.

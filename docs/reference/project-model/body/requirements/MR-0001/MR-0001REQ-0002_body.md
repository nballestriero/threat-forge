# MR-0001REQ-0002: Registro controllato dei tipi nodo del grafo

## Descrizione

Il project model deve definire i tipi nodo del grafo in un registro dedicato.

Il registro dei tipi nodo del grafo deve essere separato dai grafi concreti, dal registro dei predicati SPO e dal contratto di formato del grafo.

Il requisito deriva dalla decisione `ADR-0002` e appartiene al macro-requisito `MR-0001`.

## Regole

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

## Esclusioni

Questo requisito non valida ancora:

* il registro dei predicati SPO;
* le etichette inverse dei predicati;
* la completezza semantica delle relazioni;
* la presenza dei file implementativi collegati ai nodi;
* la chiusura completa requisito → implementazione → verifica.

Questi controlli devono essere modellati come requisiti separati prima di essere implementati.

## Acceptance Criteria

```gherkin
Scenario: Validazione del registro dei tipi nodo del grafo
  Given la validazione viene eseguita sul project model
  When il tool analizza i file grafo
  Then il registro dei tipi nodo del grafo esiste
  And ogni nodo del grafo usa un tipo dichiarato nel registro
  And i tipi concreti possono soddisfare tipi astratti dichiarati
  And il processo termina con codice successo 0
```

# MR-0001REQ-0003: Registro controllato dei predicati SPO del grafo

## Descrizione

Il project model deve definire i predicati SPO ammessi nei grafi in un registro dedicato.

Il registro dei predicati SPO deve essere separato dai grafi concreti, dal registro dei tipi nodo e dal contratto di formato del grafo.

Il requisito deriva dalla decisione `ADR-0002` e appartiene al macro-requisito `MR-0001`.

## Regole

- Il registro dei predicati SPO del grafo deve esistere in:
  `backend/tools/MR-0000/registries/spo-predicates.registry.yml`
- Ogni predicato SPO ammesso deve avere un identificatore stabile.
- Ogni predicato SPO deve dichiarare:
  - `function`;
  - `forward_label`;
  - `inverse_label`;
  - `subject_type`;
  - `object_type`;
  - `description`.
- I file grafo devono usare solo predicati dichiarati in questo registro.
- La lettura inversa delle relazioni del grafo deve derivare da `inverse_label`.
- Un nuovo predicato deve essere aggiunto al registro prima di essere usato in un file grafo.
- La validazione dell’uso dei predicati SPO deve essere eseguibile tramite tool deterministico.

## Esclusioni

Questo requisito non valida ancora:

- la completezza semantica di tutte le relazioni possibili;
- la presenza dei file implementativi collegati ai nodi;
- la chiusura completa requisito → implementazione → verifica;
- la visualizzazione grafica interattiva delle relazioni.

Questi controlli devono essere modellati come requisiti separati prima di essere implementati.

## Acceptance Criteria

```gherkin
Scenario: Validazione del registro dei predicati SPO del grafo
  Given la validazione viene eseguita sul project model
  When il tool analizza i file grafo
  Then il registro dei predicati SPO del grafo esiste
  And ogni relazione SPO usa un predicato dichiarato nel registro
  And ogni predicato dichiara forward_label e inverse_label
  And ogni relazione rispetta subject_type e object_type del predicato
  And il processo termina con codice successo 0
```

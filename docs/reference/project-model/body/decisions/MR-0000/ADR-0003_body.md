# ADR-0003 — Runner unico di stato sistema e traversal top-down del project model

## Status

Accepted.

## Context

`MR-0000` sta diventando il livello comune che controlla la coerenza dello stato del sistema.

I controlli già introdotti verificano parti specifiche del project model, per esempio il formato dei grafi o i campi dei registry ADR. Con l'aumento dei validator, eseguire i gate uno per uno rischia di rendere fragile il flusso di verifica e di nascondere incoerenze tra documentazione, registri, grafo, tool, codice e verifiche.

Serve un entrypoint unico che orchestri i controlli specializzati senza trasformarsi in un validator monolitico.

Serve anche una direzione canonica del grafo che permetta traversal deterministico a partire da una macro-area. La relazione attuale `ADR belongs_to MR` descrive appartenenza, ma rende la macro-area un target passivo. Per navigazione, verifica e visualizzazione è preferibile un modello top-down in cui la macro-area espone le decisioni che la governano.

## Decision

`MR-0000` introdurrà un runner unico di stato sistema.

Il runner sarà un entrypoint orchestratore che legge il project model, scopre i file governati tramite registri e path dichiarati, ed esegue validator specializzati.

Il runner non deve duplicare la logica dei validator specializzati. Deve chiamarli, raccogliere gli esiti, fallire se un gate fallisce e rendere esplicito quale controllo ha prodotto il fallimento.

Il traversal canonico del project model deve evolvere verso una direzione top-down:

```text
MR -> ADR -> REQ -> TOOL -> verification
```

La relazione canonica tra macro-requirement e decisioni dovrà quindi diventare MR-rooted, per esempio:

```text
MR-0000 -> has_decision -> ADR-0001
ADR-0001 -> justifies -> MR-0000REQ-0002
MR-0000REQ-0002 -> implemented_by -> TOOL-...
TOOL-... -> verifies -> MR-0000REQ-0002
```

I file fisici non devono essere rappresentati con una miriade di archi nel grafo. Il runner deve scoprirli tramite registry e campi path canonici, come `body_path`, registry delle decisioni, registry dei requisiti, indice dei grafi, path dei tool e path dei contratti tecnici.

## Scope

In scope:

- decisione del runner unico MR-0000 per i gate di coerenza del project model;
- decisione del traversal top-down `MR -> ADR -> REQ -> TOOL/verifica`;
- decisione che i validator restano specializzati e vengono orchestrati dal runner;
- decisione che i file fisici vengono scoperti tramite registry/path, non tramite archi ripetitivi.

Out of scope:

- implementazione del runner;
- introduzione immediata del predicato `has_decision`;
- migrazione immediata dei grafi da `ADR belongs_to MR` a `MR has_decision ADR`;
- refactor degli altri validator;
- rimozione dei file temporanei di analisi.

## Consequences

### Positive consequences

* Esiste un punto unico per eseguire i gate di coerenza del project model.
* I validator specializzati restano piccoli e testabili.
* Il grafo può diventare navigabile top-down a partire dalle macro-aree.
* La verifica evita archi rumorosi verso ogni file fisico controllato.
* La coerenza tra documentazione, codice, registry e verifiche può essere governata da `MR-0000`.

### Negative consequences

* Serve introdurre e governare un nuovo predicato top-down prima della migrazione dei grafi.
* Il runner deve distinguere tra traversal logico del grafo e discovery fisica dei file.
* La migrazione deve essere graduale per evitare di rompere i validator esistenti.

## Follow-up

1. Introdurre i requisiti derivati da questa decisione.
2. Aggiornare `GRAPH-0000` con decisione e requisiti.
3. Introdurre il predicato top-down per collegare MR e ADR.
4. Migrare i grafi da `ADR belongs_to MR` a `MR has_decision ADR`.
5. Implementare il runner unico MR-0000.
6. Collegare runner, validator specializzati e verifiche nel grafo.
7. Eliminare i file temporanei di analisi quando il refactor è completato.

# ADR-0001 — MR-0000 come livello di controllo dello stato del sistema

## Status

Accepted.

## Context

Il project model contiene documenti, requisiti, decisioni, grafi, tool, codice e verifiche che devono restare coerenti tra loro.

Alcune regole sono definite da macro-aree funzionali. Per esempio `MR-0001` definisce la struttura documentale canonica, i registry, i body separati e il formato governato dei documenti.

Queste regole possono però richiedere controlli trasversali: il sistema deve sapere se i file esistono, se il grafo punta a nodi validi, se i requisiti implementati hanno codice, se i tool dichiarano il requisito che implementano, se le verifiche sono collegate ai requisiti e se documentazione e codice sono sincronizzati.

Collocare questi controlli dentro ogni macro-area funzionale produrrebbe duplicazioni e una miriade di collegamenti ripetitivi tra nodi. Inoltre renderebbe ambiguo se un tool appartiene semanticamente alla funzionalità o al controllo trasversale dello stato del sistema.

Serve quindi una separazione: le macro-aree funzionali definiscono strutture, capacità e vincoli specifici; `MR-0000` governa i controlli trasversali che verificano la coerenza complessiva del sistema.

## Decision

`MR-0000` è il livello comune di controllo dello stato del sistema.

`MR-0000` governa i controlli trasversali che mantengono coerenti documentazione, requisiti, ADR, grafi, tool, codice e verifiche.

I tool di governance e validazione devono essere collocati sotto una cartella del backend dedicata alla macro-area che li governa:

```text
backend/tools/<macro_requirement_id>/
```

I controlli trasversali di stato del sistema appartengono quindi a:

```text
backend/tools/MR-0000/
```

Ogni tool di governance deve dichiarare tramite JSDoc il macro-requirement, l'ADR e il requisito che implementa.

Le policy e i registry trasversali devono dichiarare il loro ambito in modo compatto, per esempio tramite campi controllati come `applies_to` quando introdotti da requisiti dedicati. Il grafo non deve compensare una policy trasversale creando archi ripetitivi verso ogni singolo record controllato.

Gli identificativi ADR sono univoci nel contesto del macro-requirement che li possiede. L'identità completa di una decisione è quindi la coppia `macro_requirement_id` + `id`, per esempio `MR-0000/ADR-0001` e `MR-0001/ADR-0001` sono decisioni diverse.

Questo passo definisce la regola e i requisiti derivati. Lo spostamento effettivo dei tool esistenti avverrà in un micropasso successivo dopo il collegamento del requisito al grafo.

## Scope

Questa decisione si applica al project model di `threat-forge` e alla futura organizzazione dei controlli comuni.

In scope:

- definizione di `MR-0000` come livello di controllo dello stato del sistema;
- regola di collocazione dei tool in `backend/tools/<macro_requirement_id>/`;
- collocazione futura dei tool trasversali in `backend/tools/MR-0000/`;
- regola di identità contestuale delle ADR per macro-requirement;
- requisito che i tool dichiarino tramite JSDoc macro-requirement, ADR e requisito implementato;
- uso di policy/registry per dichiarare ambiti trasversali senza moltiplicare archi istanza-per-istanza.

Out of scope:

- spostamento immediato di tool esistenti;
- introduzione di nuovi validator applicativi;
- refactor del renderer delle pagine;
- rimozione del file temporaneo di analisi `MR-0000-common-governance-refactor-analysis.tmp.md`;
- introduzione di nuovi predicati SPO.

## Consequences

### Positive consequences

* I controlli trasversali hanno una responsabilità chiara: verificare lo stato coerente del sistema.
* Le macro-aree funzionali non vengono sovraccaricate con tool comuni.
* Il grafo resta compatto perché l'ambito dei controlli comuni è dichiarato da policy/registry invece che da archi ripetitivi.
* La collocazione `backend/tools/<macro_requirement_id>/` rende visibile quale macro-area governa ogni tool.
* Gli ID ADR possono ripartire da `ADR-0001` dentro ogni macro-requirement senza conflitti semantici.

### Negative consequences

* Alcuni tool esistenti dovranno essere spostati con micropassi dedicati.
* I validator esistenti che assumevano ID ADR globali devono essere allineati al modello `macro_requirement_id` + `id`.
* I futuri controlli dovranno distinguere tra appartenenza semantica del tool e ambito dei file controllati.

## Follow-up

Derivare requisiti per:

1. controllo di coerenza dello stato del sistema;
2. collocazione dei tool di governance per macro-requirement;
3. identità ADR contestuale per macro-requirement.

Dopo questi requisiti, introdurre o aggiornare i tool necessari in micropassi separati, collegando nel grafo requisito, implementazione e verifica.

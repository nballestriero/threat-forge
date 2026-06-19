# ADR-0001 — Adozione del Modello Diátaxis

## Status

Accepted.

## Context

La documentazione tecnica del progetto deve essere stabile, leggibile e facile da navigare per nuovi membri del team, revisori e strumenti automatici. Gli utenti del progetto devono poter distinguere rapidamente una guida passo-passo da un riferimento tecnico, da un tutorial e da una spiegazione architetturale.

Abbiamo bisogno di una struttura rigida e chiara per organizzare i contenuti all'interno della cartella `/docs`.

## Decision

Decidiamo di adottare formalmente il framework **Diátaxis** per tutta la documentazione di progetto.

Questo comporta che:

- La radice della documentazione sarà divisa nelle 4 cartelle canoniche: `tutorials`, `how-to`, `reference`, `explanation`.
- Qualsiasi nuovo file di documentazione dovrà essere classificato in una di queste categorie prima del merge su Git.
- I documenti `reference` conterranno registry, schemi, tassonomie e formati tecnici governati.
- I documenti `explanation` conterranno contesto, principi, teoria, architettura e design rationale.

## Scope

In scope:

- organizzazione dei documenti stabili sotto `docs/` secondo le quattro categorie Diátaxis;
- separazione tra contenuti operativi, reference tecnica e spiegazioni architetturali;
- uso della struttura documentale come base per futuri controlli deterministici.

Out of scope:

- implementare in questa decisione tutti i validator documentali futuri;
- definire il formato interno di ogni registro governato;
- modellare la tracciabilità completa dei requisiti e dei tool.

## Consequences

### Conseguenze Positive (Benefici)

- Chiara separazione degli scopi del testo.
- Creazione di un percorso di apprendimento guidato (`tutorials`) separato dalle risposte operative (`how-to`).
- Separazione tra reference tecnica governata e spiegazioni architetturali.
- Semplificazione futura delle regole di automazione, lint e validazione documentale.

### Conseguenze Negative (Costi/Rischi)

- Sarà necessario classificare ogni nuovo documento prima del merge.
- Il team dovrà rispettare regole più rigide nella produzione documentale.
- Eventuali documenti scritti fuori struttura dovranno essere spostati o riformulati.

## Follow-up

1. Mantenere la struttura Diátaxis come vincolo documentale del project model.
2. Collegare i futuri controlli di struttura documentale ai requisiti e al knowledge graph.
3. Evitare che nuovi documenti canonici siano introdotti fuori dalla struttura governata.

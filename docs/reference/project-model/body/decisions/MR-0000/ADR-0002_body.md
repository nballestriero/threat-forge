# ADR-0002 — Collocazione dei contratti tecnici vicino ai validator MR-0000

## Status

Accepted.

## Context

Alcuni file del project model non sono documentazione narrativa. Definiscono invece contratti tecnici stabili usati da validator deterministici.

Nel controllo del formato dei grafi, il contratto JSON del file grafo e i registri controllati dei tipi nodo e dei predicati SPO definiscono le regole eseguibili che il validator applica.

Se questi file restano dentro la documentazione, il loro ruolo può risultare ambiguo: sembrano documenti da leggere, mentre sono parte del meccanismo di controllo del sistema. Inoltre il validator e i contratti che applica rischiano di evolvere separatamente.

Serve quindi distinguere tra:

- documentazione, che spiega il modello e le decisioni;
- contratti tecnici e registri tecnici, che definiscono regole verificabili;
- tool, che applicano tali regole in modo deterministico.

## Decision

I contratti tecnici e i registri tecnici usati dai validator trasversali di `MR-0000` sono artifact di controllo del sistema, non documentazione narrativa primaria.

Questi artifact devono vivere vicino al tool che li applica, sotto la cartella del macro-requirement che governa il controllo.

Per il controllo del formato dei grafi, la collocazione canonica è:

```text
backend/tools/MR-0000/check-graph-format.mjs
backend/tools/MR-0000/contracts/graph-format.contract.json
backend/tools/MR-0000/registries/graph-node-types.registry.yml
backend/tools/MR-0000/registries/spo-predicates.registry.yml
```

I file grafo concreti restano artifact del project model e continuano a vivere sotto:

```text
docs/reference/project-model/registers/graph/*.graph.yml
```

Il comando pubblico resta stabile:

```text
npm run docs:graph-format
```

La documentazione deve descrivere e referenziare i contratti tecnici, ma non deve essere l'unica fonte primaria del contratto eseguibile quando il contratto è applicato da un validator MR-0000.

## Scope

Questa decisione si applica al primo refactor del validator del formato grafo e dei relativi contratti tecnici.

In scope:

- spostamento del validator `check-graph-format.mjs` sotto `backend/tools/MR-0000/`;
- spostamento del contratto JSON del formato grafo vicino al validator;
- spostamento dei registri tecnici dei tipi nodo e predicati SPO vicino al validator;
- aggiornamento del comando `npm run docs:graph-format`;
- aggiornamento del renderer delle pagine per leggere le tassonomie tecniche dalla nuova posizione;
- aggiornamento del grafo per collegare requisito, tool e verifica.

Out of scope:

- spostamento degli altri validator esistenti;
- introduzione di nuovi predicati SPO;
- refactor completo di tutti i registry del project model;
- rimozione del file temporaneo di analisi `MR-0000-common-governance-refactor-analysis.tmp.md`.

## Consequences

### Positive consequences

* Il validator e i suoi contratti tecnici evolvono insieme.
* I file tecnici stabili sono separati dalla documentazione narrativa.
* `MR-0000` diventa il punto naturale per i controlli di coerenza del sistema.
* Il comando pubblico resta invariato anche se cambia la collocazione interna del tool.

### Negative consequences

* Alcuni riferimenti documentali devono essere aggiornati alla nuova collocazione.
* Il renderer delle pagine deve conoscere la posizione dei registri tecnici usati per le tassonomie del grafo.
* La distinzione tra grafi concreti documentali e contratti tecnici del validator deve essere mantenuta con disciplina.

## Follow-up

Applicare lo stesso criterio agli altri validator trasversali solo dopo decisioni, requisiti e relazioni grafo dedicati.

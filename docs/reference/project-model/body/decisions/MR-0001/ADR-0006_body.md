# ADR-0006 — Handoff locale come artefatto governato di continuità operativa

## Status

Draft

## Context

Il lavoro governato può estendersi oltre una singola sessione operativa. In questi casi un handoff riproducibile consente di riprendere il lavoro senza dipendere dalla memoria della chat o da archivi prodotti esternamente.

Lo ZIP di handoff nasce dal repository locale, che costituisce la fonte canonica per stato, registri, check, comandi e contenuto del progetto.

Un handoff soltanto riassuntivo non offre sufficiente continuità per la ripresa dello sviluppo da parte di un LLM: il modello necessita anche dei file governati, del codice, dei contratti, dei test e degli altri sorgenti tracciati.

## Decision

ThreatForge introduce un handoff archive locale come artefatto governato di continuità operativa.

Un tool locale tracciato nell'implementation trace registry produce l'archive. Il contenuto usa la label canonica di prodotto `ThreatForge` e include esclusivamente il progetto operativo corrente; gli artefatti legacy archiviati sotto `old/` restano esclusi dallo snapshot di continuità.

L'archive include uno snapshot del progetto basato sui file tracciati da Git, così che un LLM o un operatore possa leggere lo stato sorgente necessario per riprendere lo sviluppo. Lo snapshot esclude `.git`, dipendenze installate, cache, build output e artifact generati non tracciati.

## Consequences

- Benefit: L'handoff deriva dalla fonte canonica locale anziché dalla sandbox della chat.
- Benefit: Lo stato del repository e l'output dei check vengono raccolti dal tool locale.
- Benefit: L'archive supporta la continuazione in una nuova chat o la consegna del contesto a un operatore.
- Cost: L'archive aumenta di dimensione perché contiene lo snapshot dei file tracciati.
- Constraint: Il tool resta sotto MR-0001 perché impacchetta documentazione governata, registri, sorgenti tracciati e verifiche di continuità.
- Constraint: Lo snapshot include soltanto il progetto operativo corrente e gli artefatti Git tracciati ammessi.

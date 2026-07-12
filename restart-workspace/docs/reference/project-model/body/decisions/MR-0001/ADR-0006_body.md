# ADR-0006 — Handoff locale come artefatto governato di continuità operativa

## Stato

Draft.

## Contesto

Il lavoro governato può diventare più lungo della singola sessione operativa. In questi casi serve un handoff riproducibile che permetta di riprendere il lavoro senza dipendere dalla memoria della chat o da archivi prodotti esternamente.

Lo ZIP di handoff deve essere generato dal repository locale, perché il repository è la fonte canonica per stato, registri, check e comandi.

## Decisione

Il progetto introduce un handoff archive locale come artefatto governato di continuità operativa.

L'archive deve essere prodotto da un tool locale tracciato nel registro di implementation trace. Il contenuto deve usare la label di prodotto `ThreatForge` e non deve esporre `restart-workspace` come nome utente o canonico, salvo quando appare come path tecnico.

## Conseguenze

- L'handoff non viene più prodotto dalla sandbox della chat come fonte canonica.
- Lo stato del repository e l'output dei check vengono raccolti dal tool locale.
- Il contenuto dell'archive può essere usato per continuare in una nuova chat o consegnare il contesto a un operatore.
- Il tool resta sotto MR-0001 perché impacchetta documentazione governata, registri e verifiche di continuità.

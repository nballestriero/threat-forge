# MR-0000: Common governance and system-state controls

## Purpose

`MR-0000` governa i controlli trasversali di stato del sistema.

Il suo scopo non è descrivere una funzionalità applicativa specifica, ma garantire che documentazione, requisiti, ADR, grafi, tool, codice e verifiche restino coerenti tra loro.

`MR-0000` esiste per contenere decisioni, requisiti, registry, policy, controlli e validator comuni applicabili a più macro-requirement senza duplicare relazioni istanza-per-istanza in ogni grafo funzionale.

## Scope

Include:

- decisioni comuni di governance trasversale;
- requisiti comuni derivati da decisioni comuni;
- registry e policy condivisi usati da più aree;
- validator comuni che applicano policy trasversali;
- controlli di coerenza tra documentazione e codice;
- controlli di coerenza tra ADR, requisiti, grafi, tool e verifiche;
- regole di collocazione dei tool di governance per macro-requirement.

## Out of Scope

Non include:

- requisiti funzionali specifici di una singola macro area;
- tool applicativi del prodotto finale;
- logica runtime di threat analysis;
- duplicazione di controlli comuni dentro ogni macro-requirement;
- archi ripetitivi verso ogni singola istanza controllata quando l'ambito può essere dichiarato da una policy o da un registry.

## Governance Notes

`MR-0000` è riservato alla governance comune e ai controlli di stato del sistema.

Una macro-area funzionale può definire una struttura o una convenzione, per esempio `MR-0001` può definire la struttura documentale canonica. `MR-0000` governa invece i controlli trasversali che verificano che quella struttura, e le sue relazioni con codice e tool, restino coerenti nel tempo.

Un controllo comune deve dichiarare il proprio ambito tramite registry, policy o contratto controllato, non tramite archi ripetitivi verso ogni singolo record controllato.

Gli artifact già esistenti restano dove sono fino a quando un requisito dedicato e il relativo grafo non ne autorizzano il refactor.

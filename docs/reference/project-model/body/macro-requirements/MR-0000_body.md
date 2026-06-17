# MR-0000: Common governance

## Purpose

Questo macrorequisito comune governa le regole trasversali del project model che non appartengono semanticamente a una sola macro area funzionale.

`MR-0000` esiste per contenere decisioni, requisiti, registry, policy, controlli e validator comuni applicabili a più macro-requirement.

## Scope

Include:

- decisioni comuni di governance trasversale;
- requisiti comuni derivati da decisioni comuni;
- registry e policy condivisi usati da più aree;
- validator comuni che applicano policy trasversali;
- regole di collegamento grafo per controlli comuni.

## Out of Scope

Non include:

- requisiti funzionali specifici di una singola macro area;
- tool applicativi del prodotto finale;
- logica runtime di threat analysis;
- duplicazione di controlli comuni dentro ogni macro-requirement.

## Governance Notes

`MR-0000` è riservato alla governance comune e trasversale.

Un controllo comune deve dichiarare il proprio ambito tramite registry, policy o contratto controllato, non tramite archi ripetitivi verso ogni singolo record controllato.

Gli artifact già esistenti restano dove sono fino a quando un requisito dedicato e il relativo grafo non ne autorizzano il refactor.

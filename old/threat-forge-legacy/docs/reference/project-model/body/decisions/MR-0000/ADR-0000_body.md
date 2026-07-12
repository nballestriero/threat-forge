# ADR-0000 — Introduzione dell'area comune MR-0000 per la governance trasversale

## Status

Accepted.

## Context

Il project model contiene controlli, registry, policy e validator che possono applicarsi trasversalmente a più macro-requirement.

Collocare questi controlli dentro una macro area funzionale specifica crea ambiguità: il controllo sembra appartenere semanticamente a quell'area anche quando governa regole comuni del repository o del project model.

Una modellazione basata su archi ripetitivi verso ogni singola istanza controllata, per esempio un arco separato per ogni ADR governata da una stessa policy, rende il grafo rumoroso e fragile.

Serve quindi una macro area comune dedicata ai controlli trasversali.

## Decision

Il project model introduce `MR-0000` come area comune di governance trasversale.

`MR-0000` è il contenitore semantico per decisioni, requisiti, registry, policy, validator e tool comuni che non appartengono a una singola macro area funzionale.

I controlli comuni devono dichiarare il loro ambito tramite registry, policy o contratto controllato, per esempio con campi come `applies_to`, quando tali campi saranno introdotti da requisiti dedicati.

Il grafo non deve modellare una policy trasversale ripetendo archi istanza-per-istanza verso ogni record controllato quando l'ambito può essere dichiarato in modo compatto dalla policy stessa.

Questo passo introduce solo il contenitore `MR-0000` e la decisione bootstrap `ADR-0000`. Non sposta ancora tool, registry, requisiti o validator esistenti.

## Scope

Questa decisione si applica al project model di `threat-forge` e alla futura organizzazione dei controlli comuni.

In scope:

- creazione di `MR-0000` come macro-requirement comune;
- creazione di `ADR-0000` come decisione bootstrap di `MR-0000`;
- collegamento minimo nel grafo tra `ADR-0000` e `MR-0000`.

Out of scope:

- introduzione di nuovi requisiti `MR-0000REQ-*`;
- spostamento di registry o policy esistenti sotto `MR-0000`;
- refactor di tool esistenti;
- introduzione di nuovi predicati SPO;
- rimozione del file temporaneo di analisi `MR-0000-common-governance-refactor-analysis.tmp.md`.

## Consequences

### Positive consequences

* I controlli trasversali hanno un contenitore semantico dedicato.
* Le macro aree funzionali non vengono sovraccaricate con governance comune.
* Il grafo può restare più compatto evitando relazioni ripetitive per policy trasversali.
* I futuri refactor potranno derivare requisiti e tool da una decisione comune esplicita.

### Negative consequences

* Il project model introduce un identificativo speciale `MR-0000` che deve essere trattato come area comune, non come funzionalità utente finale.
* I controlli già esistenti rimangono temporaneamente nella collocazione attuale finché non vengono migrati con micropassi dedicati.
* I validator futuri dovranno distinguere tra appartenenza semantica a una macro area e ambito applicativo dichiarato da policy trasversali.

## Follow-up

Derivare un primo requisito `MR-0000REQ-0001` per formalizzare la governance dei controlli trasversali.

Solo dopo quel requisito e le relative relazioni grafo, introdurre o spostare registry, policy, tool e validator comuni sotto `MR-0000`.

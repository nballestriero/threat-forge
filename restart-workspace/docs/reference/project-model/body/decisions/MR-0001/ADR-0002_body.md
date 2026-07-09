# ADR-0002 — Vocabolario controllato della documentazione governata

## Status

Draft.

## Context

La documentazione governata usa termini ricorrenti come macro-requirement, decisione, requisito, registro, asset, fonte canonica e output derivato.

Se questi termini restano liberi, documenti diversi possono usare sinonimi o significati divergenti. Questo rende il corpus meno leggibile per persone, sviluppatori e LLM, e rende più difficile applicare controlli deterministici.

## Decision

Adottiamo un vocabolario controllato minimo per i termini della documentazione governata.

Il vocabolario controllato è la fonte canonica dei termini documentali centrali. Ogni termine deve avere almeno:

- identificativo stabile;
- nome canonico;
- stato;
- definizione sintetica.

Il vocabolario può dichiarare anche label controllate con ruolo esplicito, lingua, ragione d'uso, alias ammessi, traduzioni, label candidate e label vietate.

Il vocabolario è salvato come registro governato nel percorso logico:

```text
docs/reference/project-model/registers/vocabularies/documentation-terms.registry.yml
```

Il testo normativo deve preferire termini presenti nel vocabolario controllato. Quando un documento introduce un termine di dominio non ancora registrato, quel termine deve essere trattato come candidato da valutare, non come sinonimo libero.

## Scope

In scope:

- definire l'esistenza del vocabolario controllato dei termini documentali;
- definire il vocabolario come fonte canonica dei termini documentali centrali;
- definire il primo percorso del registro vocabolario;
- permettere label controllate con ruolo esplicito, alias ammessi, traduzioni, label candidate, label storiche e label vietate;
- preparare future metriche deterministiche di qualità terminologica del corpus.

Out of scope:

- definire tutte le tassonomie del progetto;
- definire il registro asset;
- definire formule, soglie o gate di qualità del corpus;
- definire algoritmi di term extraction;
- adottare RDF, SKOS, SHACL o OWL come formato obbligatorio;
- implementare tool o controlli automatici.

## Consequences

### Conseguenze Positive (Benefici)

- I termini centrali della documentazione hanno una fonte canonica.
- I sinonimi liberi diventano rilevabili e discutibili.
- Persone, sviluppatori e LLM hanno un riferimento esplicito per interpretare il corpus documentale.
- I futuri report di qualità del corpus possono confrontare i documenti con un registro controllato.

### Conseguenze Negative (Costi/Rischi)

- Il vocabolario deve essere mantenuto con disciplina editoriale.
- Un vocabolario troppo ampio rischia di diventare rumoroso e poco utile.
- Un vocabolario troppo piccolo non riduce abbastanza ambiguità e sinonimi.
- Alcune label umane possono essere utili per la leggibilità ma non devono creare più fonti canoniche.

## Follow-up

1. Definire i primi requisiti derivati per usare il vocabolario controllato nei documenti governati.
2. Definire una decisione separata per le metriche deterministiche di qualità del corpus documentale.
3. Definire una decisione separata per il registro asset e i riferimenti agli asset documentali.

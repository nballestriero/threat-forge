# ADR-0002 — Vocabolario controllato della documentazione governata

## Status

Draft

## Context

La documentazione governata usa termini ricorrenti come Macro-requirement, Decision, Requirement, registro, asset, fonte canonica e output derivato.

Quando questi termini restano liberi, documenti diversi possono usare sinonimi o significati divergenti. Il corpus diventa meno leggibile per persone, sviluppatori e LLM e più difficile da sottoporre a controlli deterministici.

## Decision

ThreatForge adotta un vocabolario controllato minimo per i termini della documentazione governata.

Il vocabolario controllato costituisce la fonte canonica dei termini documentali centrali. Ogni termine contiene almeno:

- identificativo stabile;
- nome canonico;
- stato;
- definizione sintetica.

Il vocabolario rappresenta anche label controllate con ruolo esplicito, lingua, ragione d'uso, alias ammessi, traduzioni, label candidate e label vietate.

Il registro governato del vocabolario risiede nel percorso logico:

```text
docs/reference/project-model/registers/vocabularies/documentation-terms.registry.yml
```

Il testo normativo privilegia i termini presenti nel vocabolario controllato. Un termine di dominio non ancora registrato entra nel processo come candidato da valutare, anziché come sinonimo libero.

La decisione comprende l'esistenza del vocabolario, il suo ruolo di fonte canonica, il percorso iniziale del registro e la base per future metriche deterministiche di qualità terminologica. Gli incrementi derivati applicano il vocabolario ai documenti governati e separano le decisioni sulle metriche di qualità e sul registro asset.

## Consequences

- Benefit: I termini centrali della documentazione hanno una fonte canonica.
- Benefit: I sinonimi liberi diventano rilevabili e discutibili.
- Benefit: Persone, sviluppatori e LLM dispongono di un riferimento esplicito per interpretare il corpus documentale.
- Benefit: I futuri report di qualità possono confrontare i documenti con un registro controllato.
- Cost: Il vocabolario richiede manutenzione e disciplina editoriale.
- Risk: Un vocabolario troppo ampio può diventare rumoroso e poco utile.
- Risk: Un vocabolario troppo piccolo può lasciare ambiguità e sinonimi non governati.
- Constraint: Le label utili alla leggibilità non creano fonti canoniche alternative.

## Non-goals

- Definire tutte le tassonomie del progetto
- Definire il registro asset
- Definire formule, soglie o gate di qualità del corpus
- Definire algoritmi di term extraction
- Adottare RDF, SKOS, SHACL o OWL come formato obbligatorio
- Implementare tool o controlli automatici

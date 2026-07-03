# ADR-0001 — Adozione del Diátaxis framework per la struttura documentale governata

## Status

Draft.

## Context

La documentazione threat-forge deve distinguere apprendimento, operatività, riferimento normativo e spiegazione.

Senza una classificazione documentale esplicita, explanation, reference, how-to guide e tutorial rischiano di mescolarsi. Questo rende difficile capire quali documenti possono essere sorgenti normativi e quali documenti servono solo a chiarire il modello.

## Decision

Adottiamo il Diátaxis framework come modello di organizzazione documentale per threat-forge.

La documentazione governata deve distinguere:

- tutorial;
- how-to guide;
- reference;
- explanation.

Nel modello threat-forge:

- i documenti `reference` possono contenere sorgenti normativi quando sono collegati a macrorequisiti, decisioni, requisiti, registri, grafi o controlli;
- i documenti `explanation` possono chiarire il modello per persone e LLM, ma non devono essere fonte canonica di requisiti, registry, schema, procedure verificabili o controlli deterministici;
- i documenti `how-to` devono guidare azioni operative;
- i documenti `tutorial` devono guidare apprendimento progressivo.

La documentazione leggibile generata deve presentare i contenuti per tema di macrorequisito. Dentro ogni capitolo MR, le decisioni collegate e i requisiti derivati devono essere presentati vicino al contesto che li giustifica.

Diátaxis organizza la funzione del documento. Non sostituisce registri, grafi, requisiti, asset registry, vocabolari controllati o controlli deterministici.

## Scope

In scope:

- uso di Diátaxis come modello di classificazione documentale;
- distinzione tra tutorial, how-to guide, reference ed explanation;
- separazione tra documentazione normativa e documentazione esplicativa.

Out of scope:

- definire i campi minimi del frontmatter documentale;
- definire il ciclo di vita documentale;
- definire la generazione del libro PDF o delle viste HTML;
- definire tutti i controlli deterministici della documentazione;
- introdurre RDF, SKOS, SHACL o OWL come formato obbligatorio.

## Consequences

### Conseguenze Positive (Benefici)

- La documentazione ha una classificazione comprensibile e stabile.
- Le spiegazioni non vengono confuse con sorgenti normativi.
- I documenti di riferimento possono rimanere precisi e controllabili.
- Il libro generato può essere letto per tema MR, mantenendo ADR e requisiti nel contesto corretto.
- Il modello riduce la probabilità di duplicare informazioni manualmente in documenti pensati per lettori diversi.

### Conseguenze Negative (Costi/Rischi)

- Ogni documento dovrà dichiarare o derivare una classificazione documentale coerente.
- Diátaxis può essere applicato male se diventa una struttura di cartelle rigida invece di un modello basato sul bisogno del lettore.
- La distinzione tra `reference` ed `explanation` richiederà revisione editoriale, non solo controllo automatico.
- Alcune informazioni potranno apparire in più viste generate; bisogna garantire che la fonte canonica resti una sola.

## Follow-up

1. Definire i requisiti derivati per classificare i documenti secondo Diátaxis.
2. Definire una regola di revisione o controllo che impedisca alla documentazione `explanation` di diventare fonte normativa.

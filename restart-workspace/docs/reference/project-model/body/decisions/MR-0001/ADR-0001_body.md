# ADR-0001 — Adozione del Diátaxis framework per la classificazione documentale

## Status

Draft.

## Context

La documentazione threat-forge deve distinguere documenti scritti per apprendere, eseguire un compito, consultare un riferimento o comprendere il modello.

Senza una classificazione documentale esplicita, tutorial, how-to guide, reference ed explanation possono essere confusi. Questa confusione rende incerta l'autorità del contenuto e può portare a usare spiegazioni come se fossero sorgenti normative.

## Decision

Adottiamo il Diátaxis framework come modello di classificazione documentale per threat-forge.

Le categorie documentali Diátaxis sono:

- tutorial;
- how-to guide;
- reference;
- explanation.

Nel modello threat-forge:

- i documenti `tutorial` guidano apprendimento progressivo;
- i documenti `how-to` guidano azioni operative;
- i documenti `reference` descrivono sorgenti consultabili e possono contenere materiale normativo quando sono collegati a macrorequisiti, decisioni, requisiti, registri, grafi o controlli;
- i documenti `explanation` chiariscono il modello per persone e LLM, ma non sono fonte canonica di requisiti, registry, schema, procedure verificabili o controlli deterministici.

Diátaxis classifica la funzione del documento. Non sostituisce registri, grafi, requisiti, asset registry, vocabolari controllati o controlli deterministici.

## Scope

In scope:

- uso di Diátaxis come classificazione documentale;
- distinzione tra tutorial, how-to guide, reference ed explanation;
- separazione tra documentazione normativa e documentazione esplicativa.

Out of scope:

- definire la fonte canonica della categoria Diátaxis;
- definire la convenzione dei percorsi documentali;
- definire i campi minimi del frontmatter documentale;
- definire il ciclo di vita documentale;
- definire la generazione del libro PDF o delle viste HTML;
- definire tutti i controlli deterministici della documentazione;
- introdurre RDF, SKOS, SHACL o OWL come formato obbligatorio.

## Consequences

### Conseguenze Positive (Benefici)

- La documentazione ha una classificazione comprensibile e stabile.
- I documenti esplicativi non vengono confusi con sorgenti normativi.
- I documenti di riferimento possono rimanere precisi e controllabili.
- Programmatori, persone non tecniche, LLM e controlli deterministici possono distinguere il ruolo previsto di ogni documento.

### Conseguenze Negative (Costi/Rischi)

- La categoria Diátaxis richiederà una fonte canonica unica, da definire in una decisione separata.
- Diátaxis può essere applicato male se viene trattato come semplice struttura di cartelle invece che come classificazione basata sul bisogno del lettore.
- La distinzione tra `reference` ed `explanation` richiederà revisione editoriale, non solo controllo automatico.

## Follow-up

1. Definire i requisiti derivati per applicare la classificazione Diátaxis ai documenti governati.

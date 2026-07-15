# ADR-0001 — Adozione del Diátaxis framework per la classificazione documentale

## Status

Draft

## Context

La documentazione ThreatForge distingue documenti scritti per apprendere, eseguire un compito, consultare un riferimento o comprendere il modello.

Senza una classificazione documentale esplicita, tutorial, how-to guide, reference ed explanation possono essere confusi. Questa confusione rende incerta l'autorità del contenuto e può portare a usare spiegazioni come se fossero sorgenti normative.

## Decision

ThreatForge adotta il Diátaxis framework come modello di classificazione documentale.

Le categorie documentali Diátaxis sono:

- tutorial;
- how-to guide;
- reference;
- explanation.

Nel modello ThreatForge:

- i documenti `tutorial` guidano l'apprendimento progressivo;
- i documenti `how-to` guidano azioni operative;
- i documenti `reference` descrivono sorgenti consultabili e includono materiale normativo quando sono collegati a Macro-requirement, Decision, Requirement, registri, grafi o controlli;
- i documenti `explanation` chiariscono il modello per persone e LLM, senza costituire fonte canonica di Requirement, registry, schema, procedure verificabili o controlli deterministici.

Diátaxis classifica la funzione del documento e non sostituisce registri, grafi, Requirement, asset registry, vocabolari controllati o controlli deterministici.

La decisione comprende l'uso di Diátaxis come classificazione documentale, la distinzione tra le quattro categorie e la separazione tra documentazione normativa e documentazione esplicativa. I Requirement derivati applicano questa classificazione ai documenti governati.

## Consequences

- Benefit: La documentazione acquisisce una classificazione comprensibile e stabile.
- Benefit: I documenti esplicativi restano distinti dalle sorgenti normative.
- Benefit: I documenti di riferimento rimangono precisi e controllabili.
- Benefit: Programmatori, persone non tecniche, LLM e controlli deterministici distinguono il ruolo previsto di ogni documento.
- Cost: La categoria Diátaxis richiede una fonte canonica unica governata separatamente.
- Risk: Diátaxis può essere applicato in modo errato quando viene trattato come semplice struttura di cartelle anziché come classificazione basata sul bisogno del lettore.
- Cost: La distinzione tra `reference` ed `explanation` richiede revisione editoriale oltre al controllo automatico.
- Constraint: La classificazione Diátaxis non sostituisce le altre fonti canoniche e i controlli governati.

## Non-goals

- Definire la fonte canonica della categoria Diátaxis
- Definire la convenzione dei percorsi documentali
- Definire i campi minimi del frontmatter documentale
- Definire il ciclo di vita documentale
- Definire la generazione del libro PDF o delle viste HTML
- Definire tutti i controlli deterministici della documentazione
- Introdurre RDF, SKOS, SHACL o OWL come formato obbligatorio

# ADR-0004 — Authoring guidato della documentazione governata

## Status

Draft

## Context

I controlli deterministici intercettano divergenze dopo la scrittura della documentazione. Questa protezione è necessaria, ma non elimina il rischio operativo di duplicare titoli, identificativi, path e campi controllati in più file.

La documentazione governata richiede coerenza tra registri YAML, body Markdown, identificativi, titoli, path e valori controllati. La scrittura manuale di questi elementi aumenta la probabilità di errore a ogni nuovo Requirement o Decision.

Il modello distingue tre livelli:

- guida editoriale durante la scrittura;
- generatori deterministici che creano record e body coerenti;
- check finali che impediscono divergenze residue.

## Decision

ThreatForge supporta l'authoring guidato della documentazione governata tramite strumenti locali e deterministici.

Il registro rimane la fonte canonica strutturata per campi come `id`, `title`, `status`, `body_path` e relazioni. Il body Markdown ripete i dati necessari alla lettura senza diventare fonte autonoma dei campi strutturati.

I generatori creano insieme il record di registro e il body associato, derivando automaticamente identificativi, path e header Markdown quando possibile.

L'authoring guidato dei Requirement deriva dalle fonti canoniche un catalogo deterministico di Macro-requirement, Decision, Requirement padre, valori controllati, significati e regole applicabili. Il medesimo catalogo alimenta lo schema editoriale e il wizard CLI senza duplicare enum o descrizioni nel codice.

Il flusso separa preview e creazione confermata. La creazione applica atomicamente record e body e poi esegue i controlli governati applicabili. `specialized` non è un tipo concreto né un alias di `governance`.

Il core di authoring rimane indipendente dall'IDE e riutilizzabile da CLI, editor, app e automazioni.

I check restano la rete di sicurezza finale senza costituire l'unico meccanismo di coerenza.

## Consequences

- Benefit: Gli autori evitano la creazione manuale di identificativi e path derivabili.
- Benefit: VS Code ed editor equivalenti possono usare JSON Schema, task e snippet per guidare la compilazione.
- Benefit: I generatori CLI costituiscono il primo livello implementativo prima di estensioni editor dedicate.
- Constraint: Ogni generatore resta tracciato come artefatto implementativo e collegato ai Requirement supportati.

## Non-goals

- Introdurre immediatamente una estensione VS Code dedicata
- Sostituire i controlli deterministici esistenti
- Rendere il body Markdown fonte canonica dei campi strutturati

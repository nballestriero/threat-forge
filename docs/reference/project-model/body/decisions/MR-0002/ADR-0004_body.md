# ADR-0004 — Authoring guidato della documentazione governata

## Status

Draft.

## Context

I controlli deterministici intercettano divergenze dopo che la documentazione e stata scritta. Questo e necessario, ma non basta dal punto di vista operativo: l'autore puo gia aver duplicato titoli, id, path e campi controllati in piu file.

La documentazione governata richiede coerenza tra registri YAML, body Markdown, identificativi, titoli, path e valori controllati. Se questi elementi vengono scritti manualmente, la probabilita di errore cresce a ogni nuovo requisito o decisione.

Il modello deve quindi distinguere tre livelli:

- guida editoriale durante la scrittura;
- generatori deterministici che creano record e body coerenti;
- check finali che impediscono divergenze residue.

## Decision

La documentazione governata deve supportare authoring guidato tramite strumenti locali e deterministici.

Il registro rimane la fonte canonica strutturata per campi come `id`, `title`, `status`, `body_path` e relazioni. Il body Markdown ripete i dati necessari alla lettura, ma non diventa fonte autonoma per i campi strutturati.

I generatori devono creare insieme il record di registro e il body associato, derivando automaticamente identificativi, path e header Markdown quando possibile.

I check restano obbligatori come rete di sicurezza, ma non devono essere l'unico modo per mantenere coerenza.

## Consequences

- Gli autori non dovrebbero creare manualmente id e path quando questi possono essere generati.
- VS Code o editor equivalenti possono usare JSON Schema, task e snippet per guidare la compilazione.
- I generatori CLI sono il primo livello implementativo, prima di eventuali estensioni editor dedicate.
- Ogni generatore deve essere tracciato come artefatto implementativo e collegato ai requisiti che supporta.

## Non-goals

Questa decisione non introduce ancora una estensione VS Code dedicata.

Questa decisione non sostituisce i controlli deterministici esistenti.

Questa decisione non rende il body Markdown fonte canonica dei campi strutturati.

# ADR-0001 — Separazione tra core ThreatForge, app e adapter VS Code

## Status

Draft

## Context

Il catalogo di task VS Code governato da MR-0002/ADR-0005 ha dimostrato che i tool locali possono essere esposti dall'editor senza duplicarne la logica.

I task attuali coprono check e simulazioni, ma non definiscono ancora l'architettura per guidare la produzione di artefatti implementativi.

La scelta dell'ambiente di authoring evita che regole, identificativi, path e tracciabilità dipendano da una singola interfaccia.

## Decision

ThreatForge separa tre livelli:

- il core e i tool governati contengono contratti, validazioni, generazione e tracciabilità canonica;
- l'app ThreatForge orchestra progetti, Requirement, workflow e risultati;
- Visual Studio Code costituisce il primo IDE adapter per l'authoring tecnico.

L'adapter VS Code fornisce task, comandi, selezioni guidate e viste dedicate invocando capacità governate senza reimplementarle.

Visual Studio e altri IDE restano adapter futuri. La loro introduzione conserva inalterate le regole canoniche del core.

Il primo incremento pianifica un artefatto implementativo in modalità read-only a partire da un Requirement governato esistente.

## Consequences

- Benefit: VS Code offre la superficie iniziale di authoring senza diventare fonte canonica delle regole.
- Benefit: L'app ThreatForge rimane il centro futuro di orchestrazione del prodotto.
- Benefit: I tool CLI restano riutilizzabili da app, editor, CI e LLM.
- Cost: Una custom extension VS Code entra nel prodotto quando task e comandi semplici non risultano più sufficienti.
- Constraint: Il supporto Visual Studio entra in seguito come adapter separato.

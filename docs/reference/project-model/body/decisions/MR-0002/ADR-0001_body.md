# ADR-0001 — Separazione tra core ThreatForge, app e adapter VS Code

## Stato

Draft.

## Contesto

Il catalogo di task VS Code governato da MR-0001/ADR-0007 ha dimostrato che i tool locali possono essere esposti dall'editor senza duplicare la loro logica.

I task attuali coprono check e simulazioni, ma non definiscono ancora l'architettura per guidare la produzione di artefatti implementativi.

La scelta dell'ambiente di authoring deve evitare che regole, identificativi, path e tracciabilità dipendano da una singola interfaccia.

## Decisione

ThreatForge separa tre livelli:

- il core e i tool governati contengono contratti, validazioni, generazione e tracciabilità canonica;
- l'app ThreatForge orchestra progetti, requisiti, workflow e risultati;
- Visual Studio Code è il primo adapter IDE per l'authoring tecnico.

L'adapter VS Code può fornire task, comandi, selezioni guidate e viste dedicate, ma deve invocare capacità governate senza reimplementarle.

Visual Studio e altri IDE restano possibili adapter futuri. La loro introduzione non deve richiedere modifiche alle regole canoniche del core.

Il primo incremento deve pianificare un artefatto implementativo in modalità senza scrittura, partendo da un requisito governato esistente.

## Conseguenze

- VS Code è la superficie iniziale di authoring, non la fonte canonica delle regole.
- L'app ThreatForge rimane il centro futuro di orchestrazione del prodotto.
- I tool CLI restano riutilizzabili da app, editor, CI e LLM.
- Una custom extension VS Code può essere introdotta quando task e comandi semplici non sono più sufficienti.
- Il supporto Visual Studio può essere aggiunto in seguito come adapter separato.

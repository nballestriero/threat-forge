# MR-0009: Reporting, dashboards and product intelligence

## Purpose

Definisce i report generali, le dashboard e le viste di stato prodotto che aggregano informazioni su threat-forge, sui child project governati e sulla loro qualità documentale, tracciabilità, readiness di sicurezza e stato operativo.

## Scope

Include:

- report generali sullo stato di threat-forge;
- report generali sui child project governati;
- dashboard di qualità documentale e project-model governance;
- report di traceability tra ADR, requisiti, grafo, implementazioni, verifiche ed evidenze;
- report di readiness per analisi di sicurezza e threat-analysis workflow;
- viste aggregate su gate, validator, controlli e stato dei repository governati;
- esportazioni future HTML, JSON o PDF quando formalizzate da ADR e requisiti specifici;

## Out of Scope

Non include:

- implementare l'application shell o i componenti React generici, che appartengono a `MR-0002`;
- gestire progetti figli come dominio primario, che appartiene a `MR-0003`;
- definire il modello base di threat analysis, che appartiene a `MR-0004`;
- definire STRIDE o STRIDE-AI, che appartengono rispettivamente a `MR-0005` e `MR-0006`;
- sostituire logging, audit trail o evidence trail, che appartengono a `MR-0008`;

## Governance Notes

`MR-0009` è una macro-area funzionale distinta perché i report generali aggregano dati da più aree prodotto invece di appartenere a un singolo dominio operativo.

I report generali devono usare l'architettura applicativa e i confini di interfaccia definiti in `MR-0002`, ma le loro semantiche, aggregazioni, fonti e output devono essere governati da ADR e requisiti propri in `MR-0009`.

La sua presenza in questo micropasso definisce il confine documentale dell'area, non autorizza ancora implementazioni runtime, dashboard o export senza ADR e requisiti specifici.

# MR-0003: Project and child project management

## Purpose

Definisce la gestione dei progetti threat-forge e dei futuri progetti figli creati/governati dalla piattaforma.

## Scope

Include:

- registrazione e lifecycle dei progetti;
- scaffold iniziale dei child projects;
- profili di documentazione e threat analysis assegnati al progetto;
- collegamento tra parent threat-forge e repository figlio;
- applicazione dei gate minimi ai child projects;

## Out of Scope

Non include:

- implementare il modello base di asset/boundary/data flow;
- definire STRIDE o STRIDE-AI;
- gestire ruoli utente di dettaglio;
- definire audit/logging trasversale;

## Governance Notes

`MR-0003` è una macro-area funzionale distinta. Deve avere ADR, requisiti, grafo e implementazioni propri quando il lavoro operativo inizierà.

La sua presenza in questo micropasso definisce il confine documentale dell’area, non autorizza ancora implementazioni runtime o UI senza ADR e requisiti specifici.

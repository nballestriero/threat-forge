# MR-0004: Base threat analysis model

## Purpose

Definisce il modello base obbligatorio per descrivere il sistema prima di applicare overlay di threat analysis.

## Scope

Include:

- asset;
- actor;
- component/process;
- external system;
- entry point;
- trust boundary;
- data flow;
- data store;
- data classification;
- assumptions and open questions;

## Out of Scope

Non include:

- classificare minacce STRIDE;
- classificare minacce STRIDE-AI;
- definire interfacce UI generiche;
- gestire utenti o audit;

## Governance Notes

`MR-0004` è una macro-area funzionale distinta. Deve avere ADR, requisiti, grafo e implementazioni propri quando il lavoro operativo inizierà.

La sua presenza in questo micropasso definisce il confine documentale dell’area, non autorizza ancora implementazioni runtime o UI senza ADR e requisiti specifici.

# MR-0005: STRIDE threat analysis overlay

## Purpose

Definisce l’overlay STRIDE applicato sopra il modello base di analisi, senza duplicare asset, boundary o data flow.

## Scope

Include:

- mapping delle categorie Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege;
- threat findings derivati da asset/data flow/boundary;
- mitigazioni e requisiti di sicurezza collegati;
- evidenze e verifiche dei controlli STRIDE;

## Out of Scope

Non include:

- creare il modello base degli asset e dei boundary;
- definire minacce AI-specifiche;
- gestire utenti o audit;
- costruire componenti UI generici;

## Governance Notes

`MR-0005` è una macro-area funzionale distinta. Deve avere ADR, requisiti, grafo e implementazioni propri quando il lavoro operativo inizierà.

La sua presenza in questo micropasso definisce il confine documentale dell’area, non autorizza ancora implementazioni runtime o UI senza ADR e requisiti specifici.

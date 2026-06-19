# MR-0006: STRIDE-AI threat analysis overlay

## Purpose

Definisce l’overlay STRIDE-AI per sistemi che includono componenti AI, agenti, RAG, tool calling o superfici prompt.

## Scope

Include:

- AI systems and model boundaries;
- prompt surfaces;
- RAG/data sources;
- tool/function calling;
- training/fine-tuning/inference data;
- human-in-the-loop points;
- AI-specific threats and mitigations;

## Out of Scope

Non include:

- sostituire il modello base MR-0004;
- sostituire STRIDE generale MR-0005;
- gestire utenti o audit;
- implementare UI generiche;

## Governance Notes

`MR-0006` è una macro-area funzionale distinta. Deve avere ADR, requisiti, grafo e implementazioni propri quando il lavoro operativo inizierà.

La sua presenza in questo micropasso definisce il confine documentale dell’area, non autorizza ancora implementazioni runtime o UI senza ADR e requisiti specifici.

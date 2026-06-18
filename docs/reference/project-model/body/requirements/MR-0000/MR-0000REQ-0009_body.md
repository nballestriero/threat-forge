# MR-0000REQ-0009 — Discovery dei file governati tramite registry e path dichiarati

## Intent

Il grafo deve modellare tracciabilità logica, non ogni accesso fisico ai file.

## Requirement

I tool MR-0000 devono scoprire i file fisici governati tramite registry e path dichiarati, non tramite archi ripetitivi verso ogni file controllato.

Fonti ammesse per la discovery includono:

- registry delle macro-requirement;
- registry delle decisioni;
- registry dei requisiti;
- indice dei grafi;
- file grafo;
- campi `body_path`;
- path dei tool;
- path dei contratti e registri tecnici.

Il grafo deve restare focalizzato sulle relazioni logiche tra MR, ADR, REQ, tool e verifiche.

## Verification

Una futura verifica dovrà controllare che il runner scopra i file dai registry e segnali file mancanti o path incoerenti senza richiedere archi file-per-file nel grafo.

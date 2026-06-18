# MR-0000REQ-0010 — Orchestrazione dei validator specializzati per formati canonici e coerenza codice-documentazione

## Intent

Il sistema deve verificare i formati canonici e la coerenza tra documentazione, codice e grafo tramite controlli specializzati orchestrati da `MR-0000`.

## Requirement

Il runner MR-0000 deve orchestrare validator specializzati per controllare progressivamente:

- formato dei record e body delle macro-requirement;
- formato dei record e body ADR;
- formato dei record e body dei requisiti;
- formato e tassonomie dei grafi;
- coerenza tra requisiti, tool, codice e verifiche;
- coerenza tra path dichiarati nei registry e file presenti nel repository.

Ogni validator specializzato deve restare governato da ADR, requisito e relazioni grafo dedicate prima della sua introduzione o migrazione.

## Verification

Una futura verifica dovrà dimostrare che il runner MR-0000 invoca i validator specializzati e aggrega gli esiti in un unico controllo di stato sistema.

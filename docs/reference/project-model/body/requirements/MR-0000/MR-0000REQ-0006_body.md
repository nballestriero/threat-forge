# MR-0000REQ-0006 — Refactor del validator del formato grafo sotto MR-0000

## Intent

Il controllo del formato dei grafi è un controllo trasversale di stato del sistema e deve essere governato da `MR-0000`.

## Requirement

Il validator del formato grafo deve essere collocato sotto:

```text
backend/tools/MR-0000/check-graph-format.mjs
```

Il comando pubblico deve restare:

```text
npm run docs:graph-format
```

Il validator deve continuare a verificare:

- struttura dei file grafo elencati in `graph.index.yml`;
- tipi nodo ammessi;
- predicati SPO ammessi;
- coerenza tra subject/object e tipi ammessi dai predicati;
- assenza di inferenze semantiche non dichiarate nei file governati.

Il file sorgente del validator deve dichiarare tramite JSDoc i requisiti implementati, le decisioni di origine e il macro-requirement che governa il tool.

## Verification

Il comando:

```text
npm run docs:graph-format
```

deve terminare con codice successo `0` quando i grafi, il contratto tecnico e i registri tecnici sono coerenti.

Il grafo `GRAPH-0000` deve collegare questo requisito al validator con `implemented_by` e il validator al requisito con `verifies`.

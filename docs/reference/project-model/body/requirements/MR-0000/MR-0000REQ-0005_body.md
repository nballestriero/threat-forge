# MR-0000REQ-0005 — Collocazione dei contratti tecnici dei validator MR-0000

## Intent

I contratti tecnici stabili applicati dai validator MR-0000 devono stare vicino ai tool che li eseguono.

## Requirement

I contratti tecnici e i registri tecnici usati da un validator trasversale di `MR-0000` devono essere collocati sotto la stessa area backend del tool che li applica.

Per il controllo del formato grafo, i file canonici devono essere:

```text
backend/tools/MR-0000/contracts/graph-format.contract.json
backend/tools/MR-0000/registries/graph-node-types.registry.yml
backend/tools/MR-0000/registries/spo-predicates.registry.yml
```

I file grafo concreti restano sotto:

```text
docs/reference/project-model/registers/graph/*.graph.yml
```

La documentazione deve descrivere tali file e può referenziarli, ma il validator deve leggere la copia canonica collocata vicino al tool.

## Verification

Il comando:

```text
npm run docs:graph-format
```

verifica che il validator trovi e usi i contratti tecnici collocati sotto `backend/tools/MR-0000/`.

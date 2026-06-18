# MR-0000REQ-0007 — Runner unico MR-0000 per i gate di coerenza del project model

## Intent

Il project model deve avere un entrypoint unico per eseguire i controlli di coerenza governati da `MR-0000`.

## Requirement

Il sistema deve introdurre un runner unico `MR-0000` che orchestri i gate di coerenza del project model.

Il runner deve:

- eseguire validator specializzati senza duplicarne la logica;
- propagare correttamente exit code e fallimenti;
- rendere leggibile quale gate è fallito;
- restare collocato sotto `backend/tools/MR-0000/`;
- essere collegato nel grafo al requisito che lo introduce e alle verifiche che abilita.

Il runner non deve sostituire i validator specializzati con un controllo monolitico.

## Verification

Una futura verifica dovrà eseguire il runner unico e fallire se uno dei validator orchestrati fallisce.

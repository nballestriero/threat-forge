# MR-0000REQ-0004 — Identità ADR contestuale per macro-requirement

## Intent

Le ADR devono poter usare identificativi sequenziali locali alla macro-area che le possiede.

## Requirement

Un ADR id deve essere univoco dentro il proprio `macro_requirement_id`, non nell'intero corpus del project model.

L'identità completa di una decisione è la coppia:

```text
macro_requirement_id + id
```

Per esempio, le seguenti decisioni sono distinte e valide:

```text
MR-0000/ADR-0001
MR-0001/ADR-0001
```

Il validator dei registri ADR deve quindi rilevare duplicati solo quando due ADR hanno lo stesso `id` nello stesso `macro_requirement_id`.

Il validator deve continuare a verificare che:

* ogni ADR id rispetti il pattern controllato;
* ogni ADR dichiari un `macro_requirement_id` esistente;
* ogni ADR del registry dichiari lo stesso `macro_requirement_id` del registry che la contiene;
* ogni `body_path` punti a un file esistente e coerente con la macro-area;
* campi e valori controllati restino governati dall'ADR governance registry.

## Verification

Il controllo è implementato dal validator dei campi ADR:

```text
tools/docs/check-adr-registry-fields.mjs
```

Il comando di verifica è:

```text
npm run docs:adr-registry-fields
```

Il grafo deve collegare questo requisito al validator con `implemented_by` e deve collegare il validator al requisito con `verifies`.

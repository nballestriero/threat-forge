# MR-0000REQ-0001 — Governance dei controlli trasversali comuni

## Intent

Il project model deve rappresentare i controlli trasversali comuni tramite `MR-0000`, senza assegnarli impropriamente a una macro area funzionale specifica.

## Requirement

I controlli comuni del repository e del project model devono appartenere semanticamente a `MR-0000` quando governano regole trasversali applicabili a più macro-requirement.

Un controllo comune può essere una decisione, un requisito, un registry, una policy, un contratto, un validator o un tool che non appartiene a una singola macro area funzionale.

I controlli comuni devono dichiarare il proprio ambito tramite registry, policy o contratto controllato, invece di duplicare relazioni grafo istanza-per-istanza verso ogni record controllato quando l'ambito è comune e dichiarabile in modo compatto.

## Acceptance Criteria

* `MR-0000` è il contenitore semantico dei controlli trasversali comuni.
* Le decisioni e i requisiti comuni sono collocati sotto `MR-0000`.
* Il grafo comune di `MR-0000` è separato dal grafo funzionale di `MR-0001`.
* I controlli trasversali futuri devono essere introdotti tramite ADR, requisito e grafo prima di introdurre o modificare tool.
* I tool trasversali futuri devono essere collegati al requisito che li introduce e devono dichiarare il loro ambito tramite policy o registry controllato.

## Verification

Questo requisito non introduce ancora un tool di verifica.

La verifica minima di questo passo è documentale e strutturale:

```text
npm run docs:graph-format
npm run docs:pages
node tools/docs/check-docs-structure.mjs
npm run docs:adr-registry-fields
```

Un micropasso successivo potrà introdurre controlli deterministici dedicati per verificare che i graph file siano separati per macro-requirement e che i controlli comuni non vengano modellati nel grafo funzionale sbagliato.

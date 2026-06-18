# MR-0000REQ-0008 — Traversal canonico top-down del project model

## Intent

Il grafo deve essere navigabile a partire dalla macro-area, perché la macro-area è la radice logica di decisioni, requisiti, implementazioni e verifiche.

## Requirement

Il project model deve supportare traversal canonico top-down:

```text
MR -> ADR -> REQ -> TOOL -> verifica
```

La relazione canonica tra macro-requirement e ADR dovrà essere MR-rooted, per esempio:

```text
MR -> has_decision -> ADR
```

La relazione corrente `ADR belongs_to MR` potrà restare solo finché necessaria alla migrazione, ma non deve essere il modello canonico di traversal a regime.

## Verification

Una futura verifica dovrà controllare che ogni ADR governata da un macro-requirement sia raggiungibile dalla macro-area tramite la relazione top-down canonica.

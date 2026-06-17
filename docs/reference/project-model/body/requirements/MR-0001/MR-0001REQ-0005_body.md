# MR-0001REQ-0005 — Validazione del formato body delle ADR funzionali

## Intent

The project model must validate the Markdown body format used by functional ADR documents.

## Requirement

Every functional ADR body file must follow the standard ADR body format defined by the ADR governance registry.

At minimum, the validation must check that:

* the body file exists for every functional ADR registry record;
* the body H1 starts with the ADR id and contains the ADR title;
* required sections are present;
* required sections use the exact governed heading names;
* required sections appear in the governed order;
* every ADR body file is linked from an ADR registry record;
* no orphan ADR body file exists outside the governed registry/body model.

## Verification expectation

A future dedicated validator must check ADR body format governance deterministically.

The validator must be introduced only after it is represented as a graph implementation and verification artifact for this requirement.

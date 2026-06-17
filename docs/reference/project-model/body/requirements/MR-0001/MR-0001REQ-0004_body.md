# MR-0001REQ-0004 — Validazione dei campi controllati dei registri ADR

## Intent

The project model must validate the structured fields used by ADR registry records.

## Requirement

Every functional ADR registry record must expose the required controlled fields defined by the ADR governance registry.

The validation must ensure that ADR registry metadata is deterministic, complete, and cross-checked against existing project model records.

At minimum, the validation must check that:

* each ADR id is unique within the governed ADR corpus;
* each ADR id matches the controlled ADR identifier pattern;
* each ADR status belongs to the controlled ADR status list;
* each ADR decision type belongs to the controlled decision type list;
* each ADR macro requirement reference points to an existing macro requirement;
* each ADR body path is present, normalized, and points to an existing Markdown body file;
* unsupported fields are rejected or reported according to the ADR governance registry rules.

## Verification expectation

A future dedicated validator must check ADR registry field governance deterministically.

The validator must be introduced only after it is represented as a graph implementation and verification artifact for this requirement.

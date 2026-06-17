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

## Verification

The deterministic validator is implemented by:

```text
tools/docs/check-adr-registry-fields.mjs
```

The validator must be executable through:

```text
npm run docs:adr-registry-fields
```

The project model graph must link this requirement to the validator with `implemented_by`, and must link the validator back to this requirement with `verifies`.

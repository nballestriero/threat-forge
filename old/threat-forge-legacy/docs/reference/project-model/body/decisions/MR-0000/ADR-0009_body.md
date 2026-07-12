# ADR-0009 — Semantic gate hardening before child execution and knowledge graph ingestion

## Status

Accepted.

## Context

Threat-forge has completed the project-scoped child documentation UI milestone and now has a read-only demo flow in which a selected child project can expose documentation through a project-scoped platform API without falling back to platform documents.

A full ADR and graph situation review after that milestone found several classes of defects that current gates do not yet prevent:

- legacy graph records can omit inverse ADR ownership relations such as `ADR -> belongs_to -> MR` even when `MR -> has_decision -> ADR` exists;
- a graph relation can make a requirement appear justified by a different or additional ADR than the `derived_from_decision_id` declared in the requirement registry;
- child-project governance registry status values can drift from runtime/API/DB contract values because the registry gate validates registry internals but not contract vocabulary alignment;
- canonical component names can drift across governed titles and labels, for example between historical Project Model Explorer language and the current Project Documentation Explorer product slice;
- real child-project gate execution and future Knowledge Graph ingestion would be unsafe if stale, incomplete or semantically inconsistent child data were allowed to contribute to LLM-assisted development or security analysis.

These issues show that the repository needs semantic gates, not only file-format gates. The problem must be addressed before adding a real child-project gate executor, child-project Knowledge Graph ingestion, Base Analysis runtime, STRIDE overlays or STRIDE-AI overlays.

## Decision

MR-0000 will own the next gate-hardening decision boundary for semantic consistency across governed registries, graphs, contracts and controlled vocabularies.

The next implementation-bearing work must prioritize deterministic gates that fail on semantic drift before new product features. In particular:

1. graph and registry ownership consistency must be checked across ADR registries, requirement registries and graph relations;
2. `justifies` must be treated as canonical requirement ownership unless a future, governed specialization model introduces explicit secondary relations such as specialization, constraint or informative linkage;
3. controlled values used in registries, runtime contracts, OpenAPI schemas, storage records and UI states must have a single governed vocabulary owner or an explicit mapping;
4. child-project gate status modeling must distinguish planning, execution, freshness and Knowledge Graph ingestion states before real child-project execution is enabled;
5. canonical component/product names must be guarded in governed titles and labels without attempting to police every historical prose occurrence;
6. Knowledge Graph ingestion for LLM-assisted development and security analysis must be blocked for child projects whose registration, gate results, freshness or semantic consistency are not trustworthy.

The working plan must record this semantic hardening phase as the next strategic focus.

## Scope

In scope:

- recording semantic gate hardening as the next priority;
- defining the first requirements for graph/registry ownership consistency, controlled vocabulary consistency, minimal canonical naming and child-execution/KG-ingestion prerequisites;
- preserving future ADR/requirement specialization as an explicit governed model rather than an implicit exception;
- deferring real child-project gate execution until status, freshness and ingestion semantics are clear.

Out of scope:

- implementing any new gate in this micropasso;
- normalizing existing legacy graph records;
- changing runtime child-project storage or API behavior;
- executing child-project gates against arbitrary repositories;
- introducing a general terminology registry for all prose;
- implementing Knowledge Graph ingestion, Base Analysis, STRIDE or STRIDE-AI.

## Consequences

### Positive consequences

* Threat-forge addresses the class of semantic drift that allowed registry/contract status mismatch and graph/registry ownership mismatch.
* Future child-project execution and Knowledge Graph ingestion receive a clear safety prerequisite.
* The project avoids growing feature code on top of ambiguous status values or inconsistent graph ownership.
* ADR/REQ specialization remains possible, but only through explicit, governed semantics.

### Negative consequences

* Feature velocity pauses while semantic gates are strengthened.
* Some legacy graph records may need normalization before stricter gates can be enabled.
* Controlled vocabulary alignment may require small contract or registry migrations before child gate execution can proceed.

## Follow-up

1. Define child gate planning, execution, freshness and Knowledge Graph ingestion status semantics.
2. Implement a controlled vocabulary consistency gate across registries and contracts.
3. Implement graph and registry ownership consistency checks.
4. Normalize legacy graph ADR ownership relations and resolve any `derived_from_decision_id` versus `justifies` mismatches.
5. Define real child-project onboarding and gate execution lifecycle after semantic gates are in place.
6. Define Knowledge Graph ingestion boundaries for LLM-assisted development and security analysis.

# MR-0000REQ-0020 — Runtime source traceability coverage expansion

## Intent

The code traceability gate currently protects governed tooling, but the product runtime has expanded into `backend/src` and `frontend/src`. Runtime modules with JSDoc traceability declarations must become part of deterministic source-code traceability, not remain manually trusted.

## Requirement

The code traceability gate must be expanded to cover governed runtime source roots after the corresponding graph SourceModule nodes and relations exist.

## Scope

This requirement governs the expansion of code-traceability scanning to runtime application source roots. It does not require every future runtime file to be implemented in this micropasso.

## Rules

- The gate must include `backend/src` and `frontend/src` only after their governed source modules are represented in graph records.
- Runtime files declaring `@implementsRequirement` must have corresponding graph traceability.
- Graph relations must identify the requirements implemented by runtime source modules.
- The expansion must fail closed: missing source files, stale graph paths or unrecognized requirement references must fail the gate.
- The implementation may be staged if graph coverage must be added before the source-root default changes.

## Acceptance Criteria

```gherkin
Scenario: Frontend source file claims a requirement without graph traceability
  Given a frontend source file declares @implementsRequirement MR-0002REQ-0039
  And the graph has no corresponding SourceModule node or implemented_by relation
  When the expanded code traceability gate runs
  Then the gate fails with a diagnostic naming the source file and requirement
```

## Verification Expectation

The implementation must update graph records and gate configuration together, then prove that `npm run docs:code-traceability` covers runtime source roots.

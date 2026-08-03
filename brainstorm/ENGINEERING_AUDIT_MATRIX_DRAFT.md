# Engineering audit matrix draft — testability and effect boundaries

This file is a temporary engineering audit note.

It is not a Macro-requirement, Decision, Requirement, registry, governed body,
verification artifact or canonical architectural source. It records observations
against one immutable repository baseline so that a later governed decision can
be based on inspected evidence rather than style preference.

## 1. Audit baseline

Repository:

```text
https://github.com/nballestriero/threat-forge.git
```

Branch:

```text
master
```

Commit:

```text
3a875b21b174a2175f82aeb164c3067d243b5961
```

Tag:

```text
project-model-target-project-vscode-schema-routing-complete
```

Audit date:

```text
2026-08-03
```

The matrix is descriptive. `good`, `mixed`, `weak`, `low`, `medium` and `high`
are audit labels, not governed lifecycle or acceptance values.

## 2. Audit question

The initial question is whether repository tools expose a consistent boundary
between:

```text
configuration
→ deterministic calculation
→ structured result
→ persistent effects
→ human or process presentation
```

The audit does not assume that every large file is defective or that every tool
must use the same physical module layout. It looks for independently verifiable
responsibilities and explicit effect boundaries.

## 3. Criteria

| Criterion | Desired evidence |
| --- | --- |
| Configuration timing | Paths and environment values are resolved at function or composition time, with explicit overrides available to tests. |
| Import safety | Importing a module does not parse CLI arguments, mutate files, print diagnostics or set process state. |
| Callable boundary | The principal behavior is exported or otherwise directly callable by focused verification. |
| Structured result | Deterministic behavior returns data such as diagnostics, counters, plans or changes instead of only printing it. |
| Effect isolation | Filesystem, subprocess, Git, terminal and process-exit effects are separated from deterministic rules. |
| Thin delivery adapter | CLI or editor code translates input and output without owning domain rules or canonical inventories. |
| Direct verification | Tests invoke the callable boundary in-process. |
| Isolated integration verification | Real I/O is exercised inside disposable workspaces with cleanup and invariance checks. |
| Failure injection | Tests can force intermediate effect failures and demonstrate rollback, not only precondition failures. |
| Canonical-source discipline | Rules and controlled values are loaded from governed sources rather than duplicated in adapters. |

## 4. Evidence types

The matrix distinguishes three forms of verification:

- `direct`: the test imports and calls the behavior under test;
- `subprocess`: the test executes the real command in an isolated workspace;
- `gate-indirect`: the behavior is exercised only as part of a broader repository gate.

A subprocess test is valuable and may be the correct test for a delivery boundary.
It does not by itself make internal deterministic branches or intermediate
transaction failures directly controllable.

## 5. Initial matrix

| ID | Artifact | Role | Configuration | Import safety | Callable / structured core | Effect boundary | Existing verification | Principal finding | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUD-0001 | `tools/MR-0002/run-security-requirement-authoring.mjs` | Security Requirement preview/create runner | Function-time through `resolveRootDir(options)`; planner, catalog and apply boundary accept overrides | Good: direct-execution guard | Good: `executeSecurityRequirementAuthoring` is exported and returns a structured result; formatter is separate | Mixed: the exported path is injectable, but `main()` reconstructs planning and application directly instead of delegating to the exported execution boundary | Direct tests already cover preview immutability, inactive create failure and one active apply call; the same suite uses temporary roots for planning | This is a useful local reference pattern. The external review was wrong that no dedicated test exists. A later cleanup may make `main()` consume the same execution boundary, but no urgent refactor is established | Low |
| AUD-0002 | `tools/MR-0002/promote-governed-implementation-scaffold.mjs` | Promotion of scaffold lifecycle and implementation trace | Module-load environment and paths | Weak: top-level execution runs on import | Weak: useful internal functions exist, but none are exported and `run()` prints rather than returns a result | Mixed: `applyTransaction` has explicit rollback logic, but calls `fs` directly and cannot receive a fault-injectable filesystem boundary | Subprocess checker creates real temporary workspaces, verifies the positive transaction, executes governed negative fixtures, checks byte-for-byte invariance and checks temporary residue cleanup | The tool is not untested. The uncovered risk is narrower: intermediate write/rename/unlink failures inside the transaction cannot be deterministically injected and asserted in-process | High |
| AUD-0003 | `tools/MR-0003/check-base-analysis-registry.mjs` | Canonical BAE registry, projection and occurrence checker/materializer | Module-load environment, paths and flags | Mixed: direct-execution guard prevents `main`, but configuration is fixed and cached at import | Mixed: some reusable functions are exported; `runCanonicalCheck()` is not exported and builds a report that it does not return | Weak: canonical loading, stored projection handling, fixture execution, nested verification subprocess, report writing, output formatting and process exit are orchestrated together | Dedicated BAE model tests exist and the checker launches them as a subprocess; the whole checker is mainly exercised through command/gate execution | The external review is substantially confirmed. Candidate shape: `resolveConfig(options)`, calculation returning a report, separate report writer/formatter and thin `main` | High |
| AUD-0004 | `tools/MR-0002/check-governed-implementation-promotion.mjs` | Verification driver for promotion behavior | Module-load environment and paths | Weak: verification executes at module top level | Weak: verification helpers are internal and the final result is only printed | Mixed: it deliberately owns integration effects, but static checks, fixture construction, subprocess execution, directory snapshots and report presentation are in one module | Strong subprocess coverage with disposable workspaces, positive behavior, negative fixtures, invariance and cleanup | This is good integration-test practice and a useful fixture recipe. It is not itself an example of an importable deterministic checker core | Medium |
| AUD-0005 | `tools/MR-0004/test/target-project-generator.test.mjs` | Reference verification suite for target generation | Test-owned explicit destinations | Not applicable as production module | Direct calls to exported generator and target checker | Strong test isolation: real temporary directories, real files, `try/finally` cleanup and canonical-tree invariance | Direct plus isolated integration verification | This is the preferred repository-local recipe for behavior whose contract includes real filesystem output. It should be reused without implying that mocks are forbidden where deterministic fault injection is required | Reference |

## 6. Corrections to the external review

### 6.1 Confirmed

- `run-security-requirement-authoring.mjs` exposes injected planner and apply
  boundaries and an import-safe direct-execution guard.
- `check-base-analysis-registry.mjs` resolves configuration at module load and
  combines calculation, nested test execution, report persistence, presentation
  and process state.
- `promote-governed-implementation-scaffold.mjs` does not expose its transaction
  or validation functions as callable module boundaries.
- The repository already contains a strong disposable-workspace verification
  pattern.

### 6.2 Corrected

- The Security Requirement authoring runner already has direct tests. Its exported
  execution boundary is exercised for preview, fail-closed create and successful
  delegation.
- Scaffold promotion already has a dedicated governed checker with positive and
  negative isolated-workspace coverage. The missing evidence concerns injected
  failures inside transaction steps, not total absence of testing.
- File length is a triage signal only. A refactor requires evidence of mixed
  responsibilities or inaccessible behavior, not a line-count threshold.

### 6.3 Not yet verified

- The coverage percentages reported by the external review have not been
  reproduced from a recorded command and artifact.
- The three largest cited modules have not yet been audited responsibility by
  responsibility.
- A repository-wide count of module-load configuration, top-level execution and
  exported deterministic boundaries has not yet been produced.

## 7. Existing architectural authority

`MR-0002/ADR-0007` already establishes, for reusable product features:

```text
validated command
→ application service
→ explicit ports
→ concrete adapters
→ feature-local composition root
→ thin CLI / HTTP delivery adapters
```

It also requires independently testable application services and warns against
application logic leaking into delivery adapters.

The current audit identifies a possible scope gap rather than declaring a new
architecture: the Decision is explicitly framed around reusable product features,
while repository checkers, materializers and mutation tools evolved through
several older shapes. A later governance microstep must decide whether to:

1. clarify the applicability of ADR-0007 to deterministic repository tools;
2. add requirements under an existing Decision; or
3. create a new Decision dedicated to checker and mutation-tool effect boundaries.

The audit does not choose among those alternatives.

## 8. Candidate pattern vocabulary

The following vocabulary is proposed for the next audit iteration, not yet as a
canonical implementation standard.

### Pattern A — importable orchestration

```text
resolveConfig(options)
→ load canonical inputs
→ calculate structured result
→ optional apply boundary
→ format result
→ thin direct-execution main
```

Useful for authoring runners and product commands.

### Pattern B — deterministic checker core

```text
resolveConfig(options)
→ collect inputs
→ evaluate rules
→ return { diagnostics, counters, projections }
→ write optional report
→ format console output
→ thin main sets exit status
```

Useful for repository consistency checks.

### Pattern C — rollback-capable mutation

```text
plan mutation
→ verify preconditions
→ apply through explicit effect boundary
→ verify postconditions
→ rollback on any failure
→ return transaction result
```

It requires both real-workspace integration tests and deterministic failure
injection at intermediate effect steps.

## 9. Next audit set

Before any hardening code, inspect at least:

```text
tools/MR-0005/check-common-finding-case-study.mjs
tools/MR-0003/base-dfd-projection-validator.mjs
tools/MR-0003/dfd-html-renderer.mjs
one additional check-* module with a small importable core
one additional write-capable tool with rollback behavior
```

For each artifact, record:

```text
responsibilities
module-load configuration
import-time effects
exported boundaries
structured outputs
canonical source dependencies
persistent effects
subprocess effects
direct tests
integration tests
negative fixtures
rollback or failure-injection coverage
```

## 10. Decision gate

No implementation refactor follows automatically from this draft.

A governed hardening phase may begin only after:

1. the audit covers a representative checker, renderer, authoring runner and
   write-capable transaction;
2. the coverage command and result artifact are reproducible;
3. current requirements and Decisions are checked for sufficient authority;
4. the smallest necessary ADR/Requirement change is selected;
5. expected compatibility and regression evidence are written before code.

## 11. Research handoff

After publishing this matrix and the aligned non-canonical working plan, the next
active workstream moves to the separate DDTA research repository:

```text
source verification
→ source notes
→ citable excerpt ledger
→ cross-source synthesis
→ Chapter 2 background
→ Chapter 3 state of the art and research gap
```

ThreatForge feature development and hardening code remain paused during that
research workstream. The matrix stays available as the pre-hardening engineering
observation for a later immutable ThreatForge baseline.

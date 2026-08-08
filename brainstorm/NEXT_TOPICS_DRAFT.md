# Next topics draft — DDTA portability and ThreatForge neutrality phase

This file is a temporary planning and handoff note.

It is not a Macro-requirement, Decision, Requirement, registry, governed body or
canonical source. It may be edited, replaced or deleted when the corresponding
governed work or research records exist.

Last updated: 2026-08-08.

## 1. Repository baselines

ThreatForge repository:

```text
https://github.com/nballestriero/threat-forge.git
```

Branch:

```text
master
```

ThreatForge product/planning parent baseline for this update:

```text
cae0f7b6b37f430ac4e857aabf6ef9f87c89dbb1
docs: record engineering audit and thesis literature plan
```

The commit that publishes this file is intentionally planning-only. After publication,
that descendant commit becomes the repository planning baseline while product semantics
remain anchored to the unchanged governed sources it contains.

The engineering audit in `brainstorm/ENGINEERING_AUDIT_MATRIX_DRAFT.md` remains
historical evidence against its intentionally immutable baseline:

```text
3a875b21b174a2175f82aeb164c3067d243b5961
project-model-target-project-vscode-schema-routing-complete
```

Do not rewrite that audit baseline merely because the planning baseline advanced.

DDTA research repository:

```text
https://github.com/nballestriero/documentation-driven-threat-analysis.git
```

Current published research baseline:

```text
a8046536ac9e8c49a9ce317466d5afcf5ac56672
research: constrain DDTA evaluation to portable documentation
```

Expected local ThreatForge state before any new planning or audit microstep:

```text
## master...origin/master
```

with no working-tree, staged or untracked changes.

The operational project lives at repository root. `old/` is reference-only legacy
material and is not an operational canonical source.

## 2. Repository separation and authority

The two repositories keep different authority:

```text
threat-forge
= product requirements, Decisions, implementation, verification and technical documentation

documentation-driven-threat-analysis
= literature, research methodology, baselines, observations, evidence, claims and thesis projection
```

Research observations do not automatically create ThreatForge product obligations.
Statements about ThreatForge in the thesis must refer to immutable ThreatForge
commits or tags.

The current planning work is deliberately non-canonical. No product ADR,
Requirement, schema, tool, validator, fixture or implementation follows merely
from this file.

## 3. Frozen thesis scope that ThreatForge planning must respect

The current thesis evaluates one input mode only:

```text
portable-by-construction governed documentation
-> DDTA portability / analysis-readiness contract satisfied
-> methodology-neutral Base Analysis
-> methodology-specific overlay/plugin
-> method-specific Analysis Record
-> methodology-neutral Common Finding
-> human review
-> accepted Finding(s)
-> governed Security Requirement
-> change-aware re-analysis
```

The current thesis does not evaluate:

```text
arbitrary / generic / legacy documentation
-> migration into DDTA-portable documentation
```

That migration problem is future work. ThreatForge must not acquire a current
thesis obligation to implement a best-effort generic-document migration or LLM
extraction path.

Portable-by-construction also does not mean embedding STRIDE, STRIDE-AI or another
methodology into project documentation. The common project model must remain
methodology-neutral.

## 4. Current research status

The central literature corpus is complete at 21/21.

Standalone thesis milestones exist for:

```text
Chapter 2 — Background
Chapter 3 — State of the art and research gap
```

The research scope, RQ1, H1, CLM-0001, terminology, outline and working research
ledger are aligned to the portable-by-construction input boundary.

The targeted STRIDE-AI source has been read in full:

```text
Mauri, Lara; Damiani, Ernesto.
Modeling Threats to AI-ML Systems Using STRIDE.
Sensors 22(17), 6662, 2022.
DOI 10.3390/s22176662
```

Its role is a STRIDE-AI method definition and asset-centered reference. It does
not prove controlled superiority or universal coverage.

One targeted research dependency remains before the neutrality audit can be
treated as complete:

```text
select and fully read an authoritative STRIDE method/reference case
with enough explicit method semantics and expected results to support the
STRIDE plugin oracle/evaluation
```

This targeted source does not change the 21/21 central-corpus count.

## 5. Current ThreatForge capabilities relevant to the thesis

At product-semantic baseline `cae0f7b6`, ThreatForge already has governed concepts and
supporting implementation for:

```text
governed document models and authoring
Base Analysis Elements and relations
Target Project lifecycle
methodology-specific Analysis Records
Common Findings and review states
Security Requirement model and authoring boundary
complete simulated analysis-core case-study chain
unified governed Markdown assistance for VS Code and Target Projects
versioned methodology-plugin boundary
provenance and reverse traceability across the demonstrated chain
```

The current case study remains a controlled simulation. It does not demonstrate:

```text
a production STRIDE plugin
a production STRIDE-AI plugin
automatic Finding acceptance
automatic Security Requirement acceptance
universal methodology support
generic/legacy documentation migration
```

The two real methodology plugins required by the thesis are STRIDE and STRIDE-AI.
Their purpose is to demonstrate that two distinct method semantics can consume
the same common core; they are not evidence that every methodology is supported.

## 6. Working rules

- Continue through small verified microsteps.
- Do not create code, tools, schemas, fixtures or gates before sufficient governed
  authority exists.
- Every implementation artifact must remain represented in implementation trace.
- Traceable JavaScript artifacts must declare Requirement, Decision,
  Macro-requirement and implementation status in JSDoc.
- Do not modify legacy graphs under `old/`.
- Registries remain append-first unless an explicit governed mutation permits a
  different operation.
- Never use direct `git add`, `git commit` or `git push` for ThreatForge.
- Use the governed repository operation runner.
- Keep methodology-specific semantics outside the common analysis core.
- Downstream Analysis, Finding and Security Requirement work must not mutate
  upstream canonical sources.
- Treat architecture and neutrality observations as hypotheses until verified
  against immutable repository baselines and the research literature.
- Keep scientific DDTA evidence distinct from general software-quality evidence.
- Do not introduce generic/legacy migration as a current thesis product
  requirement.

## 7. Current priority order

### Phase A — align the non-canonical ThreatForge plan with the frozen thesis scope

Status:

```text
current microstep
```

Change only:

```text
brainstorm/NEXT_TOPICS_DRAFT.md
```

Do not modify:

```text
brainstorm/ENGINEERING_AUDIT_MATRIX_DRAFT.md
```

because its baseline and observations are historical audit evidence.

Exit criteria:

- product/planning parent baseline for this update is recorded as `cae0f7b6...`;
- research baseline is recorded as `a804653...`;
- portable-by-construction-only thesis scope is explicit;
- generic/legacy migration is explicitly future work;
- no canonical product authority changes;
- full repository gate passes;
- publication occurs only through the governed repository operation runner.

### Phase B — close the targeted STRIDE research dependency

Repository:

```text
documentation-driven-threat-analysis
```

Action:

```text
select authoritative STRIDE method/reference material
-> verify identity
-> read completely
-> record exact method semantics, assumptions and limitations
-> identify a defensible reference case / expected-result oracle
```

No ThreatForge implementation starts merely because a STRIDE source is selected.

### Phase C — inventory ThreatForge model semantics against product baseline `cae0f7b6`

Use the planning-only descendant commit for the actual repository snapshot after this
file is published, while treating `cae0f7b6` as the unchanged product-semantic baseline.

Inspect without changing product semantics first.

Minimum inventory:

```text
Base Analysis types and relations
document-model registries and body models
Functional Requirement and Security Requirement structures
methodology plugin contract
Analysis Record model
Common Finding envelope
taxonomies and controlled vocabularies
reference/provenance records
baseline/staleness records
materialization and projection rules
VS Code authoring schemas/diagnostics
Target Project authoring overlays
extension mechanisms
```

For every relevant concept record at least:

```text
concept
current semantic meaning
canonical owner
repository path
governed authority
common project knowledge?
method-owned semantics?
implementation-only convenience?
provenance/version behavior
editor representation
validator/checker representation
extension behavior
```

This phase produces an inventory, not a refactor.

### Phase D — literature-to-model neutrality audit

Compare the Phase C inventory with:

```text
completed central literature corpus
authoritative STRIDE reference
Mauri/Damiani STRIDE-AI reference
```

Classify every relevant concept as:

```text
retain as common
revise/generalize
make optional
move to methodology extension/plugin
implementation-only
insufficiently supported
```

The audit must explicitly challenge the working proposition in the research
repository that every Functional Requirement has exactly one primary Base
Analysis focus selected from:

```text
actor
component
asset
boundary
data_flow
```

That proposition may survive, be generalized, become optional or be rejected.
Existing implementation is not evidence of methodological neutrality.

The primary output is a source-backed neutrality matrix in the research
workstream. It does not automatically mutate ThreatForge.

### Phase E — derive and freeze the DDTA portability / analysis-readiness contract

Only after the neutrality audit, define the documentation writing/input method in
the research repository.

The contract must define:

```text
minimum common documentary knowledge
stable identity rules
relation-writing rules
source/provenance rules
baseline/version rules
controlled vocabulary and extension rules
uncertainty / contradiction / missing-information representation
human-review boundary
portable-by-construction conformance criteria
```

The contract must be frozen before evaluation cases are assessed and must not
encode case-specific expected Base Analysis elements or methodology-specific
expected results.

A research contract does not automatically become a ThreatForge product
requirement. Product changes require a separate governance decision.

### Phase F — freeze the evaluation protocol

Freeze RQ1-RQ4 cases, reference models, expected-result oracles, measures and
acceptance criteria before implementation is tuned to the cases.

Required evaluation coverage includes:

```text
portable documentation -> reviewed Base Analysis
same Base Analysis -> STRIDE and STRIDE-AI
method-specific semantics remain plugin-owned
method outputs -> Common Finding
accepted Findings -> governed Security Requirements
controlled changes -> stale/re-analysis behavior
```

Cost, ROI and broad adoption are not primary evaluation measures.

### Phase G — expand the engineering and authoring audit

Continue the existing non-canonical engineering audit without rewriting its
historical baseline.

Cover:

```text
responsibility cohesion
import safety
deterministic callable cores
effect isolation
structured diagnostics
rollback/failure injection
direct/integration/negative verification
coverage evidence
canonical-value duplication
VS Code model authorability
Target Project authoring round trips
shared editor/checker validation semantics
```

Prefer one canonical source of syntax/structural validity shared by repository
checks and editor assistance, while allowing adapter-specific delivery logic.

### Phase H — select the smallest governed product changes

Only after Phases C-G:

1. inspect existing Decisions and Requirements for sufficient authority;
2. decide whether no change, clarification, new Requirement or new Decision is
   actually needed;
3. write expected regression/evaluation evidence before implementation;
4. follow the canonical governance flow for every product change.

Do not reserve ADR identifiers in this plan.

### Phase I — implement the real two-plugin vertical slice

Implement only the governed changes required to demonstrate:

```text
one canonical Base Analysis
-> real STRIDE plugin
-> STRIDE Analysis Record / candidate results
-> Common Finding boundary

same canonical Base Analysis
-> real STRIDE-AI plugin
-> STRIDE-AI Analysis Record / candidate results
-> same Common Finding boundary
```

Then demonstrate reviewed Finding -> governed Security Requirement and controlled
stale/re-analysis behavior.

Do not generalize this demonstration into universal methodology support.

### Phase J — usability, guides and diagrams

Before the artifact is considered complete, audit or create the minimum
documentation needed by a new user and maintainer:

```text
tutorial
how-to
reference
explanation
```

Prepare baseline-bound diagrams for:

```text
ThreatForge architecture
registry/body/schema/validator relationships
VS Code integration and shared validation
Base Analysis -> plugin -> Analysis Record -> Common Finding -> Security Requirement
provenance and stale propagation
ThreatForge / Target Project boundaries
```

The documentation must explain both normal usage and the governed development
workflow.

## 8. Engineering audit checkpoint retained unchanged

`brainstorm/ENGINEERING_AUDIT_MATRIX_DRAFT.md` remains the starting engineering
observation.

Its previously recorded high-priority areas remain hypotheses to verify, notably:

```text
promotion transaction failure injection
Base Analysis checker separation of deterministic rules and effects
representative renderer/checker/mutation-tool audit
reproducible coverage evidence
```

Do not reinterpret the matrix as evidence that every large module must be
refactored. File size remains only a triage signal.

## 9. Product-governance gate

No research or audit item automatically creates a ThreatForge requirement.

For every candidate product change:

```text
research/audit observation
-> inspect existing governed authority
-> decide smallest governance change
-> ADR when a real decision is required
-> Requirement before implementation
-> graph/trace updates
-> implementation with JSDoc authority
-> verification
-> governed repository operation
```

The common analysis core must remain free of STRIDE/STRIDE-AI classifications.
Method-owned semantics stay in method-owned extensions/plugins.

## 10. Current exact action

Apply and review a non-canonical planning-only replacement containing:

```text
REPLACE brainstorm/NEXT_TOPICS_DRAFT.md
```

Then run:

```powershell
node .\tools\repo-check.mjs
git diff --check
git status --short
git diff --stat
```

Do not stage, commit or push during the review gate.

After explicit diff approval, publish only through:

```powershell
node .\tools\MR-0002\run-governed-repository-operation.mjs --commit-push "docs: align ThreatForge plan with portable DDTA scope"
```

## 11. Next exact action after plan publication

Return to the DDTA research repository and close the authoritative STRIDE
reference dependency.

After that source is fully read and recorded, return to ThreatForge baseline
`cae0f7b6...` (or the planning-only descendant commit) and perform the model
semantics inventory before proposing any canonical product change.

## 12. Continuation prompt

```text
We are continuing two strictly separated workstreams.

ThreatForge product/planning parent baseline for this update:
cae0f7b6b37f430ac4e857aabf6ef9f87c89dbb1
docs: record engineering audit and thesis literature plan

ThreatForge planning baseline after publication:
the planning-only descendant commit containing this file; do not reinterpret that
documentation-only commit as a product-semantic change.

Historical engineering-audit baseline:
3a875b21b174a2175f82aeb164c3067d243b5961
project-model-target-project-vscode-schema-routing-complete

Research baseline:
a8046536ac9e8c49a9ce317466d5afcf5ac56672
research: constrain DDTA evaluation to portable documentation

Thesis scope:
Evaluate portable-by-construction governed documentation satisfying the DDTA
portability / analysis-readiness contract. Generic/arbitrary/legacy documentation
migration is future work and must not become a current ThreatForge product
obligation.

Next research dependency:
Select and fully read an authoritative STRIDE method/reference case.

Next ThreatForge evidence work:
Inventory model semantics on an immutable baseline, then perform a literature-to-
model neutrality audit before freezing the DDTA writing method or creating
canonical product changes.

Demonstrator methods:
STRIDE and STRIDE-AI over the same methodology-neutral Base Analysis. Two methods
demonstrate the plugin boundary; they do not prove universal methodology support.

Language:
Italian.

Working style:
Small verified microsteps. Never transfer research observations into ThreatForge
product requirements automatically. Never use direct git add/commit/push in
ThreatForge; publish only through the governed repository operation runner.
```

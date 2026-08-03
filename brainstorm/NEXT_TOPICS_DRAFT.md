# Next topics draft — engineering audit and thesis literature phase

This file is a temporary planning and handoff note.

It is not a Macro-requirement, Decision, Requirement, registry, governed body or
canonical source. It may be edited, replaced or deleted when the corresponding
governed work or research records exist.

Last updated: 2026-08-03.

## 1. Repository baseline

Repository:

```text
https://github.com/nballestriero/threat-forge.git
```

Branch:

```text
master
```

Current published baseline:

```text
3a875b21b174a2175f82aeb164c3067d243b5961
fix: route Target Project authoring to local VS Code schema
```

Tag:

```text
project-model-target-project-vscode-schema-routing-complete
```

Expected local state before this documentation microstep:

```text
## master...origin/master
```

with no working-tree changes.

The operational project lives at repository root. `old/` is reference-only legacy
material and is not an operational canonical source.

## 2. Repository separation

Two repositories have different authority:

```text
threat-forge
= product requirements, Decisions, implementation, verification and technical documentation

documentation-driven-threat-analysis
= literature, research methodology, baselines, observations, evidence, claims and thesis projection
```

Research observations do not create ThreatForge product obligations. Statements
about ThreatForge in the thesis must refer to immutable commits or tags.

## 3. Working rules

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
- Treat architecture review comments as hypotheses until verified against the
  immutable repository baseline.

## 4. Current capabilities relevant to the handoff

At the current baseline, ThreatForge already has governed models and supporting
implementation for:

```text
governed document models and authoring
Base Analysis Elements and relations
Target Project lifecycle
methodology-specific Analysis Records
Common Findings and review states
Security Requirement model and authoring boundary
complete simulated case-study chain
unified governed Markdown assistance for VS Code and Target Projects
```

The current case study is still a controlled simulation. It does not demonstrate
a production STRIDE plugin, automatic Finding derivation, automatic review or
automatic Security Requirement generation.

## 5. Engineering review checkpoint

The external review identified two broad implementation shapes:

```text
importable and injectable behavior
versus
module-configured command/checker behavior with mixed effects
```

The first verified audit is stored in:

```text
brainstorm/ENGINEERING_AUDIT_MATRIX_DRAFT.md
```

Verified corrections include:

- Security Requirement authoring already has direct tests for its injectable
  execution boundary;
- scaffold promotion already has positive and negative disposable-workspace
  verification;
- the remaining promotion gap is deterministic injection of failures inside
  transaction steps;
- the Base Analysis registry checker does combine module-load configuration,
  calculation, nested verification, report writing, presentation and process
  status;
- file size is a triage signal, not a refactoring rule.

## 6. Current priority order

### Phase A — publish the audit checkpoint

Status:

```text
in progress
```

Artifacts:

```text
brainstorm/ENGINEERING_AUDIT_MATRIX_DRAFT.md
brainstorm/NEXT_TOPICS_DRAFT.md
```

Exit criteria:

- matrix distinguishes direct, subprocess and gate-indirect verification;
- inaccurate review statements are corrected with repository evidence;
- no canonical Decision, Requirement or implementation is changed;
- full repository gate passes;
- documentation-only change is published through the governed runner.

### Phase B — thesis literature workstream

Status:

```text
next
```

Repository:

```text
https://github.com/nballestriero/documentation-driven-threat-analysis.git
```

No ThreatForge code development occurs during the initial literature workstream.
The research sequence is:

```text
verify corpus identity
→ retrieve and read sources
→ write one source note per source
→ collect citable excerpts with exact locations
→ record faithful paraphrases separately from quotations
→ map source propositions to thesis topics and candidate claims
→ synthesize by research area
→ write Chapter 2
→ rewrite Chapter 3 from source-specific evidence
```

Required research artifacts are expected to include:

```text
one structured summary per registered source
one citable excerpt ledger per source or one normalized shared ledger
source-specific support / contradiction / open-question records
cross-source comparison tables
chapter-oriented synthesis notes
```

The exact filenames and schemas must be decided in the research repository after
inspecting its current source-note template and governance conventions.

Minimum fields for each citable excerpt entry:

```text
source_id
citation_key
source version or stable identifier
page, section or paragraph location
verbatim excerpt
faithful paraphrase
local interpretation
candidate thesis chapter or subsection
candidate supported proposition
quotation or paraphrase usage
verification status
```

The verbatim excerpt, paraphrase and researcher interpretation must remain
separate fields so that the final thesis does not accidentally present an
interpretation as an author quotation.

Exit criteria for Chapter 2:

- every substantive statement is traceable to at least one completed source note;
- source identity is verified sufficiently for citation;
- quotations have exact locations;
- source results and author-stated limitations are distinguished from DDTA
  interpretation;
- the five research areas are covered with source-specific evidence.

Exit criteria for Chapter 3:

- the generic comparison matrix is replaced by source-specific rows;
- each comparison cell cites a source and location or is explicitly unknown;
- concrete tools are compared without treating project documentation as
  peer-reviewed evidence;
- the DDTA research gap is an inference from the reviewed corpus, not a claim of
  novelty asserted without evidence;
- contradictory or tension-producing sources are retained, not silently merged.

### Phase C — return to ThreatForge engineering governance

Status:

```text
deferred until the first literature and state-of-the-art milestone
```

Before implementation hardening:

1. expand the audit to representative large checker, renderer and mutation tools;
2. reproduce coverage from a recorded command and retain its artifact;
3. inspect whether existing ADR-0007 and requirements already provide sufficient
   authority;
4. decide whether the smallest change is an ADR clarification, new requirements
   under an existing Decision or a new Decision;
5. define regression evidence before editing implementation.

No ADR identifier is reserved by this working plan.

### Phase D — technical explanation and UML

Status:

```text
deferred until architecture observations and hardening direction are stable
```

Planned documentation topics:

```text
logical document model ↔ YAML registry ↔ Markdown body ↔ representation profiles
Base Analysis ↔ Analysis Record ↔ Common Finding ↔ Security Requirement
application service ↔ port ↔ adapter ↔ composition root
VS Code adapter ↔ shared governed Markdown assistance core ↔ canonical sources
MR → ADR → Functional Requirement → Base Analysis → analysis → Finding → Security Requirement
rollback-capable mutation and verification boundaries
```

Technical explanations belong primarily to ThreatForge. The thesis will use a
baseline-bound synthesis rather than maintain an independent duplicate of the
product documentation.

## 7. Deferred product work

The following work remains relevant but is not the next action:

```text
real methodology plugin infrastructure
real STRIDE plugin
real STRIDE-AI plugin
web editor adapter
additional Target Project studies
staleness evaluation
engineering hardening implementation
```

The methodology plugin contract is specified, but production plugin
infrastructure and a real STRIDE implementation are not demonstrated by the
current simulated case study.

## 8. Current exact action

Apply and review the documentation replacement drop-in containing:

```text
ADD     brainstorm/ENGINEERING_AUDIT_MATRIX_DRAFT.md
REPLACE brainstorm/NEXT_TOPICS_DRAFT.md
```

Then run:

```powershell
node .\tools\repo-check.mjs
git diff --check
git status --short
git diff --stat
```

Publish only through:

```powershell
node .\tools\MR-0002\run-governed-repository-operation.mjs --commit-push "docs: record engineering audit and thesis literature plan"
```

## 9. Next exact action after publication

Switch to the DDTA research repository and inspect, without modifying first:

```text
literature/README.md
literature/literature.registry.yml
literature/templates/source-note.template.md
literature/reading-order.md
literature/research-gap-map.md
literature/approach-comparison-matrix.md
thesis/bibliography/references.bib
```

Then propose one research microstep that creates the source-summary and citable
excerpt workflow before writing new Chapter 2 or Chapter 3 prose.

## 10. Continuation prompt

```text
We are continuing two strictly separated workstreams.

ThreatForge baseline:
3a875b21b174a2175f82aeb164c3067d243b5961
project-model-target-project-vscode-schema-routing-complete

ThreatForge state:
An initial non-canonical engineering audit matrix has been published. Product
feature development and hardening code are paused. Do not create ADRs,
Requirements or implementation until the audit is expanded and the smallest
governance change is selected.

Research repository:
https://github.com/nballestriero/documentation-driven-threat-analysis.git

Research next step:
Inspect the literature registry, source-note template, reading order, research-gap
map, comparison matrix and bibliography. Design a workflow that produces one
faithful summary per source and a citation-ready excerpt ledger with exact page or
section locations. Then complete the background and state-of-the-art chapters from
source-specific evidence.

Language:
Italian.

Working style:
Small verified microsteps. Distinguish source facts, researcher inference and
missing evidence. Never transfer research observations into ThreatForge product
requirements automatically.
```

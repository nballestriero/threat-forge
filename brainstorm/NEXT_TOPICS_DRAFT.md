# Next topics draft — analysis core, methodology plugins and thesis handoff

This file is a temporary planning and handoff note.

It is not a macro-requirement, not a decision, not a requirement, not a registry, not a governed body and not a canonical source.

It may be edited, replaced or deleted after the analysis-core direction is stabilized and the corresponding ADRs and requirements have been created.

Last updated: 2026-07-24.

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
9ae06f8 — analysis: implement canonical methodology-specific analysis records
```

Expected local state at handoff:

```text
## master...origin/master
```

with no working-tree changes.

The operational project lives at repository root. `old/` contains reference-only legacy material and is not an operational canonical source.

## 2. Working rules

Continue through small verified steps.

Mandatory sequence:

```text
ADR
→ Functional Requirement
→ Governance Requirement
→ implementation planning
→ implementation scaffold
→ implementation
→ focused verification
→ scaffold promotion
→ gate registration
→ full repository gate
→ governed commit/push
```

Rules:

- Do not create code, tools, schemas, fixtures or gates before the governing requirement exists.
- Every implementation artifact must be represented in the implementation trace registry.
- Traceable JavaScript artifacts must declare implemented requirement, source decision, macro-requirement and implementation status in JSDoc.
- Do not modify legacy graphs manually.
- Never use direct `git add`, `git commit` or `git push`.
- Use the governed repository operation runner.
- Registries remain append-first unless a governed mutation mechanism explicitly permits another operation.
- Analysis-domain YAML records do not become governed document models.
- Methodology-specific semantics must not leak into the common core.
- Analysis, Finding and Security Requirement derivation must not mutate upstream canonical sources.

## 3. Strategic objective

Build and demonstrate the common analysis core before implementing real STRIDE or STRIDE-AI.

Target chain:

```text
Macro-requirement
→ ADR
→ Functional Requirement
→ Base Analysis
→ Methodology-specific Analysis Record
→ Common Finding
→ Security Requirement
→ Implementation Artifact
→ Verification Artifact
```

Methodologies are plugins.

The common core owns:

- common identities and record boundaries;
- discovery and reference resolution;
- lifecycle and derivation eligibility;
- Finding review-state rules;
- cross-model coherence;
- stable diagnostics;
- generated editor schemas;
- impact and staleness boundaries.

A methodology plugin owns:

- method identifier and compatibility version;
- method-specific payload schema;
- classifications and applicability rules;
- failure modes and attack classes;
- method-specific diagnostics and validation.

The common core must not implement concrete STRIDE categories or STRIDE-AI failure modes.

## 4. Current state

### 4.1 Completed — Methodology-specific Analysis Record

Governed sources:

```text
MR-0005ADR-0001REQ-0004
MR-0005ADR-0001REQ-0004GOV-0001
```

Published commit:

```text
9ae06f8 — analysis: implement canonical methodology-specific analysis records
```

Implemented artifacts:

```text
tools/MR-0005/lib/methodology-specific-analysis-record-model.mjs
tools/MR-0005/check-methodology-specific-analysis-records.mjs
tools/MR-0005/lib/materialize-methodology-specific-analysis-record-schema.mjs
tools/MR-0005/test/methodology-specific-analysis-record.test.mjs
tools/MR-0005/fixtures/methodology-specific-analysis-record/negative-fixtures.registry.json
.vscode/schemas/methodology-specific-analysis-record.schema.json
```

Editor association:

```text
**/*.analysis-record.yml
→ .vscode/schemas/methodology-specific-analysis-record.schema.json
```

Supported governed subjects:

```text
base_analysis_element
base_analysis_relation
functional_requirement
```

Explicit derivation states:

```text
accepted
not_accepted
```

The common model checks only the outer `method_payload` mapping. Its internal semantics remain owned by the selected method.

### 4.2 Completed — Case-study smoke test

Case study:

```text
examples/case-studies/documentation-to-base-analysis
```

References used:

```text
BAE-0005
BAE-REL-0003
MR-0001ADR-0001REQ-0001
```

Temporary smoke workspace:

```text
.threat-forge/smoke/documentation-to-base-analysis
```

Positive result:

```text
Methodology-specific analysis record validation passed (1 record(s)).
```

Negative result after replacing `BAE-0005` with `BAE-9999`:

```text
analysis-record.model.unresolved-subject
exit code: 1
```

The valid reference was restored, validation passed again and the canonical repository remained clean.

### 4.3 Defined but not implemented — Common Finding

Governed sources:

```text
MR-0005ADR-0002REQ-0001
MR-0005ADR-0002REQ-0001GOV-0001
```

Required common fields and behavior:

- stable Finding identity;
- exactly one originating Analysis Record;
- affected BAE, Base Analysis relations or Functional Requirements;
- at least one Functional Requirement before state `accepted`;
- concrete threat scenario;
- expected consequences;
- rationale or evidence;
- explicit review state: `proposed`, `accepted` or `rejected`;
- no inferred acceptance;
- no method-specific classifications in the common record;
- no automatic merging of independent Findings;
- accepted Finding can be referenced by Security Requirements;
- Security Requirement creation does not mutate the Finding.

Not implemented:

```text
canonical model
YAML profile and file glob
validator
Analysis Record origin resolver
affected-subject resolver
JSON Schema materializer
VS Code YAML association
negative fixtures
test suite
gate entries
```

### 4.4 Defined but not implemented — Security Requirement

Governed sources:

```text
MR-0001ADR-0009REQ-0001
MR-0001ADR-0009REQ-0001GOV-0001
```

Required identity:

```text
<Functional Requirement ID>SEC-<four digits>
```

Example:

```text
MR-0001ADR-0001REQ-0001SEC-0001
```

Required behavior:

- fifth canonical governed document model;
- `requirement_type: security`;
- exactly one Functional Requirement parent;
- one or more accepted Finding references;
- same Macro-requirement and ADR ownership as the parent;
- dedicated Markdown body profile;
- no redefinition of Finding identity, lifecycle or acceptance.

Required body sections:

```text
Intent
Parent Functional Requirement
Finding derivation
Security obligation
Scope
Acceptance
```

### 4.5 Not yet governed — Methodology plugin boundary

No plugin code may begin before new governed sources are authored.

The next ADR must decide:

- plugin API ownership;
- plugin discovery and canonical method source;
- plugin API version and compatibility;
- payload-schema publication;
- stable plugin diagnostics;
- unavailable-plugin behavior;
- isolation from the common core;
- deterministic validation result;
- fixture-plugin status;
- conditions that permit deterministic Finding derivation.

## 5. Confirmed architecture

### 5.1 Analysis Record, Finding and Security Requirement are distinct

```text
Analysis Record
= one application of one method to a scope and governed subjects

Common Finding
= one normalized threat scenario originating from one Analysis Record

Security Requirement
= one governed obligation addressing one or more accepted Findings
```

One Analysis Record may originate multiple independent Findings.

### 5.2 Finding implementation status is derived

Do not store `implemented: true|false` in the Finding.

Canonical Finding data owns only review state:

```text
proposed
accepted
rejected
```

Resolution is projected from downstream links:

```text
accepted_unaddressed
addressed_by_security_requirement
implementation_in_progress
implemented
verified
```

These labels are provisional until governed.

Projection chain:

```text
Finding
← Security Requirement
← Implementation Artifact
← Verification Artifact
```

### 5.3 Direction of references

```text
Analysis Record
→ governed analysis subjects

Finding
→ one originating Analysis Record
→ affected governed subjects

Security Requirement
→ one Functional Requirement parent
→ one or more accepted Findings
```

Downstream creation must not mutate upstream records.

### 5.4 Staleness

Every change triggers validation. Not every change rewrites downstream records.

```text
change
→ canonical validation
→ dependency impact analysis
→ stale detection
→ reviewed update only where needed
```

Initial blocking level:

- unresolved or duplicate identity;
- missing required relation;
- incompatible lifecycle state;
- unavailable plugin when deterministic derivation is required.

Future semantic level:

- canonical subject fingerprint changes;
- Analysis Record becomes stale;
- Findings and Security Requirements become review candidates through a derived projection;
- no automatic content rewrite.

Fingerprints must derive from canonical logical representations, not raw bytes.

## 6. Target simulated records

### 6.1 Structurally valid but unverified method

```yaml
schema_version: 1
id: ANALYSIS-0001
method_id: future-method
contributor_id: analyst-demo
scope: "Demonstration request flow"
subjects:
  - kind: base_analysis_element
    id: BAE-0005
  - kind: base_analysis_relation
    id: BAE-REL-0003
  - kind: functional_requirement
    id: MR-0001ADR-0001REQ-0001
derivation_state: not_accepted
method_payload:
  classification: unverified-placeholder
```

Expected projection:

```text
core record: valid
plugin: unavailable
payload: unverified
deterministic derivation: blocked
```

### 6.2 Fixture demo plugin record

The fixture plugin must not be named STRIDE.

Provisional method ID:

```text
demo-method
```

```yaml
schema_version: 1
id: ANALYSIS-0002
method_id: demo-method
contributor_id: analyst-demo
scope: "Demonstration request flow"
subjects:
  - kind: base_analysis_element
    id: BAE-0005
  - kind: base_analysis_relation
    id: BAE-REL-0003
  - kind: functional_requirement
    id: MR-0001ADR-0001REQ-0001
derivation_state: accepted
method_payload:
  classification: demonstration-case
  observation: boundary-crossing
```

The demo plugin validates fixture semantics only and must not claim to implement a real methodology.

### 6.3 Target Common Finding

Provisional representation:

```yaml
schema_version: 1
id: FINDING-0001
originating_analysis_id: ANALYSIS-0002
affected_subjects:
  - kind: base_analysis_element
    id: BAE-0005
  - kind: base_analysis_relation
    id: BAE-REL-0003
  - kind: functional_requirement
    id: MR-0001ADR-0001REQ-0001
scenario: >
  The demonstration request can be altered while crossing the service
  domain boundary.
consequences: >
  The service can process information different from the information
  supplied by the demonstration user.
evidence: >
  BAE-0005 crosses the service boundary through BAE-REL-0003.
review_state: proposed
```

Field names and file glob remain provisional until implemented canonically.

### 6.4 Target Security Requirement

Provisional registry record:

```yaml
id: MR-0001ADR-0001REQ-0001SEC-0001
title: "Protect the demonstration request from unauthorized modification"
status: draft
requirement_type: security
macro_requirement_id: MR-0001
decision_id: ADR-0001
parent_requirement_id: MR-0001ADR-0001REQ-0001
finding_ids:
  - FINDING-0001
body_path: docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001SEC-0001_body.md
```

The exact Finding-reference field remains provisional until the fifth model is materialized.

## 7. Work plan

### Milestone A — Govern methodology plugins

Status:

```text
not started
```

Order:

1. inspect MR-0005 decisions and requirements;
2. identify the next available ADR without guessing;
3. author plugin-boundary ADR;
4. author plugin-contract Functional Requirement;
5. author deterministic plugin-validation Governance Requirement;
6. run focused governed-document checks;
7. run full repository gate;
8. governed commit/push.

Exit criteria:

- core/plugin ownership split is canonical;
- unavailable-plugin behavior is fail-safe;
- deterministic derivation conditions are explicit;
- no STRIDE rule exists in the core.

### Milestone B — Implement Common Finding

Status:

```text
requirements exist; implementation not started
```

Expected artifacts after governed planning:

1. canonical Finding model;
2. Finding validator;
3. Finding schema materializer;
4. Finding test suite;
5. Finding negative fixture registry;
6. generated JSON Schema;
7. VS Code YAML association;
8. local gate entries;
9. implementation trace entries.

Exit criterion:

```text
ANALYSIS-0002
→ FINDING-0001 proposed
```

passes in the isolated case-study workspace.

### Milestone C — Implement plugin loader and demo plugin

Status:

```text
not started
```

Expected layers:

```text
common plugin contract
method registry or discovery source
plugin loader
plugin validation adapter
demo-method fixture plugin
positive and negative fixtures
gate integration
```

Exit criteria:

- unknown or incompatible plugin handled deterministically;
- valid demo payload accepted;
- invalid demo payload rejected with stable diagnostics;
- no common-core dependency on plugin internals.

### Milestone D — Implement Security Requirement

Status:

```text
requirements exist; implementation not started
```

Work:

1. add `security-requirement` as fifth canonical governed document model;
2. add controlled `requirement_type: security`;
3. add shared registry-profile variant;
4. add dedicated body profile;
5. update model and cross-model validators;
6. add negative fixtures;
7. update governed authoring and generated schema;
8. update Unified Markdown Assistance for the new governed Markdown body;
9. create one case-study Security Requirement.

Exit criterion:

```text
FINDING-0001 accepted
→ MR-0001ADR-0001REQ-0001SEC-0001
```

passes all gates.

### Milestone E — Complete chain coherence

Validate:

```text
Security Requirement
→ accepted Finding
→ derivable Analysis Record
→ available compatible plugin
→ affected Functional Requirement
→ parent Functional Requirement
→ ADR
→ Macro-requirement
```

Required negative cases:

- unresolved Analysis Record;
- unavailable plugin during accepted derivation;
- invalid method payload;
- accepted Finding without Functional Requirement;
- Finding with prohibited method-specific fields;
- Security Requirement referencing proposed or rejected Finding;
- parent not among affected Functional Requirements;
- MR/ADR ownership mismatch;
- deleted upstream identity;
- duplicate identity.

### Milestone F — Case-study simulation

Simulation A — fail-safe:

```text
future-method unavailable
→ Analysis Record structurally valid
→ derivation not accepted
→ Finding may remain proposed only
→ Security Requirement blocked
```

Simulation B — complete fixture flow:

```text
demo-method available
→ ANALYSIS-0002 accepted
→ FINDING-0001 proposed
→ explicit review
→ FINDING-0001 accepted
→ Security Requirement created
→ implementation trace linked
→ verification evidence linked
→ full gate passes
```

Collect:

- authored inputs;
- positive outputs;
- stable negative diagnostics;
- full gate output;
- commit hashes;
- chain diagram;
- registry-path table;
- limitations;
- reproducible commands.

### Milestone G — Thesis checkpoint

Resume thesis work after:

- Common Finding implementation;
- plugin contract and demo plugin;
- Security Requirement fifth model;
- complete chain coherence;
- positive case-study simulation;
- at least five deterministic negative cases;
- full gate green;
- governed commit/push;
- clean working tree;
- generated handoff archive.

Later sequence:

```text
core demonstration
→ thesis continuation
→ real STRIDE plugin
→ real STRIDE-AI plugin
```

## 8. Initial inspection commands

Run from repository root:

```powershell
git status --short --branch
git log -1 --oneline
node .\tools\repo-check.mjs
```

Focused Analysis Record checks:

```powershell
node .\tools\MR-0005\check-methodology-specific-analysis-records.mjs

node .\tools\MR-0005\lib\materialize-methodology-specific-analysis-record-schema.mjs `
  --check

node --test `
  .\tools\MR-0005\test\methodology-specific-analysis-record.test.mjs

node .\tools\MR-0001\check-implementation-trace-registry.mjs
```

Inspect MR-0005 identifiers before authoring:

```powershell
Get-Content `
  .\docs\reference\project-model\registers\decisions\MR-0005.decisions.registry.yml `
  -Raw

Get-Content `
  .\docs\reference\project-model\registers\requirements\MR-0005.requirements.registry.yml `
  -Raw
```

Do not guess the next ADR or Requirement ID.

## 9. Governed document authoring

Preview:

```powershell
node .\tools\MR-0002\run-governed-document-authoring.mjs `
  --preview `
  --request <request-path>
```

Create after reviewing preview:

```powershell
node .\tools\MR-0002\run-governed-document-authoring.mjs `
  --create `
  --request <request-path>
```

After each creation:

```powershell
node .\tools\repo-check.mjs
git status --short
git diff --check
```

## 10. Governed implementation lifecycle

Plan one artifact:

```powershell
node .\tools\MR-0002\plan-governed-implementation.mjs `
  --requirement <REQ-OR-GOV-ID> `
  --artifact-type <tool|source-module|test|fixture> `
  --title "<artifact title>" `
  --path <repository-relative-path> `
  --dry-run
```

Create one scaffold:

```powershell
node .\tools\MR-0002\create-governed-implementation-scaffold.mjs `
  --requirement <REQ-OR-GOV-ID> `
  --artifact-type <tool|source-module|test|fixture> `
  --title "<artifact title>" `
  --path <repository-relative-path> `
  --confirm create
```

Typical focused verification:

```powershell
node --check <file.mjs>
node --test <test-file.mjs>
node <checker-file.mjs>
```

Promote after focused verification:

```powershell
node .\tools\MR-0002\promote-governed-implementation-scaffold.mjs `
  --artifact-id <IMPLEMENTATION-ARTIFACT-ID> `
  --confirm promote
```

Verify traceability:

```powershell
node .\tools\MR-0001\check-implementation-trace-registry.mjs
```

## 11. Gate and publication

Before publication:

```powershell
node .\tools\repo-check.mjs

git diff --check
git status --short
git diff --stat
```

Governed commit/push only:

```powershell
node .\tools\MR-0002\run-governed-repository-operation.mjs `
  --commit-push `
  "<governed commit message>"
```

After publication:

```powershell
git status --short --branch
git log -1 --oneline
```

## 12. ZIP drop-in protocol

A ZIP drop-in adds a reviewed group of new files while preserving repository-relative paths.

Modified existing files should normally be delivered as complete replacement blocks or explicit reviewed patches. A ZIP that overwrites files must be identified as a replacement drop-in and inspected before extraction.

Correct ZIP root:

```text
tools/
  MR-0005/
    lib/
      example-model.mjs
```

Incorrect ZIP root:

```text
threat-forge/
  tools/
```

Never include:

```text
.git/
node_modules/
artifacts/
old/
absolute paths
parent-directory traversal
temporary editor files
```

### 12.1 Produce a drop-in locally

```powershell
$DropName = "common-finding-implementation"
$StagingRoot = ".\.threat-forge\dropins\$DropName\root"
$ZipPath = ".\.threat-forge\dropins\$DropName.zip"

if (Test-Path $StagingRoot) {
  Remove-Item $StagingRoot -Recurse -Force
}

New-Item `
  -ItemType Directory `
  -Path $StagingRoot `
  -Force |
  Out-Null
```

Copy files into `$StagingRoot` using repository-relative paths, then:

```powershell
if (Test-Path $ZipPath) {
  Remove-Item $ZipPath -Force
}

Compress-Archive `
  -Path (Join-Path $StagingRoot "*") `
  -DestinationPath $ZipPath

tar -tf $ZipPath
```

### 12.2 Inspect a received ZIP

```powershell
$ZipPath = "<downloaded-zip-path>"
$PreviewRoot = ".\.threat-forge\dropin-preview"

if (Test-Path $PreviewRoot) {
  Remove-Item $PreviewRoot -Recurse -Force
}

Expand-Archive `
  -Path $ZipPath `
  -DestinationPath $PreviewRoot

Get-ChildItem `
  $PreviewRoot `
  -Recurse `
  -File |
  ForEach-Object {
    $_.FullName.Substring($PreviewRoot.Length + 1)
  }
```

### 12.3 Detect collisions

```powershell
$Collisions = Get-ChildItem `
  $PreviewRoot `
  -Recurse `
  -File |
  ForEach-Object {
    $Relative = $_.FullName.Substring($PreviewRoot.Length + 1)
    $Destination = Join-Path "." $Relative

    if (Test-Path $Destination) {
      $Relative
    }
  }

if ($Collisions) {
  "Existing destination files:"
  $Collisions
  throw "Drop-in contains existing paths. Review replacements explicitly."
}
```

Apply a reviewed new-files drop-in:

```powershell
Copy-Item `
  (Join-Path $PreviewRoot "*") `
  "." `
  -Recurse

git status --short
git diff --check
```

The next LLM must provide:

- one ZIP for reviewed new files;
- repository-relative paths at archive root;
- manifest of included paths;
- exact extraction command;
- exact focused verification commands;
- no commit or push;
- complete replacement blocks or reviewed patches for modified files;
- no code before requirements;
- no manual legacy graph changes.

## 13. Governed full handoff archive

Dry-run:

```powershell
node .\tools\MR-0001\create-handoff-archive.mjs `
  --dry-run
```

Normal generation after clean publication:

```powershell
node .\tools\MR-0001\create-handoff-archive.mjs
```

Outputs:

```text
artifacts/handoff/threat-forge-handoff-<HEAD>/
artifacts/handoff/threat-forge-handoff-<HEAD>.zip
```

Contents:

```text
README_HANDOFF.md
continuation-prompt.md
command-reference.md
logs/
registries/
project-snapshot/
```

Normal generation refuses a dirty working tree and runs the full repository gate. Use `--allow-dirty` only intentionally, never as the default continuation workflow.

Preferred sequence:

```powershell
node .\tools\repo-check.mjs

node .\tools\MR-0002\run-governed-repository-operation.mjs `
  --commit-push `
  "docs: align temporary analysis core working plan"

node .\tools\MR-0001\create-handoff-archive.mjs `
  --dry-run

node .\tools\MR-0001\create-handoff-archive.mjs
```

This file will be included automatically in `project-snapshot/` after it is tracked in the published commit.

## 14. Progress tracking

Milestone status values:

```text
not started
governance in progress
implementation planned
scaffolded
implementation in progress
focused verification passed
full gate passed
published
```

After each governed commit record:

```text
commit hash
commit title
completed milestone
focused verification result
full gate result
next exact action
```

Quick commands:

```powershell
git status --short --branch
git log -5 --oneline
node .\tools\repo-check.mjs
node .\tools\MR-0001\check-implementation-trace-registry.mjs
```

MR-0005 implementation progress:

```powershell
Select-String `
  -Path .\docs\reference\project-model\registers\implementation\implementation-trace.registry.yml `
  -Pattern "MR-0005" `
  -Context 0,8
```

MR-0005 active gates:

```powershell
Select-String `
  -Path .\docs\reference\project-model\registers\checks\local-governance-checks.registry.yml `
  -Pattern "MR-0005" `
  -Context 0,10
```

## 15. Current checkpoint

Completed:

```text
Analysis Record model
Analysis Record YAML schema
Analysis Record validator
negative fixtures
verification suite
gate integration
positive case-study smoke test
unresolved-reference smoke test
```

Next exact action:

```text
Inspect MR-0005 decisions and requirements.
Author the methodology plugin-boundary ADR before plugin code.
```

Before continuing:

```powershell
git status --short --branch
git log -1 --oneline
node .\tools\repo-check.mjs
```

## 16. Continuation prompt

```text
We are continuing governed development of threat-forge.

Repository:
https://github.com/nballestriero/threat-forge.git

Branch:
master

Expected baseline:
9ae06f8 — analysis: implement canonical methodology-specific analysis records

Language:
Italian.

Working style:
Concise microsteps. Stop after each command and inspect full output.

Governance:
No tool or code before ADR/FR/GOV.
Use governed document authoring.
Use governed implementation planning, scaffolding and promotion.
Use implementation trace.
Use node .\tools\repo-check.mjs as full gate.
Never use direct git add/commit/push.
Use the governed repository operation runner.
Do not modify legacy graphs under old/.

Delivery:
ZIP drop-ins for reviewed new files with repository-relative paths.
Complete replacement blocks or reviewed patches for modified files.
Always provide exact apply and verification commands.

Read first:
brainstorm/NEXT_TOPICS_DRAFT.md

Completed capability:
Canonical methodology-specific Analysis Record model, schema, validator,
negative fixtures, tests and gate integration.

Completed proof:
A real record referring to BAE-0005, BAE-REL-0003 and
MR-0001ADR-0001REQ-0001 passed. BAE-9999 failed with
analysis-record.model.unresolved-subject and exit code 1. Repository stayed clean.

Target:
Build methodologies as plugins, implement Common Finding, implement a fixture
demo-method plugin, implement Security Requirement as fifth governed document
model, validate the complete chain on the documentation-to-base-analysis case
study, collect thesis evidence, then continue the thesis before real STRIDE and
STRIDE-AI plugins.

First commands:
git status --short --branch
git log -1 --oneline
node .\tools\repo-check.mjs

First work item:
Inspect MR-0005 decision and requirement registries, then author the methodology
plugin-boundary ADR. Do not write plugin code yet.
```

## 17. Governance debt

### 17.1 Governed implementation trace reassignment

Status: to do.

Create a governed rollback-capable command that reassigns an existing planned or scaffolded implementation path from one Requirement to another without deleting its historical trace.

The command must:

- deprecate the previous implementation trace record;
- create the successor trace under the new Requirement;
- update source JSDoc traceability atomically;
- preserve the historical Requirement and artifact identity;
- reject duplicate active ownership of one implementation path;
- run focused syntax and implementation-trace validation;
- restore every modified file when validation fails.

Motivating case:

- deprecate `MR-0005ADR-0002REQ-0001GOV-0001IMPL-0004`;
- create its successor under `MR-0005ADR-0002REQ-0001GOV-0002`;
- preserve `tools/MR-0005/lib/materialize-common-analysis-finding-schema.mjs`;
- replace the current exceptional manual transition with the governed command.

# Security Requirement milestone draft

This file is a temporary planning note for the Security Requirement milestone.

It is not a Macro-requirement, not a Decision, not a Requirement, not a registry, not a governed body, not an implementation authorization and not a canonical source.

Canonical Security Requirement decisions and obligations are owned by MR-0001 ADR-0009, MR-0001ADR-0009REQ-0001 and MR-0001ADR-0009REQ-0001GOV-0001. If this draft conflicts with those sources, the canonical sources prevail.

Last updated: 2026-07-30.

## 1. Application order

Apply this planning file only after the governed commit that fixes the Security Requirement model and derivation decisions.

The canonical documentation drop-in must be applied, checked, committed and pushed before this file is added in a separate governed commit.

## 2. Repository baseline

Repository:

```text
https://github.com/nballestriero/threat-forge.git
```

Branch:

```text
master
```

Source checkpoint used to prepare this draft:

```text
21c744c — refactor: align governed document cross-model terminology
```

Required baseline when this plan is applied:

```text
The governed commit containing the completed ADR-0009 Security Requirement decisions
and the aligned REQ-0001 and GOV-0001 bodies.
```

Expected local state before each microstep:

```text
## master...origin/master
```

with no working-tree changes.

The operational project lives at repository root. The old directory contains reference-only legacy material and is not an operational canonical source.

## 3. Working rules

Continue through small verified steps.

Mandatory sequence:

```text
canonical Decision and Requirements
implementation planning
source and consumer inspection
additional Requirement only when a new obligation is discovered
implementation scaffold
focused implementation
focused verification
atomic model activation
full repository gate
governed commit and push
```

Rules:

- Do not create code tools schemas fixtures profiles registries or gates before the governing requirement exists.
- Do not use legacy graph or append-first project mechanisms as current canonical architecture.
- Do not create a central Common Finding registry.
- Repository-contained validated .analysis-finding.yml files remain the canonical Common Finding sources.
- Security Requirement records remain in the shared requirement registry.
- Finding references remain in the Security Requirement Markdown body.
- Method-specific semantics must not leak into the Security Requirement model.
- Security Requirement validation must not execute or reinterpret methodology plugins.
- Downstream Security Requirement creation must not mutate Analysis Records or Common Findings.
- Every implementation artifact must be represented in the implementation trace registry.
- Traceable JavaScript artifacts must declare implemented requirement source decision macro-requirement and implementation status in JSDoc.
- Never use direct git add git commit or git push.
- Use the governed repository operation runner.

## 4. Approved model summary

Functional Requirement:

```text
Defines governed product behavior.
```

Methodology-specific Analysis Record:

```text
Documents one application of one method to governed analytical subjects
and preserves method-specific payload classifications and evidence.
```

Common Finding:

```text
Represents one methodology-neutral reviewed security finding originating
from exactly one Analysis Record.
```

Security Requirement:

```text
Defines one independently testable security obligation that is a child
specialization of exactly one Functional Requirement.
```

Required provenance:

```text
Security Requirement
Common Finding
Analysis Record
method-specific analytical material
```

The Security Requirement directly references accepted Common Findings. It does not directly reference or interpret a methodology plugin.

## 5. Approved Security Requirement representation

Shared requirement registry record:

```yaml
id: MR-0001ADR-0001REQ-0001SEC-0001
title: Protect the demonstration request from unauthorized modification
status: draft
requirement_type: security
macro_requirement_id: MR-0001
decision_id: ADR-0001
parent_requirement_id: MR-0001ADR-0001REQ-0001
body_path: docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001SEC-0001_body.md
```

The registry record does not contain Finding identifiers.

Required Markdown sections:

```text
Intent
Parent Functional Requirement
Finding derivation
Security obligation
Scope
Acceptance
```

The Parent Functional Requirement section contains one governed reference that mirrors parent_requirement_id.

The Finding derivation section contains one or more unique governed references to accepted Common Findings selected by the author. Every referenced Finding identifies the parent Functional Requirement among its affected governed Functional Requirements.

## 6. Thesis scope

Included:

- Security Requirement as the fifth governed document model
- Security Requirement child identity and Functional Requirement parentage
- shared requirement registry variant with requirement_type security
- dedicated Markdown body profile
- governed parent and Common Finding reference positions
- current accepted-state eligibility
- parent-to-Finding affected-subject coherence
- navigable provenance to the originating Analysis Record
- deterministic validation and stable diagnostics
- coordinated consumer activation
- one manually authored case-study Security Requirement
- derived consultable Finding-to-Security-Requirement traceability

Excluded:

- real STRIDE or STRIDE-AI plugin implementation as a prerequisite
- automatic Finding discovery for requirement authors
- automatic consolidation or generation of Security Requirements
- central Common Finding registry
- complete Common Finding review workflow transition authorization and remediation lifecycle
- Security Requirements justified only by policy standards compliance baselines or contracts
- Common Finding generalization to performance reliability privacy or other domains
- risk scoring and security control catalogues
- automatic rewriting of downstream documents
- Governance Requirement children of Security Requirements unless governed by a later Requirement

## 7. Canonical sources governing the milestone

Primary sources:

```text
docs/reference/project-model/body/decisions/MR-0001/ADR-0009_body.md
docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0009REQ-0001_body.md
docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0009REQ-0001GOV-0001_body.md
```

Related sources to inspect but not redefine:

```text
docs/reference/project-model/body/decisions/MR-0001/ADR-0008_body.md
docs/reference/project-model/body/decisions/MR-0001/ADR-0010_body.md
docs/reference/project-model/body/decisions/MR-0003/ADR-0001_body.md
docs/reference/project-model/body/decisions/MR-0005/ADR-0002_body.md
docs/reference/project-model/body/decisions/MR-0005/ADR-0003_body.md
docs/reference/project-model/body/decisions/MR-0005/ADR-0004_body.md
```

## 8. Inspection inventory

Inspect these canonical sources and consumers before editing implementation files:

- document model index and Security Requirement model descriptor target
- shared requirement registry representation profile
- existing Functional Requirement and Governance Requirement registry variants
- controlled requirement_type value set
- Functional Requirement and Governance Requirement body profiles
- governed reference position registry and resolver catalog
- Common Finding source projection and accepted-state eligibility provider
- governed document model source validation
- requirement model and cross-model coherence validation
- authoring catalog and document creation assistance
- Markdown completion hover diagnostic and quick-fix providers
- Project Model Explorer and Target Project consumers
- implementation trace registry
- local check registry and governed repository runner
- current focused and full test suites

The inspection microstep must produce an exact file list and identify whether the existing canonical Requirements fully govern every required change.

## 9. Planned implementation microsteps

### Microstep A: source and consumer inspection

Produce an implementation inventory only.

Do not modify code or canonical registries.

Exit condition:

```text
Every source consumer validator fixture and verification artifact affected by
fifth-model activation is identified with its governing Requirement.
```

### Microstep B: missing-obligation decision

Create or refine a canonical Requirement only when inspection reveals a required obligation not already owned by REQ-0001 or GOV-0001.

Do not use this draft as authority to fill a canonical gap.

### Microstep C: isolated Security Requirement model scaffold

Prepare the model descriptor registry-variant candidate body-profile candidate and focused validation scaffold using synthetic source sets.

Do not activate security-requirement in the canonical document model index yet.

### Microstep D: focused positive and negative verification

Positive coverage:

- valid SEC child identifier
- canonical registry field set without Finding identifiers
- one valid Functional Requirement parent
- same Macro-requirement and Decision ownership
- body parent reference matching parent_requirement_id
- one accepted Common Finding reference
- multiple unique accepted Common Finding references
- every Finding affecting the parent Functional Requirement
- navigable Analysis Record origin
- no method-specific Security Requirement content

Negative coverage:

- malformed SEC identifier
- wrong requirement_type
- missing or unknown registry field
- Finding-reference field in the registry record
- missing unresolved or non-functional parent
- Macro-requirement mismatch
- Decision mismatch
- missing duplicated or mismatched body parent reference
- empty Finding derivation
- duplicate Finding reference
- unresolved Finding
- proposed Finding
- rejected Finding
- Finding that does not affect the parent Functional Requirement
- Finding reference outside the governed Finding derivation position
- method-specific field or payload in Security Requirement source
- validation dependency on plugin execution or availability
- authored central Finding inventory presented as canonical
- missing consumer provider during activation

### Microstep E: coordinated consumer support

Extend every registry-derived consumer identified during inspection.

No consumer may maintain an independent fixed list of four document models.

### Microstep F: atomic fifth-model activation

Activate security-requirement in one coherent change set only after model profile validator provider and consumer coverage are complete.

Exit condition:

```text
The canonical index exposes five models and every registered consumer provides
exactly one compatible Security Requirement implementation.
```

### Microstep G: case study

Extend the existing documentation-to-base-analysis case study with one manually authored Security Requirement.

The case study must demonstrate:

- an Analysis Record containing method-specific evidence
- an accepted methodology-neutral Common Finding
- a Security Requirement under the affected Functional Requirement
- governed Finding derivation references
- no plugin classification copied into the Security Requirement
- no automatic requirement generation
- no upstream source mutation

### Microstep H: derived Finding traceability projection

Provide a read-only derived projection containing:

- Finding identifier
- canonical title
- current review state
- originating Analysis Record
- affected governed subjects
- repository-relative Finding source path
- Security Requirements that refer to the Finding

The projection must be rebuilt from validated canonical sources and must not be authored as a second inventory.

### Microstep I: milestone closure

Run focused checks and the full governed repository check.

Update implementation trace and planning notes only where required by governed sources.

Commit and push through the governed repository operation runner.

Create a milestone tag only through the separately authorized tagging procedure.

## 10. Verification gates

Before each governed commit:

```powershell
node .\tools\MR-0002\run-governed-repository-operation.mjs --check
```

Governed commit and push pattern:

```powershell
node .\tools\MR-0002\run-governed-repository-operation.mjs --commit-push "<message>"
```

Suggested commit for this non-canonical planning file:

```text
docs: plan Security Requirement milestone
```

## 11. Milestone exit criteria

The milestone is complete when:

- security-requirement is the fifth active governed document model
- the registry variant is aligned with existing requirement variants
- Finding identifiers are absent from the registry record
- the Markdown body contains the canonical parent and Finding derivation positions
- every referenced Finding is accepted and affects the Functional Requirement parent
- the complete Security Requirement to Finding to Analysis Record provenance is navigable
- methodology-specific semantics remain outside the Security Requirement
- validation does not depend on plugin execution or availability
- reverse Finding traceability is derived without a central registry
- every registered consumer supports the fifth model
- the manually authored case study passes
- focused verification passes
- the full governed repository check passes
- the repository is clean and synchronized

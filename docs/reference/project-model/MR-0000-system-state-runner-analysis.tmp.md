# MR-0000 system-state runner analysis

Temporary analysis file.

This file records the current design direction before implementing it. It is intentionally temporary and must be deleted after the governed refactor is completed.

## Repository context

Project: `threat-forge`.

Current branch expected when this note is applied: `master` tracking `origin/master`.

Recent relevant state at the time of this analysis:

```text
080ac36 docs: define MR-0000 system state controls
df892cc docs: introduce MR-0000 governance graph and requirement
326bdd0 docs: bootstrap MR-0000 common governance
```

The graph-format control was then moved under `MR-0000` through the follow-up workstream:

```text
backend/tools/MR-0000/check-graph-format.mjs
backend/tools/MR-0000/contracts/graph-format.contract.json
backend/tools/MR-0000/registries/graph-node-types.registry.yml
backend/tools/MR-0000/registries/spo-predicates.registry.yml
```

This file is a temporary design checkpoint and is not itself a governed ADR, requirement, graph contract or tool implementation.

## Current conceptual direction

`MR-0000` is evolving into the common system-state and consistency-control area.

It must not become a generic bucket for all documentation governance. Its purpose is narrower and stronger: it must guarantee that the system state remains coherent across documentation, registries, graphs, requirements, ADR, tools, source code and verification evidence.

A concise interpretation is:

```text
MR-0000 = system-state / consistency-control layer
```

`MR-0001` can still define the canonical documentation organization and the governed project-model structure, including Diátaxis-style organization, registries, separated bodies, ADR format and requirement format.

`MR-0000` should verify that those structures remain coherent and that the implementation, tools and documentation do not drift.

## Tool location rule

The preferred physical organization for project-model governance tools is:

```text
backend/tools/<macro_requirement_id>/
```

For common cross-cutting controls:

```text
backend/tools/MR-0000/
```

The current graph-format control has already been moved toward this shape:

```text
backend/tools/MR-0000/check-graph-format.mjs
backend/tools/MR-0000/contracts/graph-format.contract.json
backend/tools/MR-0000/registries/graph-node-types.registry.yml
backend/tools/MR-0000/registries/spo-predicates.registry.yml
```

This is intentional: stable executable contracts and technical registries used by a validator are closer to the tool than to narrative documentation.

Documentation should explain and reference these contracts. The executable contract should live near the validator that applies it.

## Current graph-format responsibility

`check-graph-format.mjs` controls the format of project-model graph files.

It checks files such as:

```text
docs/reference/project-model/registers/graph/*.graph.yml
```

It applies technical contracts and registries such as:

```text
backend/tools/MR-0000/contracts/graph-format.contract.json
backend/tools/MR-0000/registries/graph-node-types.registry.yml
backend/tools/MR-0000/registries/spo-predicates.registry.yml
```

The current conceptual split is:

```text
MR-0001 defines that project-model graphs have controlled formats, node types and predicates.
MR-0000 governs the execution of system-state checks that keep those formats coherent.
```

## Need for a single MR-0000 runner

As more validators are introduced, there should be one top-level MR-0000 runner that calls all system-state gates.

The runner should not become a monolithic validator. It should orchestrate specialized validators.

Possible runner path:

```text
backend/tools/MR-0000/check-system-state.mjs
```

Possible command:

```text
npm run system:check
```

Alternative command, if the project wants to keep the current namespace:

```text
npm run docs:check
```

The runner should call specialized tools such as:

```text
backend/tools/MR-0000/check-graph-format.mjs
backend/tools/MR-0000/check-adr-registry-fields.mjs
backend/tools/MR-0000/check-macro-requirement-format.mjs
backend/tools/MR-0000/check-requirement-format.mjs
backend/tools/MR-0000/check-code-traceability.mjs
```

The runner should aggregate their results and fail the command if any specialized gate fails.

## Canonical traversal direction

The project-model graph should support deterministic top-down traversal.

Desired logical direction:

```text
MR -> ADR -> REQ -> TOOL -> verification
```

Current relation style includes:

```text
ADR -> belongs_to -> MR
```

This makes the macro-requirement a passive target. For traversal and visualization, it is better for the macro-requirement to be the root.

Desired canonical relation from macro-requirement to decisions:

```text
MR -> has_decision -> ADR
```

Then:

```text
ADR -> justifies -> REQ
REQ -> implemented_by -> TOOL
TOOL -> verifies -> REQ
```

This allows the runner, visualization and future analysis tools to start from a macro-requirement and walk the governed structure downward.

The relation name `has_decision` is a candidate and must be introduced through the controlled SPO predicate registry before it is used.

## Avoid repetitive physical-file graph edges

The graph must not contain one edge for every physical file checked by a tool.

Avoid noisy patterns such as:

```text
TOOL -> controls -> ADR body file
TOOL -> controls -> requirement body file
TOOL -> controls -> graph file
TOOL -> controls -> every individual MR/ADR/REQ file
```

The graph should model logical traceability, not every file access.

Physical files should be discovered through canonical registries and declared paths, such as:

```text
macro-requirements registry
decisions registries
requirements registries
graph index
graph files
body_path fields
tool paths
contract paths
```

A validator should read the appropriate registry, discover the files that the registry declares, and apply the relevant contract or rule.

## Canonical formats to validate

MR-0000 should eventually validate standard formats for all governed project-model records and bodies.

Candidate validation areas:

```text
MR registry records
MR bodies
ADR registry records
ADR bodies
REQ registry records
REQ bodies
graph files
tool metadata / JSDoc headers
contract and technical registry locations
code-documentation traceability
```

These checks can be implemented by multiple specialized validators, but they should be callable through one MR-0000 runner.

## Desired future backend structure

Possible target structure:

```text
backend/tools/MR-0000/
  check-system-state.mjs
  check-graph-format.mjs
  check-adr-registry-fields.mjs
  check-macro-requirement-format.mjs
  check-requirement-format.mjs
  check-code-traceability.mjs

  contracts/
    graph-format.contract.json
    macro-requirement-format.contract.json
    adr-format.contract.json
    requirement-format.contract.json

  registries/
    graph-node-types.registry.yml
    spo-predicates.registry.yml
```

The runner owns orchestration. The specialized tools own their specific validations.

## JSDoc and implementation traceability rule

Every MR-0000 tool should include JSDoc or equivalent source metadata that declares at least:

```text
Macro requirement: MR-0000
Origin ADR: MR-0000/ADR-xxxx
Implemented requirement: MR-0000REQ-xxxx
Purpose
Inputs
Outputs
Failure behavior
```

When a tool implements or verifies a requirement, the graph must link that logical relationship.

## Expected governed implementation sequence

The implementation should proceed in micropassi. Do not jump directly to tool implementation without the governing ADR and requirements.

### Step 1 — Govern the runner decision

Add an MR-0000 ADR deciding the system-state runner and top-down graph traversal.

Candidate ADR:

```text
MR-0000/ADR-0003 — System-state runner and top-down project-model traversal
```

The ADR should decide:

```text
MR-0000 owns the system-state runner.
The runner orchestrates specialized validators.
The canonical traversal should be MR -> ADR -> REQ -> TOOL/verifica.
The relation from MR to ADR should become top-down, for example has_decision.
Physical files are discovered through registries and paths, not repetitive graph edges.
```

### Step 2 — Add requirements derived from the ADR

Candidate requirements:

```text
MR-0000REQ-0007
The system must expose one MR-0000 runner that executes project-model system-state gates.

MR-0000REQ-0008
The project-model graph must support deterministic top-down traversal from MR to ADR to REQ.

MR-0000REQ-0009
The system must validate canonical MR, ADR and REQ formats through MR-0000 validators orchestrated by the runner.
```

### Step 3 — Update GRAPH-0000

Add the ADR and requirements to `GRAPH-0000.graph.yml`.

Keep the change logical. Do not implement the runner yet.

### Step 4 — Introduce the new SPO predicate

Add a controlled predicate such as:

```text
has_decision
```

This must be added to the controlled SPO predicate registry before use.

Then update graph validation if needed so the predicate is accepted.

### Step 5 — Migrate graph direction

Migrate relations from:

```text
ADR -> belongs_to -> MR
```

to:

```text
MR -> has_decision -> ADR
```

Do this for `GRAPH-0000` and `GRAPH-0001` once the predicate is governed.

Avoid keeping both directions long-term unless a deliberate bidirectional relation policy is introduced.

### Step 6 — Implement the runner

Create:

```text
backend/tools/MR-0000/check-system-state.mjs
```

The runner should call existing gates first, such as:

```text
npm run docs:graph-format
npm run docs:pages
node tools/docs/check-docs-structure.mjs
npm run docs:adr-registry-fields
```

or call the underlying scripts directly if that becomes the governed policy.

### Step 7 — Add package command

Add a single command, for example:

```text
npm run system:check
```

or update the existing docs check command if the project chooses that name.

### Step 8 — Link implementation and verification in GRAPH-0000

Add the runner as a Tool node.

Link it to its requirement:

```text
MR-0000REQ-0007 -> implemented_by -> TOOL-check-system-state
TOOL-check-system-state -> verifies -> MR-0000REQ-0007
```

Add any additional links for format-validation requirements as needed.

### Step 9 — Add MR / ADR / REQ format validators

After the runner exists, add specialized validators for standard formats:

```text
check-macro-requirement-format.mjs
check-adr-format.mjs
check-requirement-format.mjs
```

Each one should be separately required, implemented, linked and verified.

### Step 10 — Delete this temporary analysis file

Once the governed ADR, requirements, graph updates and implementation are complete, delete:

```text
docs/reference/project-model/MR-0000-system-state-runner-analysis.tmp.md
```

The deletion should be committed as part of the cleanup after the refactor is captured in governed artifacts.

## Temporary status

This is only an analysis checkpoint.

It is not a governed decision, requirement, contract, validator, registry or product artifact.

It exists only to preserve the design history before the governed micropassi are implemented.

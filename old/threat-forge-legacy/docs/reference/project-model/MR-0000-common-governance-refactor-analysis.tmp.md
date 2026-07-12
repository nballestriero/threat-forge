# Temporary analysis — MR-0000 common governance refactor

Temporary file. This document is intentionally committed as a short-lived backup and planning artifact before the MR-0000 refactor. It must be removed once the refactor is completed and replaced by governed ADR, requirement, registry, graph, and tool artifacts.

## Current repository state observed from handoff

Branch expected: `master`.

Latest committed state observed in the handoff:

- `732db17 tooling: validate ADR registry fields`
- `9bb82f4 docs: consolidate project model graph and ADR governance`
- `2cc1a6a docs: define repository tool governance decision`

The working tree in the handoff also contained uncommitted local changes in:

- `.gitignore`
- `docs/reference/project-model/body/decisions/MR-0001/ADR-0003_body.md`
- `docs/reference/project-model/body/requirements/MR-0001/MR-0001REQ-0002_body.md`
- `docs/reference/project-model/registers/graph/GRAPH-0001.graph.yml`
- `docs/reference/project-model/registers/graph/graph-node-types.registry.yml`
- `docs/reference/project-model/registers/graph/spo-predicates.registry.yml`

The graph-related uncommitted changes include the preliminary `Registry` node type, `reads_from` / `governed_by` predicates, an `ADR-GOVERNANCE-REGISTRY` node, and a `TOOL-check-adr-registry-fields reads_from ADR-GOVERNANCE-REGISTRY` relation. The instance-per-ADR `governed_by` approach is rejected by this analysis because it would require a new graph relation every time a new ADR is created.

## Problem

Some governance controls are transversal to the whole project/application, not owned by a single functional macro-requirement.

Examples:

- ADR record field validation.
- ADR body format validation.
- Repository tool governance.
- Future validation commands and governance reports.

If these controls stay under `MR-0001`, the model incorrectly suggests that the tools and requirements belong only to the project model governance area. If the same tool is linked to every macro-requirement, the graph becomes repetitive and fragile.

The graph must avoid these anti-patterns:

```text
TOOL-check-adr-registry-fields belongs_to MR-0001
TOOL-check-adr-registry-fields belongs_to MR-0002
TOOL-check-adr-registry-fields belongs_to MR-0003
```

```text
ADR-0001 governed_by ADR-GOVERNANCE-REGISTRY
ADR-0002 governed_by ADR-GOVERNANCE-REGISTRY
ADR-0003 governed_by ADR-GOVERNANCE-REGISTRY
...
```

The first duplicates tool ownership across macro-requirements. The second duplicates policy applicability across every ADR instance.

## Target model

Introduce a common macro-requirement area:

```text
MR-0000 — Common governance controls
```

`MR-0000` owns transversal governance policies, requirements, tools, validators, and future validation commands.

Functional macro-requirements such as `MR-0001` remain focused on their specific domain. They are subject to common controls through registries/policies, not by duplicating graph arcs to every controlled file or every macro-requirement.

## Registry/policy model

A common registry such as:

```text
docs/reference/project-model/registers/decisions/adr-governance.registry.yml
```

should declare its dynamic applicability directly, for example:

```yaml
applies_to:
  record_kind: ADR
  registry_glob: docs/reference/project-model/registers/decisions/*.decisions.registry.yml
  body_glob: docs/reference/project-model/body/decisions/**/*.md
```

The graph should contain one relation from the tool to the registry/policy it reads:

```text
TOOL-check-adr-registry-fields reads_from ADR-GOVERNANCE-REGISTRY
```

It should not contain one relation from the tool or registry to every ADR file discovered by those globs.

## Tool ownership model

A tool should be owned by the requirement that introduces it, not by every macro-requirement it affects operationally.

For common controls:

```text
MR-0000REQ-0001 implemented_by TOOL-check-adr-registry-fields
TOOL-check-adr-registry-fields reads_from ADR-GOVERNANCE-REGISTRY
```

The scope of files checked by the tool is defined by the registry/policy, not by graph arcs to each file.

## Candidate migration

### Move to MR-0000

These artifacts appear to be common/transversal and should be moved or recreated under `MR-0000`:

- `ADR-0003` — repository script and tool governance.
- `ADR-0004` — ADR records and body format governance.
- `MR-0001REQ-0004` — ADR registry field validation.
- `MR-0001REQ-0005` — ADR body format validation.
- `tools/docs/check-adr-registry-fields.mjs`.
- Future `tools/docs/check-adr-body-format.mjs`.
- `docs/reference/project-model/registers/decisions/adr-governance.registry.yml`.

The target requirement IDs should likely become:

```text
MR-0000REQ-0001 — Validazione dei campi controllati dei registri ADR
MR-0000REQ-0002 — Validazione del formato body delle ADR funzionali
```

The ADR IDs can remain global (`ADR-0003`, `ADR-0004`), but their `macro_requirement_id`, registry location, body path, and graph containment should move to `MR-0000`.

### Keep in MR-0001 for now

These artifacts can remain in `MR-0001` until a later decision says otherwise:

- `ADR-0001` — canonical Diátaxis documentation structure.
- `ADR-0002` — project model registry/body/graph organization.
- `MR-0001REQ-0001` — canonical documentation structure validation.
- `MR-0001REQ-0002` — controlled graph node type registry.
- `MR-0001REQ-0003` — controlled SPO predicate registry.
- `TOOL-check-MR-0001REQ-0001` / future rename candidate `TOOL-check-docs-structure`.
- `TOOL-check-graph-format`.

However, tool node names that embed a requirement ID should be reviewed. Stable tool IDs based on the script purpose are preferable when a tool implements or verifies more than one requirement.

## Required refactor sequence

The refactor should be done with small governed steps.

### Step 1 — Create MR-0000 area

Create:

- macro requirement record for `MR-0000` in `macro-requirements.registry.yml`.
- `docs/reference/project-model/body/macro-requirements/MR-0000_body.md`.
- `docs/reference/project-model/registers/decisions/MR-0000.decisions.registry.yml`.
- `docs/reference/project-model/registers/requirements/MR-0000.requirements.registry.yml`.

Update the graph with an `MR-0000` node and only its minimal containment relations.

### Step 2 — Move common ADRs

Move `ADR-0003` and `ADR-0004` from the MR-0001 decision registry/body path to MR-0000 ownership.

Update:

- decision registry files;
- ADR body paths if physically moved;
- graph `belongs_to` relations.

### Step 3 — Move common requirements

Move `MR-0001REQ-0004` and `MR-0001REQ-0005` to MR-0000-local IDs.

Update:

- requirement registry files;
- requirement body paths;
- JSDoc references in related tools;
- package/tool output messages if they mention the old requirement ID;
- graph requirement nodes and relations.

### Step 4 — Model registry/policy dependency without per-instance arcs

Add or keep:

- node type `Registry`;
- predicate `reads_from`;
- node `ADR-GOVERNANCE-REGISTRY`;
- relation `TOOL-check-adr-registry-fields reads_from ADR-GOVERNANCE-REGISTRY`.

Do not add `governed_by` arcs from every ADR instance to the registry.

The registry itself must define `applies_to` globs for dynamic applicability.

### Step 5 — Decide command/verifier model later

Do not overload `Tool` forever as both implementation and execution evidence.

Future model:

```text
Requirement implemented_by Tool
ValidationCommand runs_tool Tool
ValidationCommand verifies Requirement
Tool reads_from Registry
```

This should be introduced by a later ADR/requisition step before replacing existing `Tool verifies Requirement` relations.

## Immediate next action after temporary backup

Commit this temporary analysis file alone as a backup.

Then proceed with a governed MR-0000 refactor starting from Step 1.

This temporary file must be deleted after the governed artifacts replace it.

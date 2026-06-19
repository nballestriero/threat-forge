# ADR-0002 — Project model registry and body organization

## Status

Accepted.

## Context

The project model must grow slowly and deterministically.

At this stage the project model contains a small baseline:

* a root macro-requirements registry;
* a derived ADR registry for `MR-0001`;
* a derived requirements registry for `MR-0001`;
* Markdown body files for long-form content;
* a graph register that is currently empty or minimal;
* an HTML renderer that reads the model and generates project model pages.

The model must avoid uncontrolled file naming, mixed registry responsibilities, and long-form content inside registry records.

A registry must act as a compact index of governed records.

A body file must contain the long-form explanation, rationale, acceptance details, notes, and other readable content.

## Decision

The project model organization is based on the following separation:

1. **Root registries define top-level governed collections.**
2. **Derived registries are created under a specific macro-requirement.**
3. **Registry records stay compact and stable.**
4. **Markdown body files contain long-form content.**
5. **File names are derived deterministically from stable IDs.**
6. **Graph files are separate model files and must not replace registries or bodies.**

The canonical top-level unit is the **macro-requirement**.

The canonical macro-requirement ID format is:

```text
MR-0001
```

The term `area` must not be used in canonical file names, IDs, registry names, or model fields.

### Registry responsibilities

A registry is a governed list of compact headers.

A registry may contain:

* stable ID;
* title;
* status;
* parent or owning ID;
* body path;
* compact classification fields when needed;
* compact linkage fields when needed.

A registry must not contain long prose, full rationale, detailed acceptance criteria, diagrams, or implementation notes.

Those contents belong in body files.

### Body responsibilities

A body file is the long-form document associated with a registry record.

A body file may contain:

* description;
* rationale;
* decision details;
* consequences;
* examples;
* acceptance criteria;
* notes;
* diagrams;
* references to related governed records.

A body file is not a registry.

A body file must not create new governed identities that are absent from the corresponding registry.

### Root macro-requirements registry

The root macro-requirements registry is:

```text
docs/reference/project-model/registers/macro-requirements.registry.yml
```

It lists macro-requirement headers.

Each macro-requirement record owns or points to its long-form body.

For macro-requirement `MR-0001`, the body path is derived as:

```text
docs/reference/project-model/body/macro-requirements/MR-0001_body.md
```

### Derived ADR registry naming

Each macro-requirement may have its own ADR registry.

For macro-requirement `MR-0001`, the derived ADR registry path is:

```text
docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml
```

The file name is derived from:

```text
<macro_requirement_id>.decisions.registry.yml
```

An ADR ID is local to the decision sequence of the macro-requirement unless a future model decision changes this rule.

The ADR ID format is:

```text
ADR-0001
ADR-0002
ADR-0003
```

Each ADR record must include at least:

* `id`;
* `title`;
* `status`;
* `macro_requirement_id`;
* `body_path`.

For ADR `ADR-0002` under macro-requirement `MR-0001`, the body path is derived as:

```text
docs/reference/project-model/body/decisions/MR-0001/ADR-0002_body.md
```

The ADR body file name is derived from:

```text
<adr_id>_body.md
```

The ADR body directory is derived from:

```text
docs/reference/project-model/body/decisions/<macro_requirement_id>/
```

### Derived requirements registry naming

Each macro-requirement may have its own requirements registry.

For macro-requirement `MR-0001`, the derived requirements registry path is:

```text
docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml
```

The file name is derived from:

```text
<macro_requirement_id>.requirements.registry.yml
```

A requirement ID under a macro-requirement is derived from the macro-requirement ID and a local requirement sequence.

For the first requirement under `MR-0001`, the ID is:

```text
MR-0001REQ-0001
```

The requirement ID format is:

```text
<macro_requirement_id>REQ-<requirement_sequence>
```

Where:

```text
<macro_requirement_id> = MR-0001
<requirement_sequence> = 0001
```

Each requirement record must include at least:

* `id`;
* `title`;
* `status`;
* `macro_requirement_id`;
* `body_path`.

When a requirement is derived from an ADR, the requirement header may include:

```text
derived_from_decision_id
```

For requirement `MR-0001REQ-0001`, the body path is derived as:

```text
docs/reference/project-model/body/requirements/MR-0001/MR-0001REQ-0001_body.md
```

The requirement body file name is derived from:

```text
<requirement_id>_body.md
```

The requirement body directory is derived from:

```text
docs/reference/project-model/body/requirements/<macro_requirement_id>/
```

### Graph file organization

Graph files are separate governed model files.

The initial graph registry location is:

```text
docs/reference/project-model/registers/graph/GRAPH-0001.graph.yml
```

A graph file may contain semantic nodes and semantic relations between governed project model entities.

Graph files must not be used as registries.

Graph files must not replace macro-requirement, ADR, or requirement registries.

Graph files must not be used to store long-form body content.

The graph may later connect entities such as:

```text
MR-0001
ADR-0001
MR-0001REQ-0001
```

Only semantic project model entities should appear as graph nodes.

Registry files and body files are sources read by tooling, but they are not themselves semantic graph nodes unless a later ADR explicitly changes that rule.

### Requirement header and body constraints

Requirement headers must remain compact.

Requirement bodies must contain long-form requirement content.

SPO-style relations must not be embedded inside requirement headers or requirement bodies.

Semantic relations belong in graph files when the graph model is intentionally introduced or extended.

### Tooling consequence

The project model renderer may read registries and body files to generate HTML pages.

The graph format checker may validate graph file structure.

The graph format checker must not infer new registry records.

The graph format checker must not create semantic meaning that is absent from the governed model files.

The graph format checker only validates graph file shape and basic consistency according to its current contract.

## Scope

In scope:

- root and derived registry organization;
- registry/body separation;
- deterministic file naming for macro-requirements, ADRs, requirements, and graph files;
- keeping graph files separate from registries and long-form body content.

Out of scope:

- implementing every future project-model validator in this decision;
- introducing detailed graph traversal semantics beyond the initial organization rules;
- changing existing project source-code architecture.

## Consequences

This organization keeps the project model small, readable, and deterministic.

Adding a new macro-requirement requires:

1. a new macro-requirement record in the root macro-requirements registry;
2. a macro-requirement body file;
3. derived registries only when needed.

Adding a new ADR under a macro-requirement requires:

1. an ADR record in the corresponding derived ADR registry;
2. an ADR body file under the corresponding macro-requirement decision body directory.

Adding a new requirement under a macro-requirement requires:

1. a requirement record in the corresponding derived requirements registry;
2. a requirement body file under the corresponding macro-requirement requirement body directory;
3. a compact derivation field when the requirement is derived from an ADR.

This avoids mixed registries, uncontrolled naming, and hidden long-form content inside compact model headers.

## Follow-up

1. Keep future project-model records aligned with registry/body separation.
2. Add deterministic validators only after corresponding ADRs, requirements, and graph relations exist.
3. Preserve graph files as semantic relationship files, not as replacement registries.

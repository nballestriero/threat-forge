# ADR-0007 — Parent-Child Ownership and Governed Taxonomy Responsibility Boundary

## Status

Accepted.

## Context

Threat-forge can now register a demo child project, reset it from a versioned seed, persist operational state in SQLite, serve child-project management read-only APIs and guide a local operator to open the demo Project Model in the Project Documentation Explorer.

This creates an important architectural boundary: the platform can manage and analyze child projects, but it must not become the canonical owner of each child project's design content, code, domain-specific taxonomy values or approved analysis artifacts.

At the same time, the platform must provide shared governance language. Platform taxonomies define common values used by validators, filters, reports, menus, Project Model records, Base Analysis, STRIDE and STRIDE-AI overlays. Child projects may need domain-specific taxonomy extensions, but those extensions must be explicit, namespaced, described and mappable to the platform language when cross-project analysis or UI aggregation depends on them.

The current UI can list and count taxonomy records, but taxonomy values are not yet exposed as full user-facing contracts showing accepted values, deprecated values, descriptions, intended use, allowed fields, validation impact or UI surfaces. This decision defines that responsibility before changing taxonomy schemas, validators, APIs or frontend rendering.

This decision is document-only. It does not implement taxonomy validators, child-project gate orchestration, UI taxonomy detail pages, automatic process orchestration, write-back of approved artifacts, remote branch protection or governed child-project commit/push.

## Decision

Threat-forge must distinguish canonical child-project content from platform operational management state.

A child project is the canonical owner of its own project and technical content, including:

1. its Project Model;
2. its Macro Requirements, ADR, Requirements and governed Markdown bodies;
3. its knowledge graph and traceability graph records;
4. its authorized domain-specific taxonomy extensions;
5. its application code and implementation artifacts;
6. its local verification evidence when that evidence is part of the governed project;
7. its approved analysis artifacts that describe the system, such as approved Base Analysis, STRIDE, STRIDE-AI, finding or mitigation records;
8. its domain examples, terminology and project-specific documentation.

Threat-forge is the owner of platform management state and cross-project governance capabilities, including:

1. child-project registration records;
2. repository/path/location metadata and current lifecycle state;
3. latest check runs, gate results and violations;
4. gate execution and aggregation orchestration;
5. Governance Console UI, policy, capability and future RBAC boundaries;
6. demo/reset/check orchestration and generated runtime workspaces;
7. aggregated reports and cross-project dashboards;
8. cross-project analysis state, draft/candidate review state and operational queues;
9. platform persistence such as SQLite or a future database adapter.

Platform operational state must not replace the child project's canonical Project Model. SQLite must not become the source of truth for child-project ADR, requirements, governed Markdown bodies, graph records, taxonomy extensions or approved analysis artifacts. SQLite may cache, index, summarize, queue or store runtime state that helps the platform manage projects.

Threat-forge must treat taxonomies as governed contracts. Platform taxonomies define shared language for governance, UI filters, reporting, Base Analysis and methodology overlays. Child projects may reuse platform taxonomy values and may declare domain-specific extensions only through a governed namespace, explicit descriptions, usage metadata and optional mapping to a platform base taxonomy when aggregation or analysis requires it.

A taxonomy value intended for user selection, validation, filtering or reporting must eventually expose enough metadata for users and tools to understand:

- what the value means;
- where the value is accepted;
- whether it is accepted for new records, deprecated, superseded or read-only legacy data;
- which fields, records or analysis surfaces may use it;
- what validation, reporting or UI behavior depends on it;
- what examples demonstrate correct usage;
- which platform/base taxonomy value it maps to when it is a child-project extension.

The Project Documentation Explorer and future analysis UI must not hardcode domain taxonomy values. They must consume taxonomy value view-models derived from governed registries and platform/child-project taxonomy merge rules.

Draft, candidate and review-state analysis artifacts may live in platform operational storage while they are being generated, reviewed, compared, scored or rejected. Approved analysis artifacts that become part of the child project's canonical documentation must be written back as governed Project Model content in the child project, with traceability to the decision, requirement, graph, taxonomy and evidence records they depend on.

A future managed child-project governance profile must state which platform gates apply to each child project type, which gates are mandatory, which gates are optional, which gates are warnings, and which gates are not applicable.

## Scope

In scope:

- defining child-project canonical ownership;
- defining threat-forge platform operational ownership;
- defining taxonomy reuse and extension responsibility between parent and child projects;
- defining taxonomy visibility expectations for UI and validation surfaces;
- defining the draft/candidate versus approved artifact ownership boundary;
- defining the need for explicit managed child-project governance profiles.

Out of scope:

- changing the taxonomy registry schema;
- adding a taxonomy metadata validator;
- rendering taxonomy value tables in the frontend;
- merging platform and child-project taxonomies at runtime;
- implementing child-project gate orchestration profiles;
- writing approved analysis artifacts back to child repositories;
- implementing remote repository branch protection checks;
- implementing governed child-project commit/push;
- implementing Base Analysis, STRIDE or STRIDE-AI workflows.

## Consequences

### Positive consequences

- Child projects remain true Doc-as-Code projects instead of becoming opaque platform database records.
- Threat-forge can still aggregate operational state and report across projects without owning each project's canonical documentation.
- Platform taxonomies can support shared UI, reporting and analysis while child projects retain domain vocabulary through governed extensions.
- Future UI work has a clear requirement to show accepted values, descriptions and usage instead of exposing taxonomy identifiers without context.
- Draft analysis state can stay operational until a user approves it for canonical write-back.

### Negative consequences

- The platform must distinguish canonical content, operational state, cached/indexed state and generated demo state in every child-project workflow.
- Taxonomy merge and extension rules will require validators and UI support before domain-specific child-project analysis can be fully trusted.
- Approved analysis write-back will need safe repository mutation, traceability and governed commit/push rules.
- Child-project governance profiles must be explicit because not every platform gate applies to every child project.

## Follow-up

1. Extend taxonomy registries with explicit usage metadata after the schema boundary is defined.
2. Add a taxonomy usage validator that detects missing descriptions, missing accepted/deprecated semantics, unknown values and invalid child-project extension namespaces.
3. Expose taxonomy values and usage metadata through Project Documentation Explorer view-models.
4. Render taxonomy value detail tables in the Project Documentation Explorer and analysis UI.
5. Define child-project governance profiles that classify platform gates as mandatory, optional, warning-only or not applicable.
6. Add write-back rules for approved Base Analysis, STRIDE and STRIDE-AI artifacts into child-project Project Model content.
7. Keep draft and candidate analysis state in platform operational storage until approval.

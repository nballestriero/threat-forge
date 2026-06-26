# ADR-0003 — Child Project Standard Project Model Reuse and Taxonomy Boundary

## Status

Accepted.

## Context

`MR-0003/ADR-0002` defines child projects as document-first governed repositories managed by the threat-forge platform. That decision intentionally prevents child projects from becoming ad-hoc repositories that are made analyzable only after implementation code exists.

The next clarification is how a child project declares its canonical documentation sources. A separate child-project-specific document-source manifest would create a second documentation model beside the one already used by threat-forge. That would weaken dogfooding, duplicate validation rules, and make future child-project analysis depend on a special case instead of the standard Project Model.

Threat-forge already has the project-model structure needed for child projects: macro-requirement registries, ADR registries, requirement registries, governed Markdown bodies, graph registries, body-format profiles, controlled taxonomy metadata, project-model pages, append-first protections, and traceability gates. Child projects should reuse this model as directly as possible.

This decision is document-only. It clarifies the intended skeleton and validation boundary before adding a generator, source loader, platform child-project registry, UI, RBAC runtime, Base Analysis, STRIDE, or STRIDE-AI gates.

## Decision

A governed child project must be a standard Project Model repository, not a repository with a separate child-project documentation model.

The child-project skeleton must therefore instantiate the same project-model shape used by threat-forge under `docs/reference/project-model/`. It must include the same kinds of governed registries, governed body files, graph records, body-format declarations, controlled taxonomy declarations, working plan, and operational guides needed to make the repository analyzable.

Threat-forge must not introduce a custom child-project document-source manifest as the canonical source declaration mechanism. Document-source control is achieved by validating the standard Project Model roots and rejecting files outside those roots as canonical requirement, ADR, graph, body-format, or taxonomy sources.

Child projects must reuse the same registry and body models unless a future governed ADR defines a compatible extension. This includes macro-requirement registries, requirement registries, ADR registries, ADR body profiles, requirement body profiles, graph node types, SPO predicates, append-first behavior, and orphan governed-body controls.

Child projects must reuse controlled taxonomy models for fields whose values need deterministic validation, UI filtering, or analysis semantics. A child project may add local taxonomy values only through governed taxonomy registries and graph/project-model traceability, not through free-form field values or informal guide text.

The platform may maintain a separate child-project registry for the list of repositories managed by threat-forge. That platform registry identifies child projects, repository locations, branches, project-model roots, governance profile, lifecycle status, and future RBAC capability bindings. It must not replace the child project's internal Project Model registries.

## Scope

In scope:

- declaring child projects as standard Project Model repositories;
- reusing threat-forge registry models, body profiles, graph model, taxonomy model, and append-first controls;
- clarifying that child-project source control validates standard Project Model roots instead of a custom document-source manifest;
- distinguishing the future platform child-project registry from internal child-project project-model registries;
- preserving document-first, traceability, RBAC-ready, and future threat-analysis lifecycle boundaries from `MR-0003/ADR-0002`.

Out of scope:

- implementing a child-project skeleton generator;
- implementing a standard Project Model skeleton/source validator;
- implementing a platform child-project registry;
- implementing UI components, routes, menus, or lifecycle dashboards;
- implementing RBAC persistence or policy administration;
- implementing Base Analysis, STRIDE, or STRIDE-AI gates;
- generating application code for child projects.

## Consequences

### Positive consequences

- Child projects reuse the same governance model that threat-forge uses to govern itself.
- Validators, Explorer views, graph traversal, taxonomy filters, and future analysis stages can operate over the same structures in platform and child repositories.
- The child-project skeleton remains strict without inventing a parallel manifest format.
- Future child-project UI and RBAC work can manage repositories without changing the internal project-model format.
- Taxonomy-controlled fields remain deterministic for filtering, validation, and future threat-analysis inputs.

### Negative consequences

- The initial child-project skeleton is larger than a minimal README-style scaffold.
- Child projects must learn the same governance model as threat-forge instead of a simplified bespoke format.
- Future tooling must distinguish platform child-project registration from the child repository's internal project-model records.

## Follow-up

1. Define a standard Project Model skeleton/source validator for child projects.
2. Define the minimal child-project skeleton files produced by threat-forge.
3. Define the platform child-project registry separately from child internal project-model registries.
4. Define child-project taxonomy reuse and extension validation.
5. Later, connect the reserved pre-code threat-analysis stage to Base Analysis, STRIDE, and STRIDE-AI gates.

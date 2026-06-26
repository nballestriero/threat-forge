# ADR-0002 — Child Project Document-First Governed Lifecycle and Management Boundary

## Status

Accepted.

## Context

Threat-forge must create and manage child projects that are governed from their first repository shape, not retrofitted after implementation code already exists.

A child project must therefore start with documentation, requirements, decisions, graph records, gates, and guides that make it analyzable by threat-forge. The lifecycle must preserve the same discipline used by threat-forge itself: implementation code needs a documented justification, code must remain traceable to governed requirements and decisions, and future threat-analysis gates must be able to become mandatory before code is introduced.

Child projects also need a platform management surface. The Governance Console must eventually allow authorized platform users to list, create, inspect, and manage child projects, while child project consoles reuse the same shell without owning nested child-project management. These future actions must be represented through backend capability boundaries so identity, users, roles, project membership, and RBAC policies can protect them without frontend hardcoding.

This step is document-only. It defines the governed lifecycle and management boundary before adding generators, adapters, UI routes, backend endpoints, RBAC storage, or threat-analysis execution.

## Decision

Threat-forge must define child projects as document-first governed repositories managed by the platform.

A generated child project skeleton must include the minimal governed documentation structure, operating guides, document-source declaration, local gate entrypoints, and lifecycle placeholders required to enforce documentation before implementation code.

A child project must not accept implementation code as governed work unless the code can be justified by a governed ADR and/or requirement and can be traced back to the implemented requirement and decision. The skeleton must make this rule explicit in guides and future gate contracts.

Threat analysis must be reserved as a mandatory pre-code lifecycle stage after governed documentation and before implementation code. Until `MR-0004`, `MR-0005`, and `MR-0006` provide executable analysis gates, the child-project lifecycle must expose this stage as a required policy placeholder so later Base Analysis, STRIDE, and STRIDE-AI checks can become blocking without changing the lifecycle model.

Child-project documentation sources must be declared explicitly by a repository-contained manifest. Threat-forge must not discover arbitrary files as canonical governed documentation. Future loaders and validators must reject traversal, external roots, undeclared paths, and non-canonical documentation sources.

The platform Governance Console must own child-project management. The platform workspace may expose Child Projects navigation and lifecycle status views. Child project workspaces must omit child-project management navigation and must not create nested child projects. UI behavior must be driven by backend capabilities so future user/RBAC policies can control visibility and execution for creation, inspection, skeleton generation, gate execution, lifecycle approval, and threat-analysis results.

## Scope

In scope:

- defining the child-project governed skeleton boundary;
- defining document-first lifecycle rules for child projects;
- requiring code traceability to governed ADRs and requirements;
- reserving the future threat-analysis pre-code gate stage;
- defining explicit document-source manifests and containment controls;
- defining the platform UI management boundary for child projects;
- requiring RBAC-ready backend capability boundaries for child-project actions.

Out of scope:

- implementing the child-project skeleton generator;
- implementing document-source manifest validators;
- implementing child-project repository storage or adapters;
- implementing UI components, routes, menus, or lifecycle dashboards;
- implementing RBAC persistence, role assignment, or policy administration;
- implementing Base Analysis, STRIDE, or STRIDE-AI execution gates;
- generating application code for child projects.

## Consequences

### Positive consequences

- Child projects are governed from creation instead of corrected after code exists.
- Implementation code must remain explainable through ADRs, requirements, and graph traceability.
- Future threat-analysis gates can become mandatory without redesigning the child-project lifecycle.
- The platform can manage child projects from the Governance Console while child projects avoid nested management responsibilities.
- RBAC can be introduced behind stable capability contracts instead of frontend conditionals.
- Document-source controls reduce ambiguity between canonical project-model documentation and free-form explanatory material.

### Negative consequences

- Child-project scaffolding must generate more than a minimal README.
- Early child-project development requires documentation work before implementation work.
- Future validators must coordinate documentation, traceability, source containment, lifecycle, and threat-analysis readiness rules.
- UI implementation must wait for backend capabilities instead of hardcoding menu visibility.

## Follow-up

1. Define a document-source manifest contract and validator for child projects.
2. Define the minimal child-project skeleton files and guides generated by threat-forge.
3. Define child-project document-first gate behavior.
4. Define child-project code traceability gate behavior.
5. Define the backend child-project read model and capability response.
6. Define the platform Child Projects UI navigation and read-only lifecycle status view.
7. Later, connect the reserved pre-code threat-analysis stage to Base Analysis, STRIDE, and STRIDE-AI gates.

# ADR-0004 — Reusable Project Model Validator Boundary for Child Projects

## Status

Accepted.

## Context

`MR-0003/ADR-0003` establishes that governed child projects reuse the same Project Model used by threat-forge: macro requirements, ADR registries, requirement registries, governed Markdown bodies, graph records, body-format declarations, controlled taxonomies, append-first controls, and traceability-compatible code records.

The next implementation risk is duplicating validation logic for child projects. A separate child-project validator family would drift from the platform validators and would weaken the requirement that child projects behave like standard threat-forge-governed repositories.

Threat-forge already has validators for graph format, ADR registry fields, requirement registry fields, body-format registry structure, ADR body format, requirement body format, orphan governed body files, code traceability, append-first records, lockfile integrity, OpenAPI structure, and Project Documentation Explorer source containment. These validators currently operate primarily on the platform repository root. Child-project validation should reuse these controls by making reusable validator boundaries explicit before implementation.

This decision is document-only. It defines the intended validation boundary before adding child-project tooling, generator behavior, UI, RBAC runtime, repository adapters, or threat-analysis gates.

## Decision

Child-project Project Model validation must be implemented as reuse of the existing threat-forge validation model applied to an explicit child-project root, not as a parallel or simplified validator model.

The system must introduce a reusable Project Model validator boundary that can resolve a target repository root and its `docs/reference/project-model/` root, verify containment, and delegate to the same validation rules used by threat-forge wherever practical.

Existing validators should be refactored or wrapped only as much as necessary to accept an explicit target root or project-model root. Their rule semantics must remain shared between the platform repository and child repositories unless a future governed ADR defines a compatible extension.

The first child-project validation profile must be intentionally small. It must validate the standard skeleton and documentation model needed before a generator or UI can rely on a child repository:

- the canonical Project Model root exists;
- required registry directories and governed body directories exist;
- macro-requirement, ADR, requirement, graph, body-format, body, orphan-body, taxonomy, and append-first controls use the existing threat-forge models;
- canonical paths remain contained in the child repository root;
- traversal, absolute-path injection, external roots, and symlink or junction escape are rejected;
- code traceability and document-first checks are prepared for reuse but may remain staged until implementation-code skeletons are introduced.

The child-project validator must not implement Base Analysis, STRIDE, STRIDE-AI, RBAC runtime authorization, UI navigation, child-project creation, repository cloning, or application-code generation.

## Scope

In scope:

- defining reusable validator boundaries for standard Project Model validation;
- requiring child-project validation to reuse existing threat-forge validators where possible;
- defining explicit child-project root and project-model root containment;
- defining a minimal standard skeleton validation profile;
- preserving document-first, traceability-ready, taxonomy-controlled, and threat-analysis-ready lifecycle boundaries.

Out of scope:

- implementing the validator in this micropasso;
- changing validator command-line contracts;
- generating a child-project skeleton;
- creating or storing child-project registry records;
- implementing Governance Console child-project UI;
- implementing RBAC policy administration or persistence;
- implementing Base Analysis, STRIDE, STRIDE-AI, or any pre-code threat-analysis execution gate;
- generating child-project application code.

## Consequences

### Positive consequences

- Child-project validation dogfoods the same governance model used by threat-forge.
- Validator behavior stays aligned between the platform and child repositories.
- Future skeleton generation can target one known Project Model profile instead of a custom manifest.
- The platform can later report child-project lifecycle status using the same validation evidence produced for threat-forge itself.
- Root containment is defined before tooling reads child repository files.

### Negative consequences

- Some existing validators may need small parameterization or wrapper seams before they can validate an external root.
- The first child-project validator will be stricter than a simple scaffold checker.
- Full code traceability and threat-analysis gates will still need separate implementation decisions when child projects start containing implementation code and analysis records.

## Follow-up

1. Add the child-project standard Project Model skeleton validator as a small wrapper over existing validators.
2. Refactor only the minimum shared validator seams needed to accept a target root or project-model root.
3. Add negative fixtures for missing skeleton roots, path traversal, absolute paths, and symlink or junction escape.
4. Later, connect the validator report to the platform child-project registry and Governance Console lifecycle status view.

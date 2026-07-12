# MR-0001REQ-0026 — Governed Development Guide Diátaxis Placement

## Intent

The project needs programmer and LLM operating guidance, but those documents must not blur the boundary between Diátaxis categories.

MR-0001 governs the documentation method. Therefore it must define where operational development guides live and how they remain connected to ADRs, requirements, and graph traceability.

## Requirement

The project model must place governed development guides in the Diátaxis how-to space, not inside ADR bodies, Requirement bodies, registries, or reference-only project-model folders.

The governed-development how-to area must be `docs/how-to/governed-development/`. ADR and Requirement records may require and trace those guide documents, but the guide content itself must remain in the how-to tree.

## Scope

This requirement applies to operational guides that instruct programmers or LLM-assisted workflows on how to perform governed development work.

It covers guide placement, Diátaxis separation, and project-model traceability from requirements to guide documents.

It does not define a generic guide body validator, implement a user interface, or define reusable backend/frontend modules.

## Rules

- Operational development guides must be placed under `docs/how-to/`.
- The initial governed-development guide directory must be `docs/how-to/governed-development/`.
- ADR bodies must record decisions, not long-form operating instructions.
- Requirement bodies must record verifiable contracts, not replace how-to guides.
- Guide documents must not be stored under `docs/reference/project-model/body/decisions/` or `docs/reference/project-model/body/requirements/`.
- Guide documents required by the project model must be traceable from MR-0001 requirements through the graph.
- Future guide validation must be introduced only through a separate ADR, requirement, graph relation, and focused validator.

## Acceptance Criteria

```gherkin
Scenario: Governed development guide is placed in the how-to space
  Given the project contains operational development guidance
  When the guide path is inspected
  Then the guide is located under docs/how-to/governed-development
  And the guide is not embedded as an ADR body or Requirement body

Scenario: Guide placement remains traceable
  Given a governed development guide is required by MR-0001
  When the project graph is inspected
  Then the corresponding requirement has a graph relation to the guide document node
```

## Verification Expectation

Current verification is provided by the existing documentation structure, Requirement registry, ADR registry, graph-format, and project-model page gates. A future focused guide-placement validator may be introduced if guide placement rules require deterministic enforcement beyond the current structure checks.

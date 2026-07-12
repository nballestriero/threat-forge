# ADR-0013 — Governance gate plan explanation hierarchy

## Status

Accepted.

## Context

The Governance gate plans page now exposes taxonomy-backed and registry-backed gate explanations. Users can understand more about gates, capabilities, validation surfaces, expected results and technical trace than before, but the page can feel dense because many explanation fields are visible together.

Governance gate plans must be useful both for study and for later execution. Before a gate executor exists, the page must teach users what a planned gate means, why it is selected, what it checks and what evidence or output is expected when it eventually runs. At the same time, raw ids, evidence markers and registry references must remain inspectable for governance traceability.

The UI therefore needs a hierarchy that separates immediate comprehension from deeper technical inspection.

## Decision

The Governance gate plans page shall present gates in a compact list first. After a project is selected, each gate row should initially show only the gate name, readable description, status/applicability summary and a clear affordance to expand or collapse details inline.

Expanded gate details shall use the following semantic order:

1. why this gate is selected;
2. what this gate checks;
3. checked areas / validation surfaces;
4. required capabilities;
5. expected result when executed;
6. contribution to threat-analysis readiness;
7. technical trace.

The first six sections are primary study-oriented explanations. The technical trace section is secondary and may contain raw gate ids, registry ids, planner evidence markers, source registry paths and graph/source references.

The UI may use semantic badges or limited color to distinguish neutral, positive, warning and blocking states, but those styles must be uniform with the shared Governance Console design language and must not be hardcoded as isolated one-off colors.

## Scope

In scope:

- defining the compact list plus inline expansion hierarchy for governance gates;
- separating semantic explanation from technical trace;
- preserving read-only behavior;
- preserving project-list/detail navigation;
- allowing shared semantic styles for status and severity.

Out of scope:

- implementing the UI in this decision-only micropasso;
- implementing gate execution;
- implementing orchestrator behavior;
- mutating child repositories;
- adding Base Analysis runtime or storage;
- changing the registry-backed explanation model.

## Consequences

### Positive consequences

- Gate plans become easier to scan before reading details.
- Users can learn why a gate exists before seeing raw technical evidence.
- Technical trace remains available without dominating the interface.
- The same hierarchy can later support executed pass/fail results without losing selection rationale.

### Negative consequences

- The UI needs additional progressive-disclosure behavior.
- Frontend code must carefully map backend explanation fields into primary and secondary sections.
- Some dense gates may still require improved registry wording to become fully clear.

## Follow-up

1. Add requirements for compact gate list expansion and semantic/technical separation.
2. Implement the hierarchy in the Governance gate plans page.
3. Reuse shared badge and card styles when color improves readability.
4. Keep executor/orchestrator work parked until planned gate explanations remain understandable.

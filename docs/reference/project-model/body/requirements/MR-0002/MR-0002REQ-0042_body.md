# MR-0002REQ-0042 — Feature-colocated frontend composition

## Intent

Governance Console frontend pages must remain independently understandable while sharing the same shell, design system and access boundaries. The frontend should not copy backend-style layering into every simple page, but it also must not let each page invent its own global layout, icons, access checks or data access conventions.

## Requirement

Frontend implementation must organize Governance Console functionality as feature-colocated modules composed through MR-0002 shell, page-frame, design-system and semantic icon primitives.

## Scope

This requirement applies to React frontend source under MR-0002 and future MR feature directories. It does not prescribe one final folder naming convention beyond requiring clear feature ownership and reuse of shared MR-0002 primitives.

## Rules

- A feature page must be rendered inside the shared Governance Console shell or a shared page-frame primitive.
- Feature-specific code may colocate page components, feature hooks, feature state helpers and feature data clients.
- Feature-specific code must not duplicate global shell, navigation, protected page frame, design-system token or semantic icon infrastructure.
- MR-0002 may provide reusable feature primitives such as filter bars, entity lists, detail panels, markdown body display and protected frames.
- Future MR-0003 through MR-0009 pages must consume MR-0002 frontend primitives instead of creating local UI frameworks.
- Backend-style Ports and Adapters structures must not be applied automatically to simple frontend features.

## Acceptance Criteria

```gherkin
Scenario: Feature page uses shared frontend composition boundary
  Given a Governance Console feature page is implemented
  When the page is rendered
  Then it is composed through the shared MR-0002 shell and page-frame primitives
  And it may colocate feature hooks and data clients inside the feature module
  And it does not define its own application shell, navigation framework or local design system
```

## Verification Expectation

Frontend implementation and code traceability should show page components depending on shared MR-0002 shell/design-system primitives while keeping feature-specific interaction logic inside the feature module.

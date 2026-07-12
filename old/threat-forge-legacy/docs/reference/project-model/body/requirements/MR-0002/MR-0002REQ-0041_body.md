# MR-0002REQ-0041 — Page composition through shared shell and page frames

## Intent

Governance Console pages need a consistent structure for protected access, workspace-aware navigation, filters, lists, details and body reading. This structure must be provided by the shared shell and page-frame primitives rather than rediscovered by each page.

## Requirement

Frontend pages must be composed through MR-0002 shared shell and page-frame primitives that provide consistent layout, capability-aware access presentation and reusable list/detail documentation patterns.

## Scope

This requirement applies to Project Documentation Explorer, Graph Explorer and future Governance Console pages. It does not implement dynamic RBAC or define feature-specific business behavior for MR-0003 through MR-0009.

## Rules

- A page must be rendered inside the Governance Console shell or an equivalent MR-0002 page frame.
- Protected pages must consume capability/access-policy state through the shared boundary rather than hardcoding permanent role checks in feature components.
- The Project Documentation Explorer list/detail pattern must be reusable: filters remain visible, the list is the default view, selecting an item opens detail below the filters, and detail displays registry metadata before body content.
- Feature components may manage local view state, but must not duplicate global navigation, shell layout or protected-page mechanics.
- Page frames must be suitable for both platform workspace pages and child-project workspace pages.

## Acceptance Criteria

```gherkin
Scenario: Documentation explorer page uses shared page frame
  Given the Project Documentation Explorer is implemented as a React page
  When a registered user opens the page
  Then the page is displayed inside the shared Governance Console shell
  And the page uses shared frame primitives for protected access, filters, list and detail layout
```

## Verification Expectation

Future implementation should make the Project Documentation Explorer the first concrete page using shared shell/page-frame primitives, before additional feature pages are added.

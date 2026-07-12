# MR-0002REQ-0040 — Semantic icon token registry and adapter boundary

## Intent

Icons must remain consistent across the Governance Console and must not be selected ad hoc by individual pages. Pages should use semantic intent names, while MR-0002 maps those names to the concrete icon implementation.

## Requirement

The frontend must provide a shared semantic icon token registry and a central icon adapter/component. Feature pages must reference icons through semantic tokens rather than importing or selecting concrete icon components directly.

## Scope

This requirement applies to navigation icons, action icons, entity-type icons, status icons and other recurring UI icon uses in the Governance Console. It does not require a specific icon library in this documentation step.

## Rules

- Icon names exposed to pages must describe product semantics, not concrete artwork or library names.
- Examples of valid semantic token groups include `navigation.*`, `action.*`, `entity.*` and `status.*`.
- A central MR-0002 icon adapter/component must map semantic tokens to concrete icons.
- Pages must use the central icon component or adapter, for example through tokens such as `navigation.projectDocumentation`, `action.filter`, `entity.requirement` or `status.accepted`.
- Pages must not directly import concrete icon components as their stable page contract.
- The concrete icon set must remain replaceable without changing feature-page semantics.

## Acceptance Criteria

```gherkin
Scenario: Page uses a semantic icon token
  Given a Project Documentation Explorer action needs a filter icon
  When the page renders the action
  Then it references a semantic token such as action.filter
  And the central MR-0002 icon adapter resolves the concrete icon
```

## Verification Expectation

Future frontend implementation should make direct concrete icon imports from feature pages unnecessary, with common icons resolved through the MR-0002 semantic icon registry and adapter.

# ADR-0010 — Shared frontend design system and semantic icon registry

## Status

Accepted.

## Context

The Project Documentation Explorer prototype validated the first read-only exploration flow, but the final frontend must not grow as a set of unrelated pages with local layouts, local controls and page-specific icon choices.

Threat-forge needs one Governance Console interface shared by the platform workspace and by child-project workspaces. Future pages for project documentation, graph exploration, threat analysis, reports, child projects, identity and audit must all use the same visual language, the same shell rules and the same semantic interaction primitives.

Icons are part of that contract. If each page imports concrete icon components directly, the product will quickly become visually inconsistent and hard to refactor. Pages should ask for semantic icons such as `navigation.projectDocumentation`, `action.filter`, `entity.requirement` or `status.accepted`; a central MR-0002 adapter should map those semantic tokens to the concrete icon set used by the application.

## Decision

MR-0002 owns the shared frontend design system, Governance Console shell, page-frame primitives and semantic icon registry. Product pages and feature slices must consume these shared primitives instead of defining local templates, local base components or local icon mappings.

The frontend architecture must separate:

- stable semantic design contracts used by feature pages;
- replaceable implementation details such as the concrete icon library, component internals and styling mechanics.

The shared design-system area should provide, when the React frontend is implemented:

- shell components for the Governance Console layout;
- protected page frames that consume capability-aware navigation and access state;
- common controls such as buttons, cards, filter bars, selects, search inputs, badges, entity lists, detail panels and Markdown body display;
- design tokens for color, spacing, typography, radius and related UI primitives;
- semantic icon tokens and a central `Icon` component or adapter that maps tokens to concrete icon implementations.

Feature pages must use the shell and design-system primitives. A page may define feature-specific composition, data binding and local view state, but it must not create a separate visual template, direct concrete icon usage policy or direct source-access behavior.

## Scope

In scope:

- shared Governance Console template ownership by MR-0002;
- design-system directory and ownership rule;
- semantic icon token registry rule;
- central icon adapter/component rule;
- page composition through shared shell and page frames;
- reuse by Project Documentation Explorer, Graph Explorer and future MR pages.

Out of scope:

- choosing a final concrete icon library;
- implementing the React shell in this documentation-only step;
- dynamic RBAC configuration;
- theming beyond the already accepted minimal monochrome direction;
- page-specific feature behavior owned by MR-0003 through MR-0009.

## Consequences

### Positive consequences

* The Governance Console can remain visually coherent as new pages are added.
* Child-project workspaces can reuse the same shell while hiding platform-only navigation by capability.
* Concrete icon libraries can be changed without editing every page.
* Feature teams can build pages without redefining layout, typography, icon and base-control rules.

### Negative consequences

* Early frontend implementation needs a small amount of shared infrastructure before feature pages can move quickly.
* Semantic icon tokens require naming discipline and occasional registry updates.
* Some page-specific visual shortcuts must be rejected or moved into reusable design-system primitives.

## Follow-up

1. Implement the first React Governance Console shell using MR-0002 shared layout primitives.
2. Introduce the semantic icon token registry and central icon adapter before adding multiple feature pages.
3. Port the Project Documentation Explorer prototype flow into the shared shell and component model.
4. Keep capability-aware navigation and page visibility outside page-local hardcoded role checks.

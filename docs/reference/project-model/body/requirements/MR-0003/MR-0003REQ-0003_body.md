# MR-0003REQ-0003 — Child project security-analysis readiness from Doc-as-Code creation

## Intent

Threat analysis must be grounded in structured project documentation from the beginning of the child-project lifecycle.

This requirement ensures that child projects produce enough analyzable architecture and security context for `MR-0004` base threat analysis and later STRIDE or STRIDE-AI overlays.

## Requirement

The system must require governed child projects to capture security-analysis inputs during Doc-as-Code creation.

At minimum, the child project must provide analyzable places for project identity, architecture context, assets, actors, trust boundaries, data flows, entry points, assumptions, and open questions.

Threat-forge must treat missing required analysis inputs as readiness gaps instead of generating ungrounded security analysis.

## Scope

This requirement applies to the child-project documentation profile and future base threat-analysis readiness checks.

It defines the minimum security-analysis readiness expectation at project creation time.

It does not implement the `MR-0004` base threat-analysis model, STRIDE, STRIDE-AI, or threat finding generation.

## Rules

- Child projects must provide analyzable documentation entry points for base threat-analysis inputs.
- Assets, actors, boundaries, data flows, entry points, assumptions, and open questions must be representable as governed records or governed document sections.
- Threat-forge must not silently invent missing base threat-analysis inputs.
- Missing required inputs must be reported as readiness gaps.
- STRIDE and STRIDE-AI overlays must depend on the base threat-analysis model rather than replacing it.
- The child-project documentation profile must be able to evolve as `MR-0004`, `MR-0005`, and `MR-0006` define more specific contracts.

## Acceptance Criteria

```gherkin
Scenario: Child project is ready for base threat analysis
  Given a governed child project has a documentation profile
  When threat-forge evaluates threat-analysis readiness
  Then the project exposes analyzable inputs for assets, boundaries, data flows, entry points, assumptions, and open questions

Scenario: Missing base inputs block overlay analysis
  Given a governed child project has no analyzable data-flow or boundary information
  When a STRIDE overlay analysis is requested
  Then threat-forge reports missing base threat-analysis inputs
  And the overlay is not treated as grounded analysis
```

## Verification Expectation

A future base threat-analysis readiness validator must fail when a child project lacks required analyzable inputs for assets, boundaries, data flows, entry points, assumptions, or open questions.

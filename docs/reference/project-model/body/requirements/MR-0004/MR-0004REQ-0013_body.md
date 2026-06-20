# MR-0004REQ-0013 — Domain-neutral Base Analysis Taxonomy Model

## Intent

Base Analysis taxonomy values must remain universal enough to classify child projects across software, physical, operational, industrial, AI, IoT, business and mixed cyber-physical domains.

## Requirement

The Base Analysis taxonomy model must be domain-neutral and methodology-neutral. It must classify universal actors, components, resources, boundaries, flows and lifecycle states without assuming that the governed project is a software application, an AI system, an industrial plant, a business workflow or any other specific domain.

## Scope

This requirement applies to Base Analysis taxonomy design. It does not define domain profiles or methodology overlays.

## Rules

- Base taxonomy values must use abstract, reusable concepts.
- Base taxonomy values must not encode STRIDE, STRIDE-AI, PASTA or future methodology categories.
- Base taxonomy values must not encode project-specific equipment, application frameworks, AI products, protocols or business functions.
- Domain-specific and methodology-specific precision must be added through governed extensions or overlays.

## Acceptance Criteria

```gherkin
Scenario: Base taxonomy supports non-software projects
  Given a governed child project models an irrigation system
  When it classifies a pump for Base Analysis
  Then the pump can be classified by a generic base component kind
  And the pump-specific meaning is represented by a domain or project taxonomy extension
```

## Verification Expectation

Future taxonomy validators must reject base taxonomy additions that bypass the extension model by introducing domain-specific values as canonical base values.


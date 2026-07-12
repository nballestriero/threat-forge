# MR-0004REQ-0014 — Universal Base Analysis Primitive Taxonomies

## Intent

Base Analysis needs controlled primitive taxonomies before future API, UI, DFD and analysis records depend on them.

## Requirement

The project model must define controlled Base Analysis taxonomies for actor kind, component kind, resource kind, boundary kind, flow kind, Base Analysis lifecycle status and candidate review status. Each taxonomy value must include a stable identifier, display name, description and semantic metadata consistent with the governed taxonomy metadata model.

## Scope

This requirement applies to controlled taxonomy records. It does not implement validators or runtime Base Analysis storage.

## Rules

- Actor, component, resource, boundary and flow taxonomies must use domain-neutral values.
- Resource classification must support information, operational, physical, configuration, credential, contract, evidence and knowledge resources.
- Flow classification must support requests, commands, transfers, reads, writes, control, events, measurements, validations, automation and evidence movement.
- Status taxonomies must support draft, review, consolidation, stale, rebase, supersede and archive semantics.

## Acceptance Criteria

```gherkin
Scenario: Base Analysis taxonomy records are controlled
  Given the taxonomy registry defines Base Analysis primitive taxonomies
  When a future Base Analysis element is classified
  Then it can reference a controlled base taxonomy value
  And the value has a description suitable for review, reports and UI display
```

## Verification Expectation

Future taxonomy validators must verify that every Base Analysis taxonomy value has mandatory metadata and no raw UI colors.


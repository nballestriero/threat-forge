# MR-0004REQ-0007 — DFD Derivation after Accepted Base Inventory

## Intent

The DFD must be derived after assets, boundaries and flows have been identified and reviewed.

## Requirement

The Base Threat Analysis must construct DFD projections from accepted Actors, Components, Data Resources, Boundaries and Data Flows. The DFD must not be the initial source of truth for base inventory.

A DFD view may organize accepted entities and flows into useful diagrams and aggregation levels, but it must remain a projection over the reviewed Base Analysis inventory.

## Scope

This requirement applies to Base Threat Analysis DFD semantics.

It does not implement DFD rendering, diagram editing, layout algorithms, graph visualization UI, STRIDE or STRIDE-AI.

## Rules

- DFD construction must happen after candidate inventory and candidate flows are reviewed.
- The DFD must be derived from accepted base entities and flows.
- DFD aggregation must not create new canonical entities outside the Base Analysis inventory.
- DFD views must preserve traceability to the accepted entities, flows and source evidence they represent.
- If DFD construction reveals a missing entity or flow, it must create a Base Analysis correction candidate rather than mutating the snapshot silently.

## Acceptance Criteria

```gherkin
Scenario: DFD is built from accepted inventory
  Given accepted Actor, Component, Data Resource, Boundary and Data Flow records exist in a Base Analysis draft
  When the DFD projection is generated
  Then the DFD shows those accepted entities and flows
  And the DFD does not introduce unreviewed entities as canonical inventory
```

## Verification Expectation

Future DFD gates must verify that diagram elements reference accepted Base Analysis inventory before DFD projections are used by overlay methodologies.

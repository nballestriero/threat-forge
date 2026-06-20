# MR-0004REQ-0015 — Domain and Methodology Specialization Boundary

## Intent

Base Analysis must be specialized without being mutated by domain or methodology concerns.

## Requirement

The project model must preserve a clear boundary between base classifications, domain profile classifications and methodology overlay classifications. Domain profiles and methodology overlays may add classifications, annotations, findings and requirements over BaseAnalysisVersion elements, but they must not replace the mandatory base classification or mutate canonical base inventory.

## Scope

This requirement applies to specialization semantics. It does not define STRIDE, STRIDE-AI, PASTA, safety, privacy or compliance taxonomy values.

## Rules

- Domain profiles specialize base elements for reusable or project-specific domains.
- Methodology overlays classify base elements for a specific analysis method.
- A single base element may have multiple domain and methodology classifications.
- Overlay classifications must reference a BaseAnalysisVersion and target base elements or relations.
- Methodology outputs remain candidate until reviewed according to their own lifecycle rules.

## Acceptance Criteria

```gherkin
Scenario: STRIDE specializes a base flow
  Given a BaseAnalysisVersion contains a command flow
  When a STRIDE overlay analyzes the flow
  Then the overlay can classify the flow as relevant to Tampering or Elevation of Privilege
  And the command flow remains unchanged in the base inventory
```

## Verification Expectation

Future overlay validators must verify that methodology records reference base elements instead of creating or mutating canonical base entities directly.


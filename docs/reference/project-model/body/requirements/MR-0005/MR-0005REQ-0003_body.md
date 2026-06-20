# MR-0005REQ-0003 — STRIDE threat hypothesis and security property contract

## Intent

STRIDE analysis must distinguish classification from actual threat reasoning.

## Requirement

A STRIDE classification may lead to one or more security properties and threat hypotheses.

A security property states what must be true for the classified base element, boundary, or flow to be acceptably protected. A threat hypothesis states a plausible attack or failure path if that property is violated. Hypotheses must remain distinct from reviewed findings until evidence and review accept them.

## Scope

This requirement applies to STRIDE reasoning outputs under `MR-0005`.

It does not generate findings, mitigations, or tests.

## Rules

- STRIDE classifications must not be treated as findings by themselves.
- Security properties must reference the classified base element or flow.
- Threat hypotheses must trace to a STRIDE category and a security property.
- Reviewed findings must be distinguishable from hypotheses.

## Acceptance Criteria

```gherkin
Scenario: Derive a threat hypothesis from a classification
  Given a data flow is classified for Information Disclosure
  When STRIDE reasoning is performed
  Then a security property can require project-scoped authorization
  And a threat hypothesis can describe cross-project entity disclosure
  And the hypothesis is not treated as a finding until reviewed
```

## Verification Expectation

Future STRIDE tooling should preserve the chain from base element to classification, security property, hypothesis, and reviewed finding.

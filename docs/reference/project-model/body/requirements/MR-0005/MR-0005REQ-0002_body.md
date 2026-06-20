# MR-0005REQ-0002 — STRIDE taxonomy classification contract

## Intent

STRIDE analysis must classify base elements and flows using a controlled, repeatable STRIDE taxonomy.

## Requirement

The STRIDE overlay must classify applicable base actors, components, data resources, boundaries, and data flows using the STRIDE categories: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege.

A classification must state what base element or flow it applies to and why the category is relevant. The classification must remain an overlay annotation. It must not replace the base element type.

## Scope

This requirement applies to STRIDE classification semantics under `MR-0005`.

It does not define a runtime schema, UI, graph registry entry, or complete threat catalogue.

## Rules

- Each STRIDE classification must reference at least one base element or data flow.
- A base element may have zero, one, or more STRIDE classifications.
- STRIDE categories must not become base element types.
- Classification rationale must be preserved for future review and traceability.

## Acceptance Criteria

```gherkin
Scenario: Classify an API boundary data flow
  Given a base data flow crosses a browser/backend boundary
  When STRIDE classification is applied
  Then the flow can be classified for Spoofing, Tampering, Information Disclosure, or Elevation of Privilege
  And the base flow remains a Data Flow
```

## Verification Expectation

Future STRIDE gates should validate category values, base references, and classification rationale.

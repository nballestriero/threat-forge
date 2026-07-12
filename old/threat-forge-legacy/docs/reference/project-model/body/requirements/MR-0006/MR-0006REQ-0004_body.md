# MR-0006REQ-0004 — STRIDE-AI candidate output review contract

## Intent

AI-generated output must not become accepted evidence, findings, mitigations, or requirements without governed review.

## Requirement

STRIDE-AI must treat model output, agent output, retrieved context, generated observations, threat hypotheses, mitigations, findings, and requirements as candidate material until reviewed and promoted through governed controls.

Accepted analysis artifacts must trace to their source documents, retrieval context, model invocation, candidate output, reviewer or governed validation, and resulting project-model artifact.

## Scope

This requirement applies to AI-assisted STRIDE-AI output under `MR-0006`.

It does not implement review workflows, approval UI, evidence storage, or AI agent execution.

## Rules

- AI output must not be accepted evidence by default.
- Candidate output must remain distinguishable from reviewed findings and accepted requirements.
- Promotion from candidate to governed artifact must preserve evidence and review traceability.
- AI-generated specialized requirements must use the governed requirement workflow.

## Acceptance Criteria

```gherkin
Scenario: AI suggests a finding
  Given a model response suggests a prompt-injection finding
  When the analysis session records the output
  Then the finding remains candidate material
  And it becomes accepted only after governed review and traceability are recorded
```

## Verification Expectation

Future STRIDE-AI, evidence, and requirement tooling should verify candidate/reviewed status and traceability before accepting AI-assisted outputs.

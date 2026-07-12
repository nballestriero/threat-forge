# MR-0006REQ-0002 — STRIDE-AI pipeline risk taxonomy contract

## Intent

STRIDE-AI must use a taxonomy focused on AI/RAG and agentic-analysis pipeline risks.

## Requirement

The STRIDE-AI overlay must classify applicable base elements and flows using AI/RAG risk categories such as Prompt Injection, Context Poisoning, Retrieval Contamination, Cross-Project Data Leakage, Model Misuse, Unsafe Tool Invocation, Unreviewed AI Output, Evidence Hallucination, Embedding Or Index Leakage, Agent Privilege Escalation, Model Runtime Boundary Abuse, and Data Contamination.

The taxonomy must classify the risk interpretation of base elements and flows. It must not redefine the base taxonomy.

## Scope

This requirement applies to STRIDE-AI classification semantics under `MR-0006`.

It does not define a complete taxonomy registry, runtime schema, UI, or finding generator.

## Rules

- STRIDE-AI classifications must reference base elements, boundaries, or data flows.
- AI/RAG categories must remain overlay classifications.
- Classification rationale must include the pipeline context when applicable.
- The taxonomy must remain refinable before it becomes a controlled registry.

## Acceptance Criteria

```gherkin
Scenario: Classify retrieval risk
  Given a base data flow retrieves context from a child-project retrieval index
  When STRIDE-AI classification is applied
  Then the flow can be classified for Retrieval Contamination or Cross-Project Data Leakage
  And the base flow remains a Data Flow
```

## Verification Expectation

Future STRIDE-AI validators should check taxonomy values, base references, and pipeline-context rationale.

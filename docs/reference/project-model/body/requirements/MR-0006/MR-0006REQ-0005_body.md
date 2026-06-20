# MR-0006REQ-0005 — STRIDE-AI Overlay BaseAnalysisVersion Binding

## Intent

STRIDE-AI overlays must bind AI/RAG risk analysis to a reproducible base snapshot.

## Requirement

Every STRIDE-AI overlay must reference exactly one consolidated Base Analysis version and preserve the AI/RAG context assumptions used for analysis. It must not claim current coverage for a changed project state without governed review or rebase.

## Scope

This requirement applies to STRIDE-AI lifecycle records. It does not implement LLM calls, RAG or finding generation.

## Rules

- A STRIDE-AI overlay must reference one consolidated Base Analysis version.
- AI/RAG context assumptions must be preserved as evidence.
- Candidate AI output must remain tied to the overlay version that produced it.

## Acceptance Criteria

```gherkin
Scenario: STRIDE-AI overlay starts
  Given BaseAnalysisVersion-001 is consolidated
  When a STRIDE-AI overlay is created
  Then it references BaseAnalysisVersion-001 and records its AI/RAG context assumptions
```

## Verification Expectation

Future STRIDE-AI validators must reject overlays that are not tied to a consolidated Base Analysis version.

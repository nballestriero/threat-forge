# MR-0006REQ-0006 — STRIDE-AI Overlay Stale and Reviewed-Output Policy

## Intent

Stale STRIDE-AI overlays must not promote unreviewed AI output as current security evidence.

## Requirement

When the referenced Base Analysis version or relevant AI/RAG project knowledge becomes stale, the STRIDE-AI overlay must be marked stale, require review, require rebase or be superseded. AI-generated observations, findings, mitigations and evidence must remain candidates until reviewed.

## Scope

This requirement applies to STRIDE-AI lifecycle semantics and reviewed-output boundaries. It does not implement AI output validation or policy gates.

## Rules

- Stale base status must propagate to dependent STRIDE-AI overlays.
- Unreviewed AI output must not count as current accepted security coverage.
- Reviewed AI outputs must preserve reviewer and evidence context.
- Rebased overlays must not overwrite prior AI output evidence.

## Acceptance Criteria

```gherkin
Scenario: STRIDE-AI context becomes stale
  Given a STRIDE-AI overlay contains candidate AI findings
  When its referenced project knowledge becomes stale
  Then unreviewed candidate findings are not promoted as current evidence
  And the overlay requires review or rebase according to policy
```

## Verification Expectation

Future reporting must expose stale STRIDE-AI status and unreviewed AI output counts.

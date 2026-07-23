# ADR-0002 — Common analysis findings, documentation feedback and functional traceability

## Status

Draft

## Context

ThreatForge already separates the methodology-neutral Base Analysis,
expert-authored methodology-specific records, accepted deterministic DFD
projections and rendering adapters. Future STRIDE, STRIDE-AI and other
analyses also need comparable outputs that preserve their methodological
origin while remaining traceable to the same system knowledge and governed
functional requirements. Without a shared result boundary, every method
could define incompatible finding semantics, documentation feedback could
be confused with confirmed threats, and security obligations could lose
their connection to the functions they protect. The initial research scope
requires a general and demonstrable analysis process rather than complete
methodology versioning, risk management or industrial approval workflows.

## Decision

ThreatForge represents each governed application of an analysis method as
an analysis record that identifies the selected method, the contributing
analyst, the analysis scope and the referenced Base Analysis Elements,
relations and governed functional requirements. An analysis produces zero
or more findings and documentation gaps. A common finding records its
originating analysis, the affected Base Analysis Elements or relations, the
affected functional requirements, a concrete threat scenario, the expected
consequences, supporting rationale or evidence and a simple review state of
proposed, accepted or rejected. An accepted finding retains at
least one affected governed functional requirement so subsequent security
requirement proposals remain attached to the function they protect.
Method-specific categories, applicability rules, failure modes, attack
classes and other specialized interpretations remain in records owned by
the method-specific Macro-requirement and reference the common finding.
A documentation gap remains distinct from a finding and records missing,
ambiguous or inconsistent system information together with the affected
sources, Base Analysis references or functional requirements. Resolution of
a documentation gap or promotion of an analytical discovery follows the
governed documentary and Base Analysis review paths rather than directly
changing canonical records. Findings authored by different analyses remain
independently traceable even when they share subjects or consequences;
shared references alone do not establish duplication or equivalence.
The finding review state is explicitly recorded and is not inferred
automatically from finding content, shared references or method-specific
data. The initial model does not certify reviewer identity, human
participation or the process that assigned the state. Any later
consolidation remains a separate governed action. Accepted findings provide
traceable inputs for later security requirement proposals, without
establishing a one-to-one relationship between findings and security
requirements.

## Consequences

- Benefit: Different analysis methods expose comparable findings without losing their specialized interpretation.
- Benefit: Every accepted finding remains traceable to system elements and the functional requirements it affects.
- Benefit: Documentation gaps remain distinguishable from confirmed threat findings.
- Benefit: STRIDE and STRIDE-AI can contribute independent security requirements to the same functional requirement.
- Benefit: The common process remains small enough for application and evaluation in thesis case studies.
- Cost: Method-specific models need adapters or references to the common finding boundary.
- Cost: Analysts need to identify affected functional requirements before final finding acceptance.
- Cost: The initial model records review state without providing reviewer identity approval workflow or state-transition audit.
- Risk: A common finding envelope that is too restrictive could hide useful method-specific meaning.
- Risk: Incomplete functional documentation could delay acceptance of otherwise relevant findings.
- Risk: Similar findings could remain duplicated when reviewers do not perform consolidation.
- Constraint: Method-specific classifications remain outside common finding records.
- Constraint: Accepted findings preserve references to affected Base Analysis knowledge and governed functional requirements.
- Constraint: Documentation gaps do not directly modify governed documentation or canonical BAE records.
- Constraint: Shared subjects or consequences do not trigger automatic finding merge.
- Constraint: Finding review state is explicitly recorded and is never inferred automatically.
- Constraint: Security requirement derivation remains a governed step separate from finding production.

## Non-goals

- Define methodology or taxonomy versioning
- Define quantitative risk scoring
- Define a complete multi-role approval workflow
- Certify reviewer identity or human participation
- Define authorization or audit for finding state transitions
- Automatically correlate merge or consolidate findings
- Define the governed Security Requirement document model
- Define STRIDE-specific categories or analysis rules
- Define STRIDE-AI-specific categories failure modes or attack classes
- Implement analysis finding or documentation-gap tooling

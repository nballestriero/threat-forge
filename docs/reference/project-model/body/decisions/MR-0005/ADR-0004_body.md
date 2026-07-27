# ADR-0004 — Common Finding canonical title and governed reference projection

## Status

Draft

## Context

Common Findings are currently discovered as repository-contained files with the .analysis-finding.yml suffix and validated through the MR-0005 common Finding boundary. The shared governed entity reference grammar requires every referenceable entity projection to expose a stable canonical identifier and a canonical human-readable title. The current Common Finding model has a stable identifier, threat scenario, consequences, evidence and explicit review state, but it has no canonical title. Deriving a title implicitly from the threat scenario would couple stable reference presentation to descriptive scenario text and would introduce undeclared semantics.

## Decision

ThreatForge adds one explicit canonical title to every Common Finding record. The title is a non-empty single-line human-readable value distinct from the threat scenario and is not inferred from the threat scenario, consequences, evidence, method-specific data or file name.

The authoritative Common Finding source remains the set of repository-contained .analysis-finding.yml files discovered and validated through the existing MR-0005 boundary. ThreatForge does not introduce a separate canonical Common Finding registry solely for governed reference resolution.

A Common Finding source projection provider exposes the canonical Finding identifier and title from validated Finding records. Duplicate Finding identifiers remain ambiguous and do not resolve through the governed reference service.

A Common Finding eligibility provider permits governed Security Requirement references only when the explicitly recorded review state is accepted. Proposed and rejected Findings remain resolvable canonical records but are ineligible for Security Requirement references.

Governed reference resolution does not modify the Finding title, review state, content or source file. Common Finding discovery continues to use the existing repository discovery boundary and ignored-directory policy.

## Consequences

- Benefit: Security Requirements can use the shared canonical reference grammar without introducing a second reference mechanism.
- Benefit: Finding identity and readable presentation remain stable and explicit.
- Benefit: Existing repository-contained Finding discovery remains unchanged.
- Cost: Existing Common Finding fixtures and authored records require an explicit title.
- Cost: Common Finding validation and editor schema require deterministic updates.
- Risk: Poorly chosen titles may duplicate wording while still representing independent Finding identities.
- Constraint: The identifier remains authoritative and the title remains its required human-readable mirror.
- Constraint: Reference eligibility is based only on the explicitly recorded review state.

## Non-goals

- Introduce a central Common Finding registry
- Change the Common Finding discovery root or ignored-directory policy
- Infer titles from threat scenarios or method-specific classifications
- Automatically accept reject merge or deduplicate Findings
- Define the complete Security Requirement document model
- Implement the Common Finding resolver source provider or eligibility provider

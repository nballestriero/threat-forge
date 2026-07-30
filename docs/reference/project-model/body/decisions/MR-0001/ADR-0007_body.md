# ADR-0007 — Canonical document models and model-oriented validation

## Status

Draft

## Context

ThreatForge governs Macro-requirements, decisions and requirements through YAML registry records and Markdown bodies. Existing checks validate selected fragments of those representations, but the structural rules are distributed across independent tools and do not yet form an explicit document model.

The governed corpus also contains inconsistent headings, languages, punctuation and normative forms. Live authoring assistance, deterministic migration and reliable LLM analysis require one canonical description of each document model and stable diagnostics shared by gates and editors.

## Decision

ThreatForge defines governed document models through the canonical document model index. Each active model entry references exactly one YAML registry profile and exactly one Markdown body profile, and the profiles referenced by active model entries form the active representation-profile inventory. This Decision does not impose a fixed number of models or profiles.

Canonical model definitions are organized by model and representation. A shared validation engine consumes those definitions, while one entrypoint validates each complete logical model and one cross-model entrypoint validates relationships among models.

Model checkers absorb overlapping partial document checks after equivalent rule coverage is proven. Every diagnostic uses a stable rule identifier that is shared by repository gates, migration reports, editor diagnostics, quick fixes and deterministic fixtures.

Canonical identifiers, YAML field names, Markdown headings and persisted controlled values are English. Future translations are presentation metadata and do not create alternative canonical identifiers or values.

New model checks are introduced as non-blocking planned checks. They become active only after every active registry record and referenced body has been migrated and the complete model report contains no errors. ThreatForge does not retain a legacy validation mode for the previous body formats.

## Consequences

- Benefit: The complete rule set for one document type is discoverable from one logical model.
- Benefit: Repository gates, VS Code and the future web editor can use identical rule identifiers and semantics.
- Cost: Existing governed records and bodies require a reviewed repository-wide migration.
- Risk: Activating model checks before migration would make the governed repository gate fail.
- Constraint: Partial checks may be removed only after the replacement model checker proves equivalent or stronger coverage.

## Non-goals

- Immediate implementation of the validation engine
- Immediate activation of new blocking checks
- Governance of ordinary Diátaxis documentation as governed document models

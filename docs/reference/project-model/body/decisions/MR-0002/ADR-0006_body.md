# ADR-0006 — Shared Markdown assistance core and thin editor adapters

## Status

Draft

## Context

The governed Requirement authoring request and VS Code tasks provide safe creation workflows, but they cannot inspect the current unsaved Markdown body, determine the next missing section or emit live body diagnostics at the cursor position.

MR-0002/ADR-0005 intentionally excluded a custom VS Code extension while tasks were sufficient. Context-sensitive body completion, hover, diagnostics and quick fixes show that tasks are no longer sufficient for this authoring surface. The existing task catalog remains valid for governed commands and repository mutations.

The same assistance is intended for the Governance Console web editor. Separate canonical rule implementations in VS Code and the web frontend would create competing sources and divergent diagnostics.

## Decision

ThreatForge adopts an editor-independent Markdown assistance core. The core receives document identity, repository-relative path, current unsaved text, cursor position and canonical document model projections. It returns completions, diagnostics, hover information and applicable quick fixes without modifying the document or repository.

The core identifies the applicable governed body profile, proposes the next missing required section, proposes controlled labels only in applicable controlled sections and reports missing, duplicate, unknown or out-of-order sections. It also reports invalid normative forms, invalid punctuation and divergence between mirrored registry and body values.

A dedicated VS Code extension or provider acts as a thin adapter over the shared core. A future Governance Console editor adapter consumes the same analysis contract. Editor adapters contain no canonical section inventories, value sets or validation rules.

The initial implementation uses the shared core directly without a Language Server. A future Language Server can wrap the same core while preserving the canonical analysis semantics.

## Consequences

- Benefit: Typing `##` can propose the next valid canonical section for the current body.
- Benefit: VS Code and the future web editor can emit equivalent diagnostics for identical document state.
- Cost: ThreatForge packages and maintains a dedicated thin VS Code integration.
- Risk: Adapter-specific transformations could cause divergent ranges or completion ordering.
- Constraint: The analysis core remains side-effect-free and consumes canonical model projections.

## Non-goals

- Automatic silent normalization of invalid controlled values
- Direct mutation of canonical registries from live body analysis
- Initial support for editors other than VS Code and the Governance Console

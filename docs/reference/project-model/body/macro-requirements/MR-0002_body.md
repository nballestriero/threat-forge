# MR-0002 — Authoring e implementazione governata

## Intent

Define a governed path from an existing Requirement to planned, created and verified implementation artifacts through deterministic core capabilities and thin development-environment adapters.

## Context

ThreatForge supports people and LLM consumers while they author governed Requirements and connect those Requirements to implementation and verification evidence. The core workflow remains independent from a specific editor, while Visual Studio Code is the first integrated authoring surface.

The repository runner, authoring tools, implementation planners, scaffolders and promotion controls form one governed workflow. Editor integrations collect input, invoke those capabilities and present their results without owning domain rules or bypassing repository gates.

## Macro obligation

- Every implementation artifact must derive from at least one existing governed Requirement.
- ThreatForge must keep domain rules and traceability rules inside governed core modules and tools.
- Development-environment adapters must remain thin consumers of governed capabilities.
- Requirement authoring must use canonical registries, controlled value sets and deterministic body profiles.
- Requirement creation must provide a complete preview before persistent repository changes.
- Persistent authoring operations must require explicit confirmation.
- Governed creation operations must preserve atomicity across registry and body updates.
- Governed creation operations must restore pre-operation state after verification failure.
- Implementation planning must remain read-only before artifact creation.
- Every implementation plan must identify the governing Requirement.
- Implementation scaffolding must create traceable artifacts with controlled lifecycle state.
- Implementation promotion must require completed source content and successful verification evidence.
- Implementation artifacts must declare bidirectional traceability to their linked Requirements.
- Repository commit and push operations must execute registered materializers and read-only gates before Git staging.
- Repository projection materialization must remain deterministic, bounded and idempotent.
- Direct ungoverned Git operations must not replace the governed repository runner.
- Visual Studio Code tasks must delegate to governed commands without duplicating canonical choices or validation logic.
- Future editor adapters must consume the same governed capabilities without changing the canonical core rules.
- The ThreatForge application must orchestrate the complete workflow without coupling the model to one editor or filesystem adapter.

## Scope

- Includes: governed Requirement authoring and deterministic previews
- Includes: implementation planning, scaffolding and promotion
- Includes: traceability between Requirements, source artifacts and verification evidence
- Includes: registered repository projections and governed commit-push operations
- Includes: thin Visual Studio Code integration
- Includes: future editor and application adapters over the same core capabilities
- Excludes: autonomous code generation without an existing governed Requirement
- Excludes: domain rules duplicated inside editor extensions
- Excludes: ungoverned automatic commit or push behavior
- Excludes: simultaneous initial support for every development environment

## Non-goals

- Complete ThreatForge application user interface in the initial authoring workflow
- Editor-specific ownership of canonical validation or controlled values
- Creation of implementation artifacts without governed planning and traceability

# MR-0010: Project Knowledge Governance Manual

## Purpose

Defines the study-oriented and operational manual that explains the threat-forge project knowledge governance system for students, developers, maintainers and LLM-assisted development workflows.

The manual must make the documentation model, graph model, code traceability rules, deterministic gates, contracts, child-project governance path and future threat-analysis roadmap understandable as a connected system.

## Scope

Includes:

- a modular long-form manual for learning and operating threat-forge;
- study paths for students and future thesis work;
- developer guidance for adding coherent code without duplicating decisions, requirements or graph semantics;
- diagram strategy for governance flows, graph relations, contracts, gate pipelines, code traceability and child-project execution;
- LLM reading routes for assisted development and semantic review;
- explanations of how canonical documentation, graph records, source code and deterministic gates prevent divergence.

## Out of Scope

Does not include:

- replacing ADR, requirement, graph, registry or contract records as canonical sources;
- implementing new runtime features by itself;
- executing LLM reviews or making LLM output blocking;
- replacing child-project governance, Knowledge Graph ingestion or threat-analysis execution;
- treating thesis-oriented explanatory prose as canonical governance unless promoted through ADR, requirements and graph records.

## Governance Notes

`MR-0010` is separate from `MR-0001` because governed documentation and traceability define canonical project-model mechanics, while this macro-requirement owns the educational, operational and LLM-readable manual layer built on top of those mechanics.

The manual is an explanation and learning surface. Canonical truth remains in governed registries, ADR bodies, requirement bodies, graph records, contracts, source-code JSDoc traceability and deterministic gate output. When the manual identifies a new rule, the rule must be promoted through the normal ADR/REQ/graph path before it becomes enforceable.

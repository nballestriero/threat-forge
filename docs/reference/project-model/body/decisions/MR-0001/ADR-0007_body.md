# ADR-0007 — Knowledge graph as GraphRAG and derived view substrate

## Status

Accepted.

## Context

The project model already uses graph records to connect macro requirements, ADRs, requirements, tools, and verification artifacts.

The graph is also becoming the best navigation structure for humans and LLMs. A handoff or LLM session should be able to start from a macro requirement, discover the relevant decisions, understand the derived requirements, inspect implementation artifacts, and identify verification gates without inventing relationships.

The project may need different graph views for different tasks: handoff, decision maps, RTM, validator coverage, LLM navigation, and future methodology-specific analysis.

If each view becomes its own source of truth, then the project will drift. If the canonical graph remains separate from derived views, then views can support exploration without changing governed semantics.

## Decision

The project knowledge graph is the canonical source for logical traceability relations.

The graph must support GraphRAG-like exploration by humans and LLMs. It must act as an explicit navigation substrate over governed sources, not as a free-form inference space.

Governed registries and body documents provide the controlled content. The graph provides traversal paths and relationships. LLM guidance must instruct models to use graph traversal and registry/body records instead of inventing missing relations.

The project may define multiple derived graph views. A derived view may filter, group, sort, label, or render canonical graph data for a specific purpose, but it must not introduce new facts that are absent from the canonical graph and governed registries.

Future graph view profiles should declare at least:

- view id;
- purpose;
- source graph records;
- included node types;
- included predicates;
- traversal direction;
- generated output path when applicable;
- whether the view is intended for humans, LLMs, validators, or RTM generation.

The LLM guide must become a governed document that explains how to navigate the project through working plan, registries, bodies, graph records, and derived views.

## Scope

In scope:

- declaring the knowledge graph as a GraphRAG-like exploration substrate;
- declaring derived graph views as non-canonical projections;
- declaring the need for a governed LLM guide;
- preserving the rule that file discovery should use registry/path fields instead of noisy physical-file graph arcs.

Out of scope:

- implementing graph view profiles in this step;
- implementing a GraphRAG engine in this step;
- adding methodology-specific STRIDE, PASTA, or STRIDE-AI views in this step;
- creating the LLM guide body in this step unless a later requirement authorizes it.

## Consequences

### Positive consequences

* Humans and LLMs get a deterministic project exploration path.
* Multiple task-specific views can be generated without duplicating canonical truth.
* The graph can support handoff, RTM, validator coverage, and future analysis workflows.
* LLMs can be instructed to follow explicit relationships rather than infer undocumented ones.

### Negative consequences

* Graph view profiles will need their own governance.
* Renderers and reports must distinguish canonical graph facts from derived presentation.
* Future validators must prevent derived views from becoming hidden sources of truth.

## Follow-up

1. Derive requirements for graph view profile governance.
2. Derive requirements for a governed LLM project navigation guide.
3. Define the minimum view profiles needed for handoff, RTM, and validator coverage.
4. Later, generate view artifacts under `artifacts/` as derived outputs.

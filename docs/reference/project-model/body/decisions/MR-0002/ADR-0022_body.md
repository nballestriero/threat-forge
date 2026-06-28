# ADR-0022 — Project Documentation Explorer taxonomy explanation boundary

## Status

Accepted.

## Context

The Project Documentation Explorer already exposes governed documentation records and filter facets, and the child-project governance-plan UI now uses registry-backed explanations for gate concepts. The same study-oriented pattern is needed for taxonomy records in the documentation page.

Taxonomy values are not only filter tokens. They define controlled meanings used by documentation, graph views, future Base Analysis records and methodology overlays. Showing only raw taxonomy ids makes the Explorer difficult to use as a study surface and encourages the frontend to hardcode explanations.

## Decision

MR-0002 shall expose taxonomy explanations through the Project Documentation Explorer backend view-model. Taxonomy detail payloads must include the taxonomy group id, display title, source registry path and normalized value explanations derived from the governed taxonomy registry.

Each taxonomy value explanation should preserve the raw id for traceability while exposing human-readable label, description, function, UI metadata and security-analysis hints when those fields exist in the registry. The frontend may choose how to present these fields, but it must not invent the semantic meaning of taxonomy values.

This decision keeps the Project Documentation Explorer read-only. It does not introduce taxonomy editing, dynamic taxonomy extension management, Base Analysis runtime/storage, gate execution or methodology-specific findings.

## Scope

In scope:

- Project Documentation Explorer taxonomy detail view-model enrichment;
- contract updates for taxonomy explanation payloads;
- filesystem source adapter and service normalization that preserve governed taxonomy metadata;
- frontend rendering of taxonomy values on taxonomy detail pages;
- search/filter support that can discover taxonomy records by value labels and descriptions when available.

Out of scope:

- editing taxonomy registries from the UI;
- adding dynamic taxonomy extension storage;
- Base Analysis, STRIDE or STRIDE-AI runtime records;
- changing existing governed taxonomy ids;
- replacing graph or registry governance checks;
- executor/orchestrator work.

## Consequences

### Positive consequences

* Project Documentation Explorer can teach what taxonomy values mean instead of showing only raw ids.
* Taxonomy detail pages become useful study material for future threat-analysis work.
* UI explanations remain synchronized with governed registry content.
* Future taxonomy improvements can flow through the same backend view-model pattern used for gate explanations.

### Negative consequences

* The Explorer detail payload grows for taxonomy records.
* The frontend must handle optional explanation fields gracefully because not all taxonomy records have every optional metadata block.
* Registry wording quality now directly affects UI clarity.

## Follow-up

1. Add taxonomy explanation fields to the Project Documentation Explorer contracts and service.
2. Render taxonomy value explanations in the document detail page.
3. Later, refine the taxonomy registry text and add page-level guidance for using taxonomy filters in threat-analysis study.

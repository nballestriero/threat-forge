# ADR-0023 — Project Documentation Explorer taxonomy field UX hierarchy

## Status

Accepted.

## Context

The Project Documentation Explorer now exposes taxonomy detail view-models and can render taxonomy value explanations. This makes taxonomy records more useful as study material, but the document-detail experience still needs a stable hierarchy for documents that contain taxonomy-backed fields.

Users must be able to inspect a requirement, ADR, taxonomy or other governed document without losing the main browsing context. Filters must remain easy to reach, the document list must remain below the filters, and the selected document detail must open below the list in the same page. Within that detail, taxonomy-backed fields must not appear only as raw enum values. A user must be able to see the current value, the source taxonomy, all allowed values and the meaning of each value.

The UI may use limited semantic color to improve readability, but the style must remain uniform with the existing Governance Console design system. Colors, badges and section patterns must be centralized or reused rather than hardcoded as one-off visual rules.

## Decision

The Project Documentation Explorer shall use a stable top-to-bottom hierarchy:

1. filters and search controls remain at the top;
2. the result list remains below the filters;
3. the selected document or taxonomy detail opens below the list in the same page;
4. the detail view presents summary information before deeper metadata;
5. taxonomy-backed fields show current value first, then allowed values and value descriptions;
6. raw ids and registry paths remain available as technical metadata, but they must not replace user-facing labels and explanations.

Taxonomy-backed document fields shall be rendered as explainable field groups. Each field group should expose:

- the field name and human label;
- the current value and its meaning;
- the source taxonomy id and a link or reference to the taxonomy detail when available;
- the complete list of allowed values for that taxonomy;
- description, function and security-analysis hints for each value when available;
- visual status indicators only through shared semantic styles.

The hierarchy must preserve the current Project Documentation Explorer navigation pattern. Opening a detail must not replace the page, hide the filters permanently, or require a separate route before the user can compare other documents.

## Scope

In scope:

- defining the Project Documentation Explorer taxonomy-field hierarchy;
- keeping filters at the top and details below the list;
- requiring current value plus allowed-value explanations for taxonomy-backed fields;
- defining raw ids as secondary technical metadata;
- allowing centralized semantic badges or colors when they improve readability.

Out of scope:

- implementing the UI in this decision-only micropasso;
- changing the taxonomy registry schema in this micropasso;
- adding taxonomy editing or dynamic taxonomy management;
- introducing a new route model for document details;
- changing the existing read-only Project Documentation Explorer access policy.

## Consequences

### Positive consequences

- Users can understand what taxonomy-backed fields mean while reading a document.
- Taxonomy values become study aids instead of opaque filter tokens.
- Filters, lists and details keep a predictable reading order.
- Future UI improvements can reuse the same hierarchy for requirements, ADRs, taxonomy records and child-project documentation.

### Negative consequences

- Document detail pages may become denser unless sections are progressively disclosed.
- The frontend must distinguish primary semantic explanations from technical metadata.
- The backend must continue to expose enough taxonomy metadata for the UI to avoid hardcoded meanings.

## Follow-up

1. Add requirements for stable list/detail hierarchy and taxonomy allowed-value rendering.
2. Implement document-detail field groups that show current taxonomy value and allowed values.
3. Reuse shared style tokens or shared components for semantic badges and status colors.
4. Continue refining taxonomy registry wording so the UI has useful explanation text to display.

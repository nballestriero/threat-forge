import { z } from "zod";

/**
 * @file Zod runtime contracts for the read-only Project Documentation Explorer view-models.
 *
 * @implementsRequirement MR-0002REQ-0028
 * @implementsRequirement MR-0002REQ-0030
 * @implementsRequirement MR-0002REQ-0031
 * @implementsRequirement MR-0002REQ-0034
 * @implementsRequirement MR-0002REQ-0035
 * @implementsRequirement MR-0002REQ-0036
 * @implementsRequirement MR-0002REQ-0037
 * @implementsRequirement MR-0002REQ-0055
 * @implementsRequirement MR-0002REQ-0056
 * @implementsRequirement MR-0002REQ-0058
 * @derivedFromDecision MR-0002/ADR-0007
 * @derivedFromDecision MR-0002/ADR-0008
 * @derivedFromDecision MR-0002/ADR-0009
 * @macroRequirement MR-0002
 *
 * These contracts define frontend-safe read-only payloads for browsing governed
 * documentation, requirements, ADR, macro requirements, taxonomies and graph-backed
 * implementation state. They intentionally expose governed identifiers and source
 * references as traceability metadata, not as instructions for React components to
 * read YAML, Markdown, Git, the filesystem, registry files or graph files directly.
 *
 * Side effects: none. This module only exports Zod schemas, constants and parser
 * helpers. It does not read repository sources, perform authorization decisions,
 * start HTTP listeners, mutate project-model files, generate pages, or implement
 * Base Analysis runtime/storage.
 */

export const projectDocumentationExplorerCapabilities = Object.freeze({
  read: "project_model.documentation.read",
  filter: "project_model.documentation.filter",
  viewDetail: "project_model.documentation.view_detail",
});

export const entityKindSchema = z.enum([
  "macro_requirement",
  "requirement",
  "adr",
  "taxonomy",
  "graph_node",
  "document",
]);

export const implementationStateSchema = z.enum([
  "implemented",
  "partially_implemented",
  "not_implemented",
  "not_applicable",
  "unknown",
]);

export const acceptanceStateSchema = z.enum([
  "accepted",
  "not_accepted",
  "not_applicable",
  "unknown",
]);

export const sourceReferenceSchema = z.object({
  kind: z.enum(["registry", "body", "graph", "taxonomy", "derived"]),
  path: z.string().min(1).optional(),
  id: z.string().min(1).optional(),
});


export const taxonomyValueExplanationSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  function: z.string().min(1).optional(),
  ui: z.record(z.unknown()).optional(),
  security_analysis: z.record(z.unknown()).optional(),
});

export const taxonomyDetailViewModelSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  source_path: z.string().min(1).optional(),
  value_count: z.number().int().nonnegative(),
  values: z.array(taxonomyValueExplanationSchema),
});


export const taxonomyFieldValueExplanationSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  function: z.string().min(1).optional(),
  current: z.boolean().default(false),
  ui: z.record(z.unknown()).optional(),
  security_analysis: z.record(z.unknown()).optional(),
});

export const taxonomyFieldExplanationSchema = z.object({
  field: z.string().min(1),
  label: z.string().min(1),
  current_value: taxonomyFieldValueExplanationSchema.nullable().default(null),
  allowed_values: z.array(taxonomyFieldValueExplanationSchema),
  source: z.enum(["contract", "registry", "derived", "observed"]),
  source_taxonomy: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
});

export const accessDecisionSchema = z.object({
  authenticated: z.boolean(),
  role: z.string().min(1).optional(),
  allowed: z.boolean(),
  required_capability: z.string().min(1),
  capabilities: z.array(z.string().min(1)),
});

export const documentationQuerySchema = z.object({
  mr: z.array(z.string().min(1)).default([]),
  kind: z.array(entityKindSchema).default([]),
  status: z.array(z.string().min(1)).default([]),
  requirement_type: z.array(z.string().min(1)).default([]),
  implementation_state: z.array(implementationStateSchema).default([]),
  acceptance_state: z.array(acceptanceStateSchema).default([]),
  q: z.string().default(""),
});

export const filterValueSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  count: z.number().int().nonnegative(),
  description: z.string().optional(),
  selected: z.boolean().default(false),
});

export const filterFacetSchema = z.object({
  id: z.enum([
    "mr",
    "kind",
    "status",
    "requirement_type",
    "implementation_state",
    "acceptance_state",
  ]),
  label: z.string().min(1),
  source: z.enum(["registry", "graph", "derived", "policy"]),
  values: z.array(filterValueSchema),
});

export const documentationItemSchema = z.object({
  id: z.string().min(1),
  local_id: z.string().min(1).optional(),
  kind: entityKindSchema,
  title: z.string().min(1),
  taxonomy_group_id: z.string().min(1).optional(),
  taxonomy_value_count: z.number().int().nonnegative().optional(),
  macro_requirement_id: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  requirement_type: z.string().min(1).optional(),
  decision_type: z.string().min(1).optional(),
  priority: z.string().min(1).optional(),
  implementation_state: implementationStateSchema,
  acceptance_state: acceptanceStateSchema,
  related_requirement_ids: z.array(z.string().min(1)).default([]),
  related_adr_ids: z.array(z.string().min(1)).default([]),
  source_references: z.array(sourceReferenceSchema).default([]),
});

export const documentationBodyViewModelSchema = z.object({
  format: z.literal("markdown"),
  path: z.string().min(1),
  content_markdown: z.string(),
  available: z.boolean(),
  missing_reason: z.string().min(1).optional(),
});

export const documentationSummarySchema = z.object({
  total_items: z.number().int().nonnegative(),
  filtered_items: z.number().int().nonnegative(),
  counts_by_kind: z.record(z.number().int().nonnegative()),
});

export const documentationExplorerViewModelSchema = z.object({
  access: accessDecisionSchema,
  query: documentationQuerySchema,
  summary: documentationSummarySchema,
  filters: z.array(filterFacetSchema),
  items: z.array(documentationItemSchema),
});

export const documentationFiltersViewModelSchema = z.object({
  access: accessDecisionSchema,
  query: documentationQuerySchema,
  filters: z.array(filterFacetSchema),
});

export const documentationDetailViewModelSchema = z.object({
  access: accessDecisionSchema,
  item: documentationItemSchema,
  incoming_relations: z.array(z.object({
    subject: z.string().min(1),
    predicate: z.string().min(1),
    object: z.string().min(1),
  })).default([]),
  outgoing_relations: z.array(z.object({
    subject: z.string().min(1),
    predicate: z.string().min(1),
    object: z.string().min(1),
  })).default([]),
  body: documentationBodyViewModelSchema.nullable().default(null),
  taxonomy: taxonomyDetailViewModelSchema.nullable().default(null),
  taxonomy_fields: z.array(taxonomyFieldExplanationSchema).default([]),
});

export const documentationRouteDescriptorSchema = z.object({
  method: z.enum(["GET"]),
  path: z.string().min(1),
  required_capability: z.string().min(1),
  description: z.string().min(1),
});

/**
 * Validates a Project Documentation Explorer collection payload.
 *
 * @param {unknown} payload - Candidate payload to validate.
 * @returns {z.infer<typeof documentationExplorerViewModelSchema>} Parsed view-model.
 */
export function parseDocumentationExplorerViewModel(payload) {
  return documentationExplorerViewModelSchema.parse(payload);
}

/**
 * Validates a Project Documentation Explorer filter payload.
 *
 * @param {unknown} payload - Candidate payload to validate.
 * @returns {z.infer<typeof documentationFiltersViewModelSchema>} Parsed view-model.
 */
export function parseDocumentationFiltersViewModel(payload) {
  return documentationFiltersViewModelSchema.parse(payload);
}

/**
 * Validates a Project Documentation Explorer detail payload.
 *
 * @param {unknown} payload - Candidate payload to validate.
 * @returns {z.infer<typeof documentationDetailViewModelSchema>} Parsed view-model.
 */
export function parseDocumentationDetailViewModel(payload) {
  return documentationDetailViewModelSchema.parse(payload);
}

import { z } from "zod";

/**
 * @file Runtime contracts and read-model schemas for child project management.
 *
 * @implementsRequirement MR-0003REQ-0025
 * @implementsRequirement MR-0003REQ-0026
 * @derivedFromDecision MR-0003/ADR-0005
 * @macroRequirement MR-0003
 *
 * These contracts define the backend-facing and UI-safe shapes used to manage
 * child project operational state in threat-forge. They describe child project
 * records, repository locations, governance profiles, check runs, gate results
 * and violations without making SQLite part of the domain model. The canonical
 * ADR, Requirement, macro-requirement, body and graph sources remain in each
 * child project's standard Project Model; these schemas only model platform
 * state derived from registration and validation operations.
 *
 * Side effects: none. This module only exports Zod schemas, capability names and
 * parser helpers. It does not open databases, read Git repositories, run Project
 * Model validators, mutate child-project documentation, perform authorization
 * decisions, expose HTTP routes, generate skeletons, or implement RBAC runtime.
 */

export const childProjectManagementCapabilities = Object.freeze({
  list: "child_projects.list",
  read: "child_projects.read",
  register: "child_projects.register",
  recordCheckRun: "child_projects.record_check_run",
  viewOperationalState: "child_projects.view_operational_state",
});

export const childProjectIdSchema = z.string().min(1).regex(/^[a-z0-9][a-z0-9._-]*$/u);

export const childProjectRepositoryKindSchema = z.enum(["git", "local"]);

export const childProjectGateStatusSchema = z.enum([
  "pass",
  "fail",
  "warning",
  "skipped",
  "reserved",
  "unknown",
]);

export const childProjectViolationSeveritySchema = z.enum([
  "blocking",
  "warning",
  "info",
]);

export const threatAnalysisPreCodePolicySchema = z.enum([
  "reserved",
  "required",
  "disabled",
]);

export const childProjectRepositoryLocationSchema = z.object({
  kind: childProjectRepositoryKindSchema,
  url: z.string().min(1).nullable().default(null),
  local_path: z.string().min(1).nullable().default(null),
  default_branch: z.string().min(1).default("master"),
});

export const childProjectModelProfileSchema = z.object({
  root: z.string().min(1).default("docs/reference/project-model"),
  governance_profile: z.string().min(1).default("threat-forge-standard-child-project"),
});

export const childProjectLifecyclePolicySchema = z.object({
  document_first_required: z.boolean().default(true),
  code_traceability_required: z.boolean().default(true),
  threat_analysis_pre_code_required: threatAnalysisPreCodePolicySchema.default("reserved"),
  governed_commit_push_required: z.boolean().default(true),
  direct_push_allowed: z.boolean().default(false),
});

export const childProjectRecordSchema = z.object({
  id: childProjectIdSchema,
  name: z.string().min(1),
  repository: childProjectRepositoryLocationSchema,
  project_model: childProjectModelProfileSchema.default({}),
  lifecycle_policy: childProjectLifecyclePolicySchema.default({}),
  archived: z.boolean().default(false),
  created_at: z.string().min(1).nullable().default(null),
  updated_at: z.string().min(1).nullable().default(null),
});

export const childProjectGateResultSchema = z.object({
  gate_name: z.string().min(1),
  status: childProjectGateStatusSchema,
  summary: z.string().default(""),
});

export const childProjectViolationSchema = z.object({
  gate_name: z.string().min(1),
  severity: childProjectViolationSeveritySchema,
  code: z.string().min(1),
  path: z.string().min(1).nullable().default(null),
  message: z.string().min(1),
});

export const childProjectCheckRunSchema = z.object({
  id: z.string().min(1),
  child_project_id: childProjectIdSchema,
  checked_at: z.string().min(1),
  repository_head: z.string().min(1).nullable().default(null),
  branch: z.string().min(1).nullable().default(null),
  overall_status: childProjectGateStatusSchema,
  gate_results: z.array(childProjectGateResultSchema).default([]),
  violations: z.array(childProjectViolationSchema).default([]),
});

export const childProjectOperationalStateSchema = z.object({
  child_project: childProjectRecordSchema,
  latest_check_run: childProjectCheckRunSchema.nullable().default(null),
});

export const childProjectOperationalStateListSchema = z.object({
  capabilities: z.array(z.string().min(1)).default([]),
  items: z.array(childProjectOperationalStateSchema).default([]),
});

export const childProjectManagementRouteDescriptorSchema = z.object({
  method: z.enum(["GET"]),
  path: z.string().min(1),
  required_capability: z.string().min(1),
  description: z.string().min(1),
});

/**
 * Validates a child project management record.
 *
 * @param {unknown} payload - Candidate child project record.
 * @returns {z.infer<typeof childProjectRecordSchema>} Parsed child project record.
 */
export function parseChildProjectRecord(payload) {
  return childProjectRecordSchema.parse(payload);
}

/**
 * Validates a child project check-run record.
 *
 * @param {unknown} payload - Candidate child project check run.
 * @returns {z.infer<typeof childProjectCheckRunSchema>} Parsed child project check run.
 */
export function parseChildProjectCheckRun(payload) {
  return childProjectCheckRunSchema.parse(payload);
}

/**
 * Validates a child project operational state read model.
 *
 * @param {unknown} payload - Candidate operational state.
 * @returns {z.infer<typeof childProjectOperationalStateSchema>} Parsed operational state.
 */
export function parseChildProjectOperationalState(payload) {
  return childProjectOperationalStateSchema.parse(payload);
}

/**
 * Validates a child project operational state list read model.
 *
 * @param {unknown} payload - Candidate operational state list.
 * @returns {z.infer<typeof childProjectOperationalStateListSchema>} Parsed operational state list.
 */
export function parseChildProjectOperationalStateList(payload) {
  return childProjectOperationalStateListSchema.parse(payload);
}

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  parseChildProjectCheckRun,
  parseChildProjectRecord,
} from "../child-project-management.contract.mjs";
import { assertChildProjectStorePort } from "../ports/child-project-store.port.mjs";

/**
 * @file SQLite-backed ChildProjectStorePort adapter.
 *
 * @implementsRequirement MR-0003REQ-0024
 * @implementsRequirement MR-0003REQ-0025
 * @implementsRequirement MR-0003REQ-0026
 * @derivedFromDecision MR-0003/ADR-0005
 * @macroRequirement MR-0003
 *
 * This adapter persists child project management operational state in SQLite
 * while preserving the Controller → Service → Port → Adapter boundary selected
 * for MR-0003. SQLite is an initial replaceable adapter: callers depend on the
 * ChildProjectStorePort shape, not on SQL statements, tables or node:sqlite.
 * Canonical child project ADR, Requirement, macro-requirement, body, taxonomy
 * and graph records remain in each child repository's standard Project Model.
 *
 * Side effects: opens or creates the configured SQLite database file, creates
 * child-project management tables when missing, enables foreign keys, and
 * reads/writes child project records, check runs, gate results and violations.
 * It does not read child repositories, run validators, mutate Project Model
 * files, generate child project skeletons, clone Git repositories, perform
 * commit/push operations, expose HTTP routes, or implement RBAC authorization.
 */

const inMemoryDatabasePath = ":memory:";

/**
 * @typedef {import("../ports/child-project-store.port.mjs").ChildProjectStorePort} ChildProjectStorePort
 * @typedef {import("../ports/child-project-store.port.mjs").ChildProjectRecord} ChildProjectRecord
 * @typedef {import("../ports/child-project-store.port.mjs").ChildProjectCheckRun} ChildProjectCheckRun
 *
 * @typedef {object} SqliteChildProjectStoreOptions
 * @property {string} [databasePath] SQLite database path, or `:memory:`.
 * @property {() => string} [now] Clock function returning an ISO-like timestamp.
 */

/**
 * Creates the parent directory for a file-backed SQLite database.
 *
 * @param {string} databasePath - SQLite database path.
 * @returns {void}
 */
function ensureDatabaseDirectory(databasePath) {
  if (!databasePath || databasePath === inMemoryDatabasePath) return;
  const databaseDirectory = path.dirname(path.resolve(databasePath));
  fs.mkdirSync(databaseDirectory, { recursive: true });
}

/**
 * Converts a boolean value into an SQLite integer flag.
 *
 * @param {boolean} value - Boolean value.
 * @returns {0|1} SQLite integer flag.
 */
function booleanToSqliteFlag(value) {
  return value ? 1 : 0;
}

/**
 * Converts an SQLite integer flag into a boolean value.
 *
 * @param {unknown} value - SQLite integer flag.
 * @returns {boolean} Boolean value.
 */
function sqliteFlagToBoolean(value) {
  return Number(value) === 1;
}

/**
 * Maps a SQLite child_projects row to the domain-facing child project record.
 *
 * @param {Record<string, unknown>} row - SQLite row.
 * @returns {ChildProjectRecord} Parsed child project record.
 */
function childProjectFromRow(row) {
  return parseChildProjectRecord({
    id: row.id,
    name: row.name,
    repository: {
      kind: row.repository_kind,
      url: row.repository_url,
      local_path: row.repository_local_path,
      default_branch: row.default_branch,
    },
    project_model: {
      root: row.project_model_root,
      governance_profile: row.governance_profile,
    },
    lifecycle_policy: {
      document_first_required: sqliteFlagToBoolean(row.document_first_required),
      code_traceability_required: sqliteFlagToBoolean(row.code_traceability_required),
      threat_analysis_pre_code_required: row.threat_analysis_pre_code_required,
      governed_commit_push_required: sqliteFlagToBoolean(row.governed_commit_push_required),
      direct_push_allowed: sqliteFlagToBoolean(row.direct_push_allowed),
    },
    archived: sqliteFlagToBoolean(row.archived),
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

/**
 * Maps a SQLite child_project_check_runs row and child records to a check run.
 *
 * @param {Record<string, unknown>} row - SQLite check-run row.
 * @param {Record<string, unknown>[]} gateRows - SQLite gate result rows.
 * @param {Record<string, unknown>[]} violationRows - SQLite violation rows.
 * @returns {ChildProjectCheckRun} Parsed check run.
 */
function childProjectCheckRunFromRows(row, gateRows, violationRows) {
  return parseChildProjectCheckRun({
    id: row.id,
    child_project_id: row.child_project_id,
    checked_at: row.checked_at,
    repository_head: row.repository_head,
    branch: row.branch,
    overall_status: row.overall_status,
    gate_results: gateRows.map((gateRow) => ({
      gate_name: gateRow.gate_name,
      status: gateRow.status,
      summary: gateRow.summary ?? "",
    })),
    violations: violationRows.map((violationRow) => ({
      gate_name: violationRow.gate_name,
      severity: violationRow.severity,
      code: violationRow.code,
      path: violationRow.path,
      message: violationRow.message,
    })),
  });
}

/**
 * Creates or updates the SQLite schema required by the adapter.
 *
 * @param {DatabaseSync} database - Open SQLite database.
 * @returns {void}
 */
function migrate(database) {
  database.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS child_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      repository_kind TEXT NOT NULL,
      repository_url TEXT,
      repository_local_path TEXT,
      default_branch TEXT NOT NULL,
      project_model_root TEXT NOT NULL,
      governance_profile TEXT NOT NULL,
      document_first_required INTEGER NOT NULL,
      code_traceability_required INTEGER NOT NULL,
      threat_analysis_pre_code_required TEXT NOT NULL,
      governed_commit_push_required INTEGER NOT NULL,
      direct_push_allowed INTEGER NOT NULL,
      archived INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS child_project_check_runs (
      id TEXT PRIMARY KEY,
      child_project_id TEXT NOT NULL,
      checked_at TEXT NOT NULL,
      repository_head TEXT,
      branch TEXT,
      overall_status TEXT NOT NULL,
      FOREIGN KEY(child_project_id) REFERENCES child_projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_child_project_check_runs_child_project_checked_at
      ON child_project_check_runs(child_project_id, checked_at DESC, id DESC);

    CREATE TABLE IF NOT EXISTS child_project_gate_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_run_id TEXT NOT NULL,
      gate_name TEXT NOT NULL,
      status TEXT NOT NULL,
      summary TEXT NOT NULL,
      FOREIGN KEY(check_run_id) REFERENCES child_project_check_runs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS child_project_violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_run_id TEXT NOT NULL,
      gate_name TEXT NOT NULL,
      severity TEXT NOT NULL,
      code TEXT NOT NULL,
      path TEXT,
      message TEXT NOT NULL,
      FOREIGN KEY(check_run_id) REFERENCES child_project_check_runs(id) ON DELETE CASCADE
    );
  `);
}

/**
 * Creates a SQLite-backed implementation of ChildProjectStorePort.
 *
 * @param {SqliteChildProjectStoreOptions} [options] - Adapter options.
 * @returns {ChildProjectStorePort & {close: () => void}} SQLite store adapter.
 */
export function createSqliteChildProjectStore(options = {}) {
  const databasePath = options.databasePath ?? inMemoryDatabasePath;
  const now = options.now ?? (() => new Date().toISOString());

  ensureDatabaseDirectory(databasePath);
  const database = new DatabaseSync(databasePath);
  migrate(database);

  /**
   * Reads gate result rows for a check run.
   *
   * @param {string} checkRunId - Check run identifier.
   * @returns {Record<string, unknown>[]} Gate result rows.
   */
  function selectGateResultRows(checkRunId) {
    return database.prepare(`
      SELECT gate_name, status, summary
      FROM child_project_gate_results
      WHERE check_run_id = ?
      ORDER BY id ASC
    `).all(checkRunId);
  }

  /**
   * Reads violation rows for a check run.
   *
   * @param {string} checkRunId - Check run identifier.
   * @returns {Record<string, unknown>[]} Violation rows.
   */
  function selectViolationRows(checkRunId) {
    return database.prepare(`
      SELECT gate_name, severity, code, path, message
      FROM child_project_violations
      WHERE check_run_id = ?
      ORDER BY id ASC
    `).all(checkRunId);
  }

  /**
   * Reads a full check run by id.
   *
   * @param {string} checkRunId - Check run identifier.
   * @returns {ChildProjectCheckRun|null} Full check run or null.
   */
  function getCheckRunById(checkRunId) {
    const row = database.prepare(`
      SELECT id, child_project_id, checked_at, repository_head, branch, overall_status
      FROM child_project_check_runs
      WHERE id = ?
    `).get(checkRunId);
    if (!row) return null;
    return childProjectCheckRunFromRows(row, selectGateResultRows(checkRunId), selectViolationRows(checkRunId));
  }

  /**
   * Reads the latest check run for a child project.
   *
   * @param {string} childProjectId - Child project identifier.
   * @returns {ChildProjectCheckRun|null} Latest check run or null.
   */
  function getLatestCheckRunForChildProject(childProjectId) {
    const row = database.prepare(`
      SELECT id
      FROM child_project_check_runs
      WHERE child_project_id = ?
      ORDER BY checked_at DESC, id DESC
      LIMIT 1
    `).get(childProjectId);
    return row ? getCheckRunById(String(row.id)) : null;
  }

  const adapter = {
    async listChildProjects() {
      return database.prepare(`
        SELECT *
        FROM child_projects
        ORDER BY id ASC
      `).all().map(childProjectFromRow);
    },

    async getChildProject(childProjectId) {
      const row = database.prepare(`
        SELECT *
        FROM child_projects
        WHERE id = ?
      `).get(childProjectId);
      return row ? childProjectFromRow(row) : null;
    },

    async saveChildProject(childProject) {
      const parsed = parseChildProjectRecord(childProject);
      const existing = database.prepare("SELECT created_at FROM child_projects WHERE id = ?").get(parsed.id);
      const timestamp = now();
      const createdAt = parsed.created_at ?? existing?.created_at ?? timestamp;
      const updatedAt = timestamp;

      database.prepare(`
        INSERT INTO child_projects (
          id,
          name,
          repository_kind,
          repository_url,
          repository_local_path,
          default_branch,
          project_model_root,
          governance_profile,
          document_first_required,
          code_traceability_required,
          threat_analysis_pre_code_required,
          governed_commit_push_required,
          direct_push_allowed,
          archived,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          repository_kind = excluded.repository_kind,
          repository_url = excluded.repository_url,
          repository_local_path = excluded.repository_local_path,
          default_branch = excluded.default_branch,
          project_model_root = excluded.project_model_root,
          governance_profile = excluded.governance_profile,
          document_first_required = excluded.document_first_required,
          code_traceability_required = excluded.code_traceability_required,
          threat_analysis_pre_code_required = excluded.threat_analysis_pre_code_required,
          governed_commit_push_required = excluded.governed_commit_push_required,
          direct_push_allowed = excluded.direct_push_allowed,
          archived = excluded.archived,
          updated_at = excluded.updated_at
      `).run(
        parsed.id,
        parsed.name,
        parsed.repository.kind,
        parsed.repository.url,
        parsed.repository.local_path,
        parsed.repository.default_branch,
        parsed.project_model.root,
        parsed.project_model.governance_profile,
        booleanToSqliteFlag(parsed.lifecycle_policy.document_first_required),
        booleanToSqliteFlag(parsed.lifecycle_policy.code_traceability_required),
        parsed.lifecycle_policy.threat_analysis_pre_code_required,
        booleanToSqliteFlag(parsed.lifecycle_policy.governed_commit_push_required),
        booleanToSqliteFlag(parsed.lifecycle_policy.direct_push_allowed),
        booleanToSqliteFlag(parsed.archived),
        createdAt,
        updatedAt,
      );

      const saved = await adapter.getChildProject(parsed.id);
      if (!saved) throw new Error(`Failed to save child project '${parsed.id}'.`);
      return saved;
    },

    async saveChildProjectCheckRun(checkRun) {
      const parsed = parseChildProjectCheckRun(checkRun);
      database.exec("BEGIN");
      try {
        database.prepare(`
          INSERT INTO child_project_check_runs (
            id,
            child_project_id,
            checked_at,
            repository_head,
            branch,
            overall_status
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            child_project_id = excluded.child_project_id,
            checked_at = excluded.checked_at,
            repository_head = excluded.repository_head,
            branch = excluded.branch,
            overall_status = excluded.overall_status
        `).run(
          parsed.id,
          parsed.child_project_id,
          parsed.checked_at,
          parsed.repository_head,
          parsed.branch,
          parsed.overall_status,
        );

        database.prepare("DELETE FROM child_project_gate_results WHERE check_run_id = ?").run(parsed.id);
        database.prepare("DELETE FROM child_project_violations WHERE check_run_id = ?").run(parsed.id);

        const insertGateResult = database.prepare(`
          INSERT INTO child_project_gate_results (check_run_id, gate_name, status, summary)
          VALUES (?, ?, ?, ?)
        `);
        for (const gateResult of parsed.gate_results) {
          insertGateResult.run(parsed.id, gateResult.gate_name, gateResult.status, gateResult.summary);
        }

        const insertViolation = database.prepare(`
          INSERT INTO child_project_violations (check_run_id, gate_name, severity, code, path, message)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const violation of parsed.violations) {
          insertViolation.run(
            parsed.id,
            violation.gate_name,
            violation.severity,
            violation.code,
            violation.path,
            violation.message,
          );
        }

        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }

      const saved = getCheckRunById(parsed.id);
      if (!saved) throw new Error(`Failed to save child project check run '${parsed.id}'.`);
      return saved;
    },

    async listChildProjectOperationalStates() {
      const childProjects = await adapter.listChildProjects();
      return childProjects.map((childProject) => ({
        child_project: childProject,
        latest_check_run: getLatestCheckRunForChildProject(childProject.id),
      }));
    },

    close() {
      database.close();
    },
  };

  return /** @type {ChildProjectStorePort & {close: () => void}} */ (assertChildProjectStorePort(adapter));
}

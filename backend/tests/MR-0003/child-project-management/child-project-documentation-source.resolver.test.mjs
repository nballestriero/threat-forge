import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveChildProjectDocumentationSource } from "../../../src/MR-0003/child-project-management/child-project-documentation-source.resolver.mjs";
import { createChildProjectManagementService } from "../../../src/MR-0003/child-project-management/child-project-management.service.mjs";

/**
 * @file Runtime tests for registered child project documentation source resolution.
 *
 * @verifiesRequirement MR-0003REQ-0066
 * @verifiesRequirement MR-0003REQ-0067
 * @derivedFromDecision MR-0003/ADR-0014
 * @macroRequirement MR-0003
 *
 * These tests cover the backend resolver that derives Project Documentation
 * Explorer source metadata from registered child project records. They use
 * temporary directories and in-memory store fixtures only. They do not start
 * backend servers, read governed Project Model content, mutate child repositories,
 * write SQLite state, clone Git repositories, or fall back to platform documents.
 */

/**
 * Creates a temporary child project workspace with a standard Project Model root.
 *
 * @returns {{repositoryRoot: string, childLocalPath: string, cleanup(): void}} Fixture paths.
 */
function createChildProjectWorkspaceFixture() {
  const repositoryRoot = path.join(tmpdir(), `tf-child-doc-source-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const childLocalPath = "workspaces/example-child";
  mkdirSync(path.join(repositoryRoot, childLocalPath, "docs/reference/project-model"), { recursive: true });
  return {
    repositoryRoot,
    childLocalPath,
    cleanup() {
      rmSync(repositoryRoot, { recursive: true, force: true });
    },
  };
}

/**
 * Creates a small in-memory child project store for service-level tests.
 *
 * @param {Record<string, unknown>} childProject - Child project record to expose.
 * @returns {Record<string, Function>} Store port shape.
 */
function createStoreWithChildProject(childProject) {
  return {
    async listChildProjects() { return [childProject]; },
    async getChildProject(childProjectId) { return childProjectId === childProject.id ? childProject : null; },
    async saveChildProject(nextChildProject) { return nextChildProject; },
    async saveChildProjectCheckRun(checkRun) { return checkRun; },
    async listChildProjectOperationalStates() {
      return [{ child_project: childProject, latest_check_run: null }];
    },
  };
}

test("resolves a registered local child Project Model source", () => {
  const fixture = createChildProjectWorkspaceFixture();
  try {
    const source = resolveChildProjectDocumentationSource({
      repositoryRoot: fixture.repositoryRoot,
      childProject: {
        id: "example-child",
        name: "Example Child",
        repository: { kind: "local", local_path: fixture.childLocalPath },
        project_model: { root: "docs/reference/project-model" },
      },
    });

    assert.equal(source.status, "available");
    assert.equal(source.source_type, "filesystem");
    assert.equal(source.repository_local_path, "workspaces/example-child");
    assert.equal(source.project_model_root, "docs/reference/project-model");
    assert.match(source.message, /can be served/u);
  } finally {
    fixture.cleanup();
  }
});

test("keeps missing and unsupported child documentation sources explicit", () => {
  const missingLocalPath = resolveChildProjectDocumentationSource({
    childProject: {
      id: "missing-local-path",
      name: "Missing Local Path",
      repository: { kind: "local" },
    },
  });
  const gitRepository = resolveChildProjectDocumentationSource({
    childProject: {
      id: "git-child",
      name: "Git Child",
      repository: { kind: "git", url: "https://example.invalid/git-child.git" },
    },
  });

  assert.equal(missingLocalPath.status, "unconfigured");
  assert.equal(missingLocalPath.source_type, "filesystem");
  assert.equal(gitRepository.status, "unsupported");
  assert.equal(gitRepository.source_type, null);
});

test("fails closed when the Project Model root escapes the child workspace", () => {
  const source = resolveChildProjectDocumentationSource({
    repositoryRoot: "/tmp/platform",
    requireExistingProjectModel: false,
    childProject: {
      id: "escaping-child",
      name: "Escaping Child",
      repository: { kind: "local", local_path: "workspaces/escaping-child" },
      project_model: { root: "../docs/reference/project-model" },
    },
  });

  assert.equal(source.status, "unavailable");
  assert.match(source.message, /outside the registered child workspace/u);
});

test("adds documentation source metadata to registered child project read models", async () => {
  const fixture = createChildProjectWorkspaceFixture();
  try {
    const childProject = {
      id: "example-child",
      name: "Example Child",
      repository: { kind: "local", local_path: fixture.childLocalPath },
      project_model: { root: "docs/reference/project-model" },
    };
    const service = createChildProjectManagementService({
      storePort: createStoreWithChildProject(childProject),
      repositoryRoot: fixture.repositoryRoot,
    });

    const list = await service.listOperationalStates({ principal: { authenticated: true } });
    const detail = await service.getOperationalState({ childProjectId: "example-child" });

    assert.equal(list.items[0].child_project.documentation_source.status, "available");
    assert.equal(detail?.child_project.documentation_source.source_type, "filesystem");
  } finally {
    fixture.cleanup();
  }
});

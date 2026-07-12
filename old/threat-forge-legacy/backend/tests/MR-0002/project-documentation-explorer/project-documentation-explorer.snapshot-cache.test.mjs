import assert from "node:assert/strict";
import test from "node:test";

import { createProjectDocumentationExplorerSnapshotCacheSourcePort } from "../../../src/MR-0002/project-documentation-explorer/project-documentation-explorer.snapshot-cache.mjs";

/**
 * @typedef {import("../../../src/MR-0002/project-documentation-explorer/project-model-source.port.mjs").ProjectModelSourcePort} ProjectModelSourcePort
 * @typedef {import("../../../src/MR-0002/project-documentation-explorer/project-model-source.port.mjs").ProjectModelSourceSnapshot} ProjectModelSourceSnapshot
 */

/**
 * @file Tests for the Project Documentation Explorer snapshot cache source-port decorator.
 *
 * @verifiesRequirement MR-0002REQ-0052
 * @derivedFromDecision MR-0002/ADR-0019
 * @macroRequirement MR-0002
 *
 * These tests verify the optional TTL-based snapshot cache without reading
 * governed sources from disk, starting HTTP listeners, introducing file watchers,
 * serving stale data on reload failure, mutating project-model files, or using
 * external cache dependencies.
 */


/**
 * Creates a minimal type-checked source snapshot fixture.
 *
 * @param {string} id - Snapshot marker stored in macroRequirements.
 * @returns {ProjectModelSourceSnapshot} Snapshot fixture.
 */
function createSnapshotFixture(id) {
  return {
    macroRequirements: [{ id }],
    requirements: [],
    decisions: [],
    taxonomies: [],
    graphNodes: [],
    graphRelations: [],
  };
}

/**
 * Creates a counted source-port fixture.
 *
 * @param {Array<ProjectModelSourceSnapshot|Error>} results - Sequential load results.
 * @returns {{port: ProjectModelSourcePort, calls: {loadSnapshot: number, loadBodyContent: number}}} Fixture.
 */
function createCountedSourcePort(results) {
  const queue = [...results];
  const calls = { loadSnapshot: 0, loadBodyContent: 0 };
  /** @type {ProjectModelSourcePort} */
  const port = {
    async loadSnapshot() {
      calls.loadSnapshot += 1;
      const next = queue.shift() ?? createSnapshotFixture(`snapshot-${calls.loadSnapshot}`);
      if (next instanceof Error) throw next;
      return next;
    },
    async loadBodyContent(projectPath) {
      calls.loadBodyContent += 1;
      return `body:${projectPath}`;
    },
  };
  return { port, calls };
}

test("keeps snapshot caching disabled when TTL is zero", async () => {
  const { port, calls } = createCountedSourcePort([createSnapshotFixture("first"), createSnapshotFixture("second")]);
  const cachedPort = createProjectDocumentationExplorerSnapshotCacheSourcePort(port, { ttlMs: 0 });

  assert.deepEqual(await cachedPort.loadSnapshot(), createSnapshotFixture("first"));
  assert.deepEqual(await cachedPort.loadSnapshot(), createSnapshotFixture("second"));
  assert.equal(calls.loadSnapshot, 2);
});

test("reuses a loaded snapshot while the configured TTL is active", async () => {
  let nowMs = 1_000;
  const { port, calls } = createCountedSourcePort([createSnapshotFixture("first"), createSnapshotFixture("second")]);
  const cachedPort = createProjectDocumentationExplorerSnapshotCacheSourcePort(port, {
    ttlMs: 500,
    now: () => nowMs,
  });

  const first = await cachedPort.loadSnapshot();
  nowMs = 1_250;
  const second = await cachedPort.loadSnapshot();

  assert.equal(first, second);
  assert.deepEqual(second, createSnapshotFixture("first"));
  assert.equal(calls.loadSnapshot, 1);
});

test("reloads a snapshot after the configured TTL expires", async () => {
  let nowMs = 1_000;
  const { port, calls } = createCountedSourcePort([createSnapshotFixture("first"), createSnapshotFixture("second")]);
  const cachedPort = createProjectDocumentationExplorerSnapshotCacheSourcePort(port, {
    ttlMs: 500,
    now: () => nowMs,
  });

  assert.deepEqual(await cachedPort.loadSnapshot(), createSnapshotFixture("first"));
  nowMs = 1_501;
  assert.deepEqual(await cachedPort.loadSnapshot(), createSnapshotFixture("second"));
  assert.equal(calls.loadSnapshot, 2);
});

test("fails closed when the first snapshot load fails", async () => {
  const { port, calls } = createCountedSourcePort([new Error("load failed")]);
  const cachedPort = createProjectDocumentationExplorerSnapshotCacheSourcePort(port, { ttlMs: 500 });

  await assert.rejects(() => cachedPort.loadSnapshot(), /load failed/u);
  assert.equal(calls.loadSnapshot, 1);
});

test("fails closed when a reload after TTL expiry fails instead of serving stale data", async () => {
  let nowMs = 1_000;
  const { port, calls } = createCountedSourcePort([createSnapshotFixture("first"), new Error("reload failed")]);
  const cachedPort = createProjectDocumentationExplorerSnapshotCacheSourcePort(port, {
    ttlMs: 500,
    now: () => nowMs,
  });

  assert.deepEqual(await cachedPort.loadSnapshot(), createSnapshotFixture("first"));
  nowMs = 1_501;
  await assert.rejects(() => cachedPort.loadSnapshot(), /reload failed/u);
  assert.equal(calls.loadSnapshot, 2);
});

test("passes governed Markdown body loading through without snapshot caching", async () => {
  const { port, calls } = createCountedSourcePort([]);
  const cachedPort = createProjectDocumentationExplorerSnapshotCacheSourcePort(port, { ttlMs: 500 });

  assert.equal(await cachedPort.loadBodyContent("docs/example.md"), "body:docs/example.md");
  assert.equal(await cachedPort.loadBodyContent("docs/example.md"), "body:docs/example.md");
  assert.equal(calls.loadBodyContent, 2);
  assert.equal(calls.loadSnapshot, 0);
});

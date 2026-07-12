import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  createProjectDocumentationExplorerServeApp,
  isProjectDocumentationExplorerServeCliEntrypoint,
  parseProjectDocumentationExplorerServeOptions,
  startProjectDocumentationExplorerServeCommand,
} from "../../../src/MR-0002/project-documentation-explorer/project-documentation-explorer.serve.mjs";

/**
 * @file Smoke tests for the Project Documentation Explorer process-level composition root and serve command.
 *
 * @verifiesRequirement MR-0002REQ-0047
 * @verifiesRequirement MR-0002REQ-0052
 * @derivedFromDecision MR-0002/ADR-0014
 * @derivedFromDecision MR-0002/ADR-0019
 * @macroRequirement MR-0002
 *
 * These tests verify local serve-command composition and startup behavior without
 * mutating governed project-model sources, adding write endpoints, changing the
 * frontend to consume HTTP, introducing dynamic MR-0007 RBAC semantics, or
 * starting a long-lived process.
 */

const allowingAccessPolicy = Object.freeze({
  evaluate({ requiredCapability }) {
    return {
      authenticated: true,
      role: "registered_user",
      allowed: true,
      required_capability: requiredCapability,
      capabilities: [requiredCapability],
    };
  },
});

const fixtureSourcePort = Object.freeze({
  async loadSnapshot() {
    return {
      macroRequirements: [],
      requirements: [],
      decisions: [],
      taxonomies: [],
      graphRelations: [],
    };
  },
  async loadBodyContent() {
    return null;
  },
});

/**
 * Stops a server created by the local serve command.
 *
 * @param {import("node:http").Server} server - HTTP server.
 * @returns {Promise<void>} Completion promise.
 */
async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("parses Project Documentation Explorer serve command options", () => {
  const options = parseProjectDocumentationExplorerServeOptions(
    ["--host", "127.0.0.2", "--port=4321", "--root-dir", ".", "--snapshot-cache-ttl-ms", "250"],
    {},
  );

  assert.equal(options.host, "127.0.0.2");
  assert.equal(options.port, 4321);
  assert.equal(path.isAbsolute(options.rootDir), true);
  assert.equal(options.snapshotCacheTtlMs, 250);
});


test("detects the Project Documentation Explorer serve CLI entrypoint using filesystem paths", () => {
  const entrypointPath = path.resolve("backend/src/MR-0002/project-documentation-explorer/project-documentation-explorer.serve.mjs");
  const moduleUrl = pathToFileURL(entrypointPath).href;

  assert.equal(isProjectDocumentationExplorerServeCliEntrypoint(moduleUrl, entrypointPath), true);
  assert.equal(isProjectDocumentationExplorerServeCliEntrypoint(moduleUrl, path.resolve("package.json")), false);
  assert.equal(isProjectDocumentationExplorerServeCliEntrypoint(moduleUrl, undefined), false);
});

test("creates the Project Documentation Explorer serve app through composed dependencies", () => {
  const app = createProjectDocumentationExplorerServeApp({
    rootDir: ".",
    sourcePort: fixtureSourcePort,
    accessPolicy: allowingAccessPolicy,
    principalResolver() {
      return { authenticated: true, role: "registered_user" };
    },
    snapshotCacheTtlMs: 1000,
  });

  assert.equal(typeof app.server.listen, "function");
  assert.equal(typeof app.module.controller.listDocumentation, "function");
  assert.equal(app.module.routes.length, 3);
  assert.equal(app.options.snapshotCacheTtlMs, 1000);
});

test("starts the local read-only Project Documentation Explorer serve command", async () => {
  const messages = [];
  const { server, url } = await startProjectDocumentationExplorerServeCommand({
    host: "127.0.0.1",
    port: 0,
    rootDir: ".",
    sourcePort: fixtureSourcePort,
    accessPolicy: allowingAccessPolicy,
    principalResolver() {
      return { authenticated: true, role: "registered_user" };
    },
    logger: {
      log(message) {
        messages.push(message);
      },
      error(message) {
        messages.push(message);
      },
    },
  });

  try {
    const response = await fetch(`${url}/api/project-model/documentation`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.summary.total_items, 0);
    assert.match(messages.join("\n"), /read-only API listening/u);
  } finally {
    await close(server);
  }
});

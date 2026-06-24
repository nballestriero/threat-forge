import assert from "node:assert/strict";
import test from "node:test";

import {
  createHttpProjectDocumentationExplorerClient,
  createProjectDocumentationExplorerClient,
  createStaticProjectDocumentationExplorerClient,
} from "../../../../frontend/src/MR-0002/project-documentation-explorer/project-documentation-explorer.client.js";

/**
 * @file Smoke tests for the Project Documentation Explorer frontend data-source boundary.
 *
 * @verifiesRequirement MR-0002REQ-0048
 * @derivedFromDecision MR-0002/ADR-0015
 * @macroRequirement MR-0002
 *
 * These tests verify that the page-facing frontend client boundary can use the
 * existing generated snapshot source or the governed HTTP read source without
 * reading YAML, Markdown, filesystem paths, Git state, project-model registries
 * or graph files directly. The HTTP assertions use a fake fetch implementation
 * and do not start browser, backend or long-lived network processes.
 */

const fixtureList = Object.freeze({
  access: { allowed: true, capabilities: ["project_model.documentation.read"] },
  query: {},
  summary: { total_items: 1, filtered_items: 1 },
  filters: [{ id: "mr", label: "Macro requirement", values: [{ value: "MR-0002", count: 1 }] }],
  items: [{ id: "MR-0002REQ-0048", kind: "requirement", title: "Frontend HTTP boundary" }],
});

const fixtureDetail = Object.freeze({
  access: { allowed: true },
  item: { id: "MR-0002REQ-0048", kind: "requirement", title: "Frontend HTTP boundary" },
  body: { content_markdown: "# Requirement" },
});

/**
 * Create a deterministic fetch fake that records requested URLs and headers.
 *
 * @param {Record<string, unknown>|Function} payloadOrFactory - Payload or payload factory.
 * @returns {{calls: Array<Record<string, unknown>>, fetchImpl: Function}} Fake fetch bundle.
 */
function createFetchFake(payloadOrFactory) {
  const calls = [];

  return {
    calls,
    async fetchImpl(url, init = {}) {
      calls.push({ url, init });
      const payload = typeof payloadOrFactory === "function" ? payloadOrFactory(url, init) : payloadOrFactory;
      return {
        ok: true,
        status: 200,
        async json() {
          return payload;
        },
      };
    },
  };
}

test("keeps the generated snapshot as the default Project Documentation Explorer data source", async () => {
  const snapshot = {
    list: fixtureList,
    details_by_id: {
      "MR-0002REQ-0048": fixtureDetail,
    },
  };
  const { calls, fetchImpl } = createFetchFake(snapshot);

  const client = createProjectDocumentationExplorerClient({
    snapshotUrl: "/project-documentation-explorer.snapshot.json",
    fetchImpl,
  });

  assert.deepEqual(await client.loadDocumentation(), fixtureList);
  assert.deepEqual(await client.loadDocumentationFilters(), {
    access: fixtureList.access,
    query: fixtureList.query,
    filters: fixtureList.filters,
  });
  assert.deepEqual(await client.loadDocumentationEntity("MR-0002REQ-0048"), fixtureDetail);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/project-documentation-explorer.snapshot.json");
  assert.equal(calls[0].init.method, "GET");
});

test("loads Project Documentation Explorer collection, filters and details from governed HTTP GET endpoints", async () => {
  const { calls, fetchImpl } = createFetchFake((url) => {
    if (String(url).includes("/filters")) return { filters: fixtureList.filters };
    if (String(url).includes("/entities/")) return fixtureDetail;
    return fixtureList;
  });

  const client = createHttpProjectDocumentationExplorerClient({
    baseUrl: "http://127.0.0.1:4174",
    fetchImpl,
  });

  assert.deepEqual(await client.loadDocumentation({ mr: "MR-0002", kind: ["requirement", "adr"] }), fixtureList);
  assert.deepEqual(await client.loadDocumentationFilters({ status: "approved" }), { filters: fixtureList.filters });
  assert.deepEqual(await client.loadDocumentationEntity("MR-0002/ADR-0015"), fixtureDetail);

  assert.equal(calls[0].url, "http://127.0.0.1:4174/api/project-model/documentation?mr=MR-0002&kind=requirement&kind=adr");
  assert.equal(calls[1].url, "http://127.0.0.1:4174/api/project-model/documentation/filters?status=approved");
  assert.equal(calls[2].url, "http://127.0.0.1:4174/api/project-model/documentation/entities/MR-0002%2FADR-0015");
  assert.ok(calls.every((call) => call.init.method === "GET"));
  assert.ok(calls.every((call) => call.init.headers.Accept === "application/json"));
  assert.ok(calls.every((call) => call.init.headers["x-threat-forge-authenticated"] === "true"));
  assert.ok(calls.every((call) => call.init.headers["x-threat-forge-role"] === "registered_user"));
});

test("selects the governed HTTP source only through explicit frontend data-source configuration", async () => {
  const { calls, fetchImpl } = createFetchFake(fixtureList);

  const client = createProjectDocumentationExplorerClient({
    source: "http",
    httpBaseUrl: "",
    fetchImpl,
  });

  assert.deepEqual(await client.loadDocumentation(), fixtureList);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/project-model/documentation");
});

test("rejects unsupported Project Documentation Explorer frontend data sources", () => {
  assert.throws(
    () => createProjectDocumentationExplorerClient({ source: "filesystem" }),
    /Unsupported Project Documentation Explorer data source/u,
  );
});

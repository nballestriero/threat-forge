import assert from "node:assert/strict";
import test from "node:test";

import {
  createHttpProjectDocumentationExplorerClient,
  createLiveProjectDocumentationExplorerClient,
  createProjectDocumentationExplorerClient,
  createProjectScopedChildProjectDocumentationExplorerClient,
  createUnavailableProjectDocumentationExplorerClient,
  createStaticProjectDocumentationExplorerClient,
} from "../../../../frontend/src/MR-0002/project-documentation-explorer/project-documentation-explorer.client.js";

/**
 * @file Smoke tests for the Project Documentation Explorer frontend data-source boundary.
 *
 * @verifiesRequirement MR-0002REQ-0048
 * @verifiesRequirement MR-0002REQ-0049
 * @verifiesRequirement MR-0002REQ-0069
 * @verifiesRequirement MR-0002REQ-0070
 * @verifiesRequirement MR-0003REQ-0070
 * @derivedFromDecision MR-0002/ADR-0015
 * @derivedFromDecision MR-0002/ADR-0016
 * @derivedFromDecision MR-0002/ADR-0029
 * @derivedFromDecision MR-0003/ADR-0016
 * @macroRequirement MR-0002
 * @macroRequirement MR-0003
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
      if (payload?.response) return payload.response;
      const isResponseShape = payload && (Object.hasOwn(payload, "ok") || Object.hasOwn(payload, "status"));
      return {
        ok: isResponseShape ? payload.ok : true,
        status: isResponseShape ? payload.status : 200,
        async json() {
          return isResponseShape && Object.hasOwn(payload, "body") ? payload.body : payload;
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

  const list = await client.loadDocumentation();
  const filters = await client.loadDocumentationFilters();
  const detail = await client.loadDocumentationEntity("MR-0002REQ-0048");

  assert.equal(list.items[0].id, fixtureList.items[0].id);
  assert.equal(list.data_source.selected_source, "snapshot");
  assert.equal(list.data_source.effective_source, "snapshot");
  assert.equal(list.data_source.fallback, false);
  assert.deepEqual(filters.filters, fixtureList.filters);
  assert.equal(filters.data_source.effective_source, "snapshot");
  assert.equal(detail.item.id, fixtureDetail.item.id);
  assert.equal(detail.data_source.effective_source, "snapshot");
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

  const list = await client.loadDocumentation({ mr: "MR-0002", kind: ["requirement", "adr"] });
  const filters = await client.loadDocumentationFilters({ status: "approved" });
  const detail = await client.loadDocumentationEntity("MR-0002/ADR-0015");

  assert.equal(list.data_source.selected_source, "http");
  assert.equal(list.data_source.effective_source, "http");
  assert.equal(list.data_source.fallback, false);
  assert.deepEqual(filters.filters, fixtureList.filters);
  assert.equal(filters.data_source.effective_source, "http");
  assert.equal(detail.item.id, fixtureDetail.item.id);
  assert.equal(detail.data_source.effective_source, "http");

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

  const list = await client.loadDocumentation();

  assert.equal(list.items[0].id, fixtureList.items[0].id);
  assert.equal(list.data_source.selected_source, "http");
  assert.equal(list.data_source.effective_source, "http");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/project-model/documentation");
});

test("falls back to the generated snapshot when live HTTP activation fails explicitly", async () => {
  const snapshot = {
    list: fixtureList,
    details_by_id: {
      "MR-0002REQ-0048": fixtureDetail,
    },
  };
  const { calls, fetchImpl } = createFetchFake((url) => {
    if (String(url).includes("project-documentation-explorer.snapshot.json")) return snapshot;
    return { ok: false, status: 503, body: { error: "unavailable" } };
  });

  const client = createLiveProjectDocumentationExplorerClient({
    httpBaseUrl: "http://127.0.0.1:4174",
    snapshotUrl: "/project-documentation-explorer.snapshot.json",
    fetchImpl,
  });

  const list = await client.loadDocumentation();
  const detail = await client.loadDocumentationEntity("MR-0002REQ-0048");

  assert.equal(list.items[0].id, fixtureList.items[0].id);
  assert.equal(list.data_source.selected_source, "http");
  assert.equal(list.data_source.effective_source, "snapshot");
  assert.equal(list.data_source.fallback, true);
  assert.match(list.data_source.failure_message, /HTTP 503/u);
  assert.equal(detail.data_source.effective_source, "snapshot");
  assert.equal(calls[0].url, "http://127.0.0.1:4174/api/project-model/documentation");
  assert.equal(calls[1].url, "/project-documentation-explorer.snapshot.json");
});



test("keeps child project documentation unavailable instead of falling back to platform snapshot", async () => {
  const client = createUnavailableProjectDocumentationExplorerClient({
    label: "Child Project Documentation unavailable",
    message: "No child Project Documentation Explorer HTTP source is configured for the selected child project.",
    failureMessage: "Configure the child documentation source before opening child project documents.",
  });

  const dataSource = client.describeDataSource();
  assert.equal(dataSource.selected_source, "child-http");
  assert.equal(dataSource.effective_source, "unavailable");
  assert.equal(dataSource.fallback, false);

  await assert.rejects(
    () => client.loadDocumentation(),
    /No child Project Documentation Explorer HTTP source is configured/u,
  );
  await assert.rejects(
    () => client.loadDocumentationEntity("MR-0002"),
    /Configure the child documentation source/u,
  );
});


test("loads child project documents through the project-scoped platform API", async () => {
  const { calls, fetchImpl } = createFetchFake((url) => {
    if (String(url).includes("/entities/")) return fixtureDetail;
    return fixtureList;
  });

  const client = createProjectScopedChildProjectDocumentationExplorerClient({
    baseUrl: "http://127.0.0.1:4175",
    childProjectId: "demo-child-project",
    childProjectLabel: "Demo Child Project",
    fetchImpl,
  });

  const list = await client.loadDocumentation({ kind: ["requirement", "adr"] });
  const filters = await client.loadDocumentationFilters({ mr: "MR-0000" });
  const detail = await client.loadDocumentationEntity("MR-0000REQ-0001");

  assert.equal(list.items[0].id, fixtureList.items[0].id);
  assert.equal(list.data_source.selected_source, "project-scoped-child-project");
  assert.equal(list.data_source.effective_source, "project-scoped-child-project");
  assert.equal(list.data_source.fallback, false);
  assert.deepEqual(filters.filters, fixtureList.filters);
  assert.equal(detail.item.id, fixtureDetail.item.id);

  assert.equal(calls[0].url, "http://127.0.0.1:4175/api/child-projects/demo-child-project/documentation?kind=requirement&kind=adr");
  assert.equal(calls[1].url, "http://127.0.0.1:4175/api/child-projects/demo-child-project/documentation?mr=MR-0000");
  assert.equal(calls[2].url, "http://127.0.0.1:4175/api/child-projects/demo-child-project/documentation/entities/MR-0000REQ-0001");
  assert.ok(calls.every((call) => call.init.headers["x-threat-forge-authenticated"] === "true"));
});

test("surfaces project-scoped child documentation unavailable errors without snapshot fallback", async () => {
  const { fetchImpl } = createFetchFake({
    ok: false,
    status: 409,
    body: {
      error: "documentation_source_unavailable",
      message: "Project Model directory is not available for the selected child project.",
    },
  });

  const client = createProjectScopedChildProjectDocumentationExplorerClient({
    baseUrl: "http://127.0.0.1:4175",
    childProjectId: "missing-child-project",
    fetchImpl,
  });

  assert.equal(client.describeDataSource().fallback, false);
  await assert.rejects(
    () => client.loadDocumentation(),
    /HTTP 409 documentation_source_unavailable: Project Model directory is not available/u,
  );
});

test("rejects unsupported Project Documentation Explorer frontend data sources", () => {
  assert.throws(
    () => createProjectDocumentationExplorerClient({ source: "filesystem" }),
    /Unsupported Project Documentation Explorer data source/u,
  );
});

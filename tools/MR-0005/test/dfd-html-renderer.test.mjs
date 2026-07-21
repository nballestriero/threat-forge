import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { readGovernedYamlFile } from "../../MR-0001/lib/governed-yaml.mjs";
import { projectBaseDfd } from "../../MR-0003/lib/base-dfd-projector.mjs";
import { renderDfdHtml } from "../lib/dfd-html-renderer.mjs";

/**
 * @file Static HTML and SVG DFD renderer verification.
 *
 * @implementsRequirement MR-0005ADR-0001REQ-0003GOV-0001
 * @derivedFromDecision MR-0005/ADR-0001
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Verifies deterministic, complete, traceable and renderer-neutral
 * materialization of valid DFD semantic projections.
 */

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "..", "..", "..");

const caseStudyRegistryProjectPath =
  "examples/case-studies/documentation-to-base-analysis/" +
  "docs/reference/project-model/registers/base-analysis/" +
  "base-analysis-elements.registry.yml";

function loadCanonicalProjection() {
  const registryPath = path.join(
    rootDir,
    ...caseStudyRegistryProjectPath.split("/"),
  );

  const inventory = readGovernedYamlFile(registryPath);

  return projectBaseDfd({
    inventory,
    registryPath: caseStudyRegistryProjectPath,
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function countMatches(value, expression) {
  return [...String(value).matchAll(expression)].length;
}

function renderCanonicalProjection() {
  return renderDfdHtml(loadCanonicalProjection(), {
    title: "ThreatForge Base DFD case study",
  });
}

test("renders the canonical Base DFD case study", () => {
  const projection = loadCanonicalProjection();
  const html = renderCanonicalProjection();

  assert.equal(projection.nodes.length, 2);
  assert.equal(projection.flows.length, 1);
  assert.equal(projection.boundaries.length, 1);
  assert.equal(projection.unprojected_baes.length, 1);

  assert.match(html, /^<!doctype html>/u);
  assert.match(html, /<svg\b/u);
  assert.match(html, /role="img"/u);
  assert.match(html, /<desc id="diagram-description">/u);

  assert.equal(
    countMatches(html, /<g class="dfd-node role-/gu),
    projection.nodes.length,
  );

  assert.equal(
    countMatches(html, /<g class="dfd-flow"/gu),
    projection.flows.length,
  );

  assert.equal(
    countMatches(html, /<g class="dfd-boundary"/gu),
    projection.boundaries.length,
  );

  assert.equal(
    countMatches(html, /<article class="trace-card"/gu),
    projection.nodes.length +
      projection.flows.length +
      projection.boundaries.length +
      projection.unprojected_baes.length,
  );
});

test("produces byte-identical output for identical projections", () => {
  const projection = loadCanonicalProjection();

  const first = renderDfdHtml(projection, {
    title: "ThreatForge Base DFD case study",
  });

  const second = renderDfdHtml(projection, {
    title: "ThreatForge Base DFD case study",
  });

  assert.equal(second, first);
});

test("normalizes collection ordering deterministically", () => {
  const projection = loadCanonicalProjection();

  const reordered = structuredClone(projection);
  reordered.nodes.reverse();
  reordered.flows.reverse();
  reordered.boundaries.reverse();
  reordered.unprojected_baes.reverse();

  const canonicalHtml = renderDfdHtml(projection, {
    title: "ThreatForge Base DFD case study",
  });

  const reorderedHtml = renderDfdHtml(reordered, {
    title: "ThreatForge Base DFD case study",
  });

  assert.equal(reorderedHtml, canonicalHtml);
});

test("does not mutate the semantic projection", () => {
  const projection = loadCanonicalProjection();
  const before = structuredClone(projection);

  renderDfdHtml(projection);

  assert.deepEqual(projection, before);
});

test("represents every projected element exactly once in the SVG", () => {
  const projection = loadCanonicalProjection();
  const html = renderDfdHtml(projection);

  const projectedRecords = [
    ...projection.nodes,
    ...projection.flows,
    ...projection.boundaries,
  ];

  for (const record of projectedRecords) {
    const expression = new RegExp(
      `data-dfd-element-id="${escapeRegExp(record.id)}"`,
      "gu",
    );

    assert.equal(
      countMatches(html, expression),
      1,
      `${record.id} must occur exactly once as an SVG element`,
    );
  }
});

test("preserves projection, BAE and relation traceability identities", () => {
  const projection = loadCanonicalProjection();
  const html = renderDfdHtml(projection);

  assert.match(
    html,
    new RegExp(escapeRegExp(projection.projection_id), "u"),
  );

  const traceableRecords = [
    ...projection.nodes,
    ...projection.flows,
    ...projection.boundaries,
  ];

  for (const record of traceableRecords) {
    for (const baeId of record.contributing_bae_ids) {
      assert.match(
        html,
        new RegExp(escapeRegExp(baeId), "u"),
        `Missing BAE traceability identity ${baeId}`,
      );
    }

    for (const relationId of record.contributing_relation_ids) {
      assert.match(
        html,
        new RegExp(escapeRegExp(relationId), "u"),
        `Missing relation traceability identity ${relationId}`,
      );
    }
  }

  for (const record of projection.unprojected_baes) {
    assert.match(
      html,
      new RegExp(escapeRegExp(record.bae_id), "u"),
    );

    assert.match(
      html,
      new RegExp(escapeRegExp(record.reason), "u"),
    );
  }
});

test("preserves flow endpoints and crossed-boundary identities", () => {
  const projection = loadCanonicalProjection();
  const html = renderDfdHtml(projection);
  const flow = projection.flows[0];

  assert.match(
    html,
    new RegExp(
      `data-source-node-id="${escapeRegExp(flow.source_node_id)}"`,
      "u",
    ),
  );

  assert.match(
    html,
    new RegExp(
      `data-target-node-id="${escapeRegExp(flow.target_node_id)}"`,
      "u",
    ),
  );

  assert.match(
    html,
    new RegExp(
      `data-crossed-boundary-ids="${escapeRegExp(
        flow.crossed_boundary_ids.join(","),
      )}"`,
      "u",
    ),
  );
});

test("produces a self-contained artifact without external resources", () => {
  const html = renderCanonicalProjection();

  assert.doesNotMatch(html, /<(?:script|link)\b/iu);
  assert.doesNotMatch(html, /\s(?:src|href)=/iu);
  assert.doesNotMatch(html, /https?:\/\//iu);
});

test("safely encodes projection-provided HTML and SVG text", () => {
  const projection = loadCanonicalProjection();
  const malicious = structuredClone(projection);

  malicious.nodes[0].title =
    '<script>alert("node")</script>';

  malicious.flows[0].title =
    '<image href="https://example.invalid/x">';

  malicious.boundaries[0].title =
    'Boundary & "quoted"';

  malicious.unprojected_baes[0].title =
    "<b>unprojected</b>";

  const html = renderDfdHtml(malicious, {
    title: '<svg onload="alert(1)">',
  });

  assert.doesNotMatch(html, /<script>alert/u);
  assert.doesNotMatch(html, /<image href=/u);
  assert.doesNotMatch(html, /<svg onload=/u);
  assert.doesNotMatch(html, /<b>unprojected<\/b>/u);

  assert.match(
    html,
    /&lt;script&gt;alert\(&quot;node&quot;\)&lt;\/script&gt;/u,
  );

  assert.match(
    html,
    /&lt;image href=&quot;https:\/\/example\.invalid\/x&quot;&gt;/u,
  );

  assert.match(
    html,
    /Boundary &amp; &quot;quoted&quot;/u,
  );

  assert.match(
    html,
    /&lt;b&gt;unprojected&lt;\/b&gt;/u,
  );

  assert.match(
    html,
    /&lt;svg onload=&quot;alert\(1\)&quot;&gt;/u,
  );
});

test("rejects renderer-owned members in the semantic projection", () => {
  const projection = loadCanonicalProjection();
  const invalid = structuredClone(projection);

  invalid.nodes[0].layout = {
    x: 10,
    y: 20,
  };

  assert.throws(
    () => renderDfdHtml(invalid),
    /contains renderer-owned member layout/u,
  );
});

test("rejects unresolved flow endpoint identities", () => {
  const projection = loadCanonicalProjection();
  const invalid = structuredClone(projection);

  invalid.flows[0].source_node_id = "DFD-NODE-UNKNOWN";

  assert.throws(
    () => renderDfdHtml(invalid),
    /references unknown source node DFD-NODE-UNKNOWN/u,
  );
});

test("rejects unresolved crossed-boundary identities", () => {
  const projection = loadCanonicalProjection();
  const invalid = structuredClone(projection);

  invalid.flows[0].crossed_boundary_ids = [
    "DFD-BOUNDARY-UNKNOWN",
  ];

  assert.throws(
    () => renderDfdHtml(invalid),
    /references unknown boundary DFD-BOUNDARY-UNKNOWN/u,
  );
});

test("rejects duplicate projected identities", () => {
  const projection = loadCanonicalProjection();
  const invalid = structuredClone(projection);

  invalid.nodes.push(structuredClone(invalid.nodes[0]));

  assert.throws(
    () => renderDfdHtml(invalid),
    /projection\.nodes contains duplicate identities/u,
  );
});

test("rejects unsupported node roles", () => {
  const projection = loadCanonicalProjection();
  const invalid = structuredClone(projection);

  invalid.nodes[0].role = "unknown_role";

  assert.throws(
    () => renderDfdHtml(invalid),
    /role is unsupported: unknown_role/u,
  );
});

test("rejects malformed traceability collections", () => {
  const projection = loadCanonicalProjection();
  const invalid = structuredClone(projection);

  invalid.nodes[0].contributing_bae_ids = null;

  assert.throws(
    () => renderDfdHtml(invalid),
    /contributing_bae_ids must be a list/u,
  );
});
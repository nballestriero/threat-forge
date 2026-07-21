import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createTargetProject } from "../lib/target-project-generator.mjs";
import { createTargetProjectMarkdownAssistanceService } from "../lib/target-project-markdown-assistance.mjs";
import { packageGovernedMarkdownExtension } from "../../MR-0002/install-vscode-governed-markdown-assistance.mjs";
import {
  materializeTargetProjectVsCodeWorkspace,
  targetProjectWorkspaceTaskLabels,
} from "../materialize-target-project-vscode-workspace.mjs";

/**
 * @file Target Project governed VS Code workspace and assistance verification.
 *
 * @implementsRequirement MR-0004ADR-0001REQ-0005
 * @implementsRequirement MR-0004ADR-0001REQ-0006
 * @implementsRequirement MR-0002ADR-0006REQ-0005
 * @implementsRequirement MR-0002ADR-0006REQ-0005GOV-0001
 * @derivedFromDecision MR-0004/ADR-0001
 * @derivedFromDecision MR-0002/ADR-0006
 * @macroRequirement MR-0004
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Verifies target-local workspace materialization, schema ownership, task
 * routing, portable repository-contained projection, BAE isolation, empty
 * inventory behavior, live Markdown diagnostics/completion/hover/quick fixes and
 * VSIX packaging.
 */

const testPath = fileURLToPath(import.meta.url);
const engineRoot = path.resolve(path.dirname(testPath), "..", "..", "..");
const require = createRequire(import.meta.url);
const extensionAdapterPath = path.join(
  engineRoot,
  "tools",
  "MR-0002",
  "vscode-governed-markdown-assistance",
  "extension.cjs",
);

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-target-vscode-"));
  const targetRoot = path.join(root, "target-project");
  createTargetProject({
    engineRoot,
    destinationRoot: targetRoot,
    projectId: "target-vscode-test",
    projectTitle: "Target VS Code Test",
    author: "ThreatForge Test",
    decisionDate: "2026-07-20",
  });
  return { root, targetRoot };
}

function createInternalWorkspace() {
  const root = fs.mkdtempSync(path.join(engineRoot, ".threatforge-internal-vscode-"));
  const targetRoot = path.join(root, "case-study");
  createTargetProject({
    engineRoot,
    destinationRoot: targetRoot,
    projectId: "internal-case-study-test",
    projectTitle: "Internal Case Study Test",
    author: "ThreatForge Test",
    decisionDate: "2026-07-21",
  });
  return { root, targetRoot };
}

function portablePath(value) {
  return String(value).replaceAll("\\", "/");
}

function removeWorkspace(workspace) {
  fs.rmSync(workspace.root, { recursive: true, force: true });
}

function hashPath(rootDir) {
  const hash = crypto.createHash("sha256");
  function visit(current, relative = "") {
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const absolute = path.join(current, entry.name);
      hash.update(`${entry.isDirectory() ? "D" : "F"}:${nextRelative}\n`);
      if (entry.isDirectory()) visit(absolute, nextRelative);
      else hash.update(fs.readFileSync(absolute));
    }
  }
  visit(rootDir);
  return hash.digest("hex");
}

function readJson(targetRoot, projectPath) {
  return JSON.parse(
    fs.readFileSync(path.join(targetRoot, ...projectPath.split("/")), "utf8")
      .replace(/^\/\*[\s\S]*?\*\/\s*/u, ""),
  );
}

function authoringBodyPath() {
  return "docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001_body.md";
}

function analyzeScope(service, targetRoot, replacement) {
  const projectPath = authoringBodyPath();
  const absolute = path.join(targetRoot, ...projectPath.split("/"));
  const source = fs.readFileSync(absolute, "utf8");
  const text = source.replace(
    "- Includes: Demonstration interaction description",
    replacement,
  );
  const lines = text.split("\n");
  const line = lines.findIndex((value) => value === replacement);
  return service.analyze({
    projectPath,
    text,
    position: { line, character: replacement.length },
  });
}

function macroEnums(schema) {
  return schema.oneOf
    .filter((branch) => branch.properties?.macro_requirement_id)
    .map((branch) => branch.properties.macro_requirement_id.enum);
}

function decisionEnums(schema) {
  const values = [];
  for (const branch of schema.oneOf) {
    for (const conditional of branch.allOf ?? []) {
      const enumeration = conditional.then?.properties?.decision_id?.enum;
      if (enumeration) values.push(enumeration);
    }
  }
  return values;
}

test("materializes a target-local workspace whose schema and tasks use target ownership", () => {
  const workspace = createWorkspace();
  try {
    const engineBefore = hashPath(path.join(engineRoot, "docs", "reference", "project-model"));
    const result = materializeTargetProjectVsCodeWorkspace({
      mode: "write",
      engineRoot,
      targetRoot: workspace.targetRoot,
    });
    assert.equal(result.files.length, 4);
    const schema = readJson(
      workspace.targetRoot,
      ".vscode/schemas/governed-document-authoring.schema.json",
    );
    assert.deepEqual(macroEnums(schema), [["MR-0001"], ["MR-0001"], ["MR-0001"]]);
    assert.ok(decisionEnums(schema).every((values) => values.length === 1 && values[0] === "ADR-0001"));
    assert.equal(schema["x-threatforge"].ownership_scope, "target_project");

    const settings = readJson(workspace.targetRoot, ".vscode/settings.json");
    assert.equal(settings["threatforge.engineRoot"], engineRoot);
    assert.deepEqual(
      settings["yaml.schemas"]["./.vscode/schemas/governed-document-authoring.schema.json"],
      ["**/*.governed-document-authoring.yml"],
    );

    const extensions = readJson(workspace.targetRoot, ".vscode/extensions.json");
    assert.ok(
      extensions.recommendations.includes(
        "threatforge.threatforge-governed-markdown-assistance",
      ),
    );
    assert.equal(
      extensions.recommendations.includes(
        "threatforge.threatforge-target-project-assistance",
      ),
      false,
    );

    const tasks = readJson(workspace.targetRoot, ".vscode/tasks.json");
    const byLabel = new Map(tasks.tasks.map((entry) => [entry.label, entry]));
    for (const label of Object.values(targetProjectWorkspaceTaskLabels)) {
      assert.ok(byLabel.has(label), `missing task ${label}`);
    }
    const preview = byLabel.get(targetProjectWorkspaceTaskLabels.preview);
    assert.ok(preview.args.includes("${workspaceFolder}"));
    assert.ok(preview.args.includes("${relativeFile}"));
    assert.ok(preview.args.includes(engineRoot));
    assert.match(preview.args[0], /run-target-project-authoring\.mjs$/u);
    assert.equal(
      hashPath(path.join(engineRoot, "docs", "reference", "project-model")),
      engineBefore,
    );
  } finally {
    removeWorkspace(workspace);
  }
});

test("repository-contained target workspace uses portable engine references", () => {
  const workspace = createInternalWorkspace();
  try {
    const result = materializeTargetProjectVsCodeWorkspace({
      mode: "write",
      engineRoot,
      targetRoot: workspace.targetRoot,
    });
    const engineReference = portablePath(path.relative(workspace.targetRoot, engineRoot));
    assert.equal(result.engineReference, engineReference);
    assert.equal(path.isAbsolute(engineReference), false);

    const settings = readJson(workspace.targetRoot, ".vscode/settings.json");
    assert.equal(settings["threatforge.engineRoot"], engineReference);
    assert.equal(JSON.stringify(settings).includes(engineRoot), false);

    const tasks = readJson(workspace.targetRoot, ".vscode/tasks.json");
    assert.equal(JSON.stringify(tasks).includes(engineRoot), false);
    const byLabel = new Map(tasks.tasks.map((entry) => [entry.label, entry]));
    const preview = byLabel.get(targetProjectWorkspaceTaskLabels.preview);
    assert.equal(preview.args[0], `${engineReference}/tools/MR-0004/run-target-project-authoring.mjs`);
    assert.ok(preview.args.includes(engineReference));
    assert.equal(preview.options.cwd, "${workspaceFolder}");
    const install = byLabel.get(targetProjectWorkspaceTaskLabels.installAssistance);
    assert.equal(install.options.cwd, "${workspaceFolder}");

    materializeTargetProjectVsCodeWorkspace({
      mode: "check",
      engineRoot,
      targetRoot: workspace.targetRoot,
    });
  } finally {
    removeWorkspace(workspace);
  }
});

test("workspace projection is deterministic and check mode detects stale managed files", () => {
  const workspace = createWorkspace();
  try {
    materializeTargetProjectVsCodeWorkspace({
      mode: "write",
      engineRoot,
      targetRoot: workspace.targetRoot,
    });
    const vscodeRoot = path.join(workspace.targetRoot, ".vscode");
    const first = hashPath(vscodeRoot);
    materializeTargetProjectVsCodeWorkspace({
      mode: "write",
      engineRoot,
      targetRoot: workspace.targetRoot,
    });
    assert.equal(hashPath(vscodeRoot), first);
    materializeTargetProjectVsCodeWorkspace({
      mode: "check",
      engineRoot,
      targetRoot: workspace.targetRoot,
    });

    const settingsPath = path.join(vscodeRoot, "settings.json");
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    settings["threatforge.engineRoot"] = "C:/stale-engine";
    fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    assert.throws(
      () => materializeTargetProjectVsCodeWorkspace({
        mode: "check",
        engineRoot,
        targetRoot: workspace.targetRoot,
      }),
      /stale/u,
    );
  } finally {
    removeWorkspace(workspace);
  }
});

test("target assistance offers only target-local BAE completion, hover and title fix", () => {
  const workspace = createWorkspace();
  const service = createTargetProjectMarkdownAssistanceService({
    engineRoot,
    targetRoot: workspace.targetRoot,
  });
  try {
    const completion = analyzeScope(service, workspace.targetRoot, "- Includes: [");
    const baeCompletions = completion.completions.filter((entry) =>
      String(entry.id).startsWith("governed-reference:"),
    );
    const labels = baeCompletions.map((entry) => entry.label);
    assert.ok(labels.includes("[BAE-0001] Demonstration user"));
    assert.ok(labels.includes("[BAE-0002] Demonstration service"));
    assert.ok(labels.every((label) => /Demonstration|Service trust boundary/u.test(label)));

    const divergence = analyzeScope(
      service,
      workspace.targetRoot,
      "- Includes: [BAE-0001] Wrong title",
    );
    assert.ok(divergence.diagnostics.some((entry) => entry.rule_id === "governed-reference.title-divergence"));
    assert.ok(divergence.quick_fixes.some((entry) =>
      entry.edits?.some((edit) => edit.new_text === "[BAE-0001] Demonstration user"),
    ));
    assert.ok(divergence.hovers.some((entry) => /Person who initiates/u.test(entry.markdown)));

    const unknown = analyzeScope(
      service,
      workspace.targetRoot,
      "- Includes: [BAE-9999] Missing",
    );
    assert.ok(unknown.diagnostics.some((entry) => entry.rule_id === "governed-reference.unknown-identifier"));
  } finally {
    service.dispose();
    removeWorkspace(workspace);
  }
});

test("empty valid target BAE inventory produces no completions and no service failure", () => {
  const workspace = createWorkspace();
  try {
    const registryPath = path.join(
      workspace.targetRoot,
      "docs",
      "reference",
      "project-model",
      "registers",
      "base-analysis",
      "base-analysis-elements.registry.yml",
    );
    fs.writeFileSync(
      registryPath,
      [
        "schema_version: 1",
        "registry_id: base-analysis-elements-registry",
        "macro_requirement_id: MR-0003",
        "",
        "elements: []",
        "",
        "relations: []",
        "",
      ].join("\n"),
      "utf8",
    );
    const bodyRoot = path.join(
      workspace.targetRoot,
      "docs",
      "reference",
      "project-model",
      "body",
    );
    const removeBaeReferences = (current) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const child = path.join(current, entry.name);
        if (entry.isDirectory()) {
          removeBaeReferences(child);
          continue;
        }
        if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
        const text = fs.readFileSync(child, "utf8");
        fs.writeFileSync(
          child,
          text.replace(/\[BAE-\d{4}\]/gu, "[No Base Analysis Element]"),
          "utf8",
        );
      }
    };
    removeBaeReferences(bodyRoot);
    const service = createTargetProjectMarkdownAssistanceService({
      engineRoot,
      targetRoot: workspace.targetRoot,
    });
    try {
      const result = analyzeScope(service, workspace.targetRoot, "- Includes: [");
      assert.equal(result.supported, true);
      assert.deepEqual(
        result.completions.filter((entry) =>
          String(entry.id).startsWith("governed-reference:"),
        ),
        [],
      );
    } finally {
      service.dispose();
    }
  } finally {
    removeWorkspace(workspace);
  }
});

test("unified VS Code adapter resolves an explicit absolute target engine", () => {
  const adapter = require(extensionAdapterPath);
  const targetRoot = path.join(os.tmpdir(), "target-extension-context");
  const documentPath = path.join(
    targetRoot,
    "docs",
    "reference",
    "project-model",
    "body",
    "requirements",
    "MR-0001",
    "example_body.md",
  );
  const folderUri = { fsPath: targetRoot };
  const document = { uri: { fsPath: documentPath } };
  const vscode = {
    workspace: {
      getWorkspaceFolder() { return { uri: folderUri }; },
      getConfiguration(section) {
        assert.equal(section, "threatforge");
        return {
          inspect(key) {
            assert.equal(key, "engineRoot");
            return { workspaceValue: engineRoot };
          },
        };
      },
    },
  };
  const context = adapter.workspaceContext(vscode, document);
  assert.equal(context.mode, "target");
  assert.equal(context.engineRoot, engineRoot);
  assert.equal(context.targetRoot, targetRoot);
  assert.equal(
    context.projectPath,
    "docs/reference/project-model/body/requirements/MR-0001/example_body.md",
  );
});

test("unified VS Code adapter resolves a workspace-relative target engine", () => {
  const adapter = require(extensionAdapterPath);
  const targetRoot = path.join(engineRoot, "examples", "case-studies", "portable-target");
  const documentPath = path.join(
    targetRoot,
    "docs",
    "reference",
    "project-model",
    "body",
    "requirements",
    "MR-0001",
    "example_body.md",
  );
  const engineReference = portablePath(path.relative(targetRoot, engineRoot));
  const folderUri = { fsPath: targetRoot };
  const document = { uri: { fsPath: documentPath } };
  const vscode = {
    workspace: {
      getWorkspaceFolder() { return { uri: folderUri }; },
      getConfiguration(section) {
        assert.equal(section, "threatforge");
        return {
          inspect(key) {
            assert.equal(key, "engineRoot");
            return { workspaceFolderValue: engineReference };
          },
        };
      },
    },
  };
  const context = adapter.workspaceContext(vscode, document);
  assert.equal(context.mode, "target");
  assert.equal(context.engineRoot, engineRoot);
  assert.equal(context.targetRoot, targetRoot);
});

test("unified VS Code adapter ignores a globally inherited target engine", () => {
  const adapter = require(extensionAdapterPath);
  const targetRoot = path.join(os.tmpdir(), "target-global-setting-context");
  const document = {
    uri: {
      fsPath: path.join(
        targetRoot,
        "docs/reference/project-model/body/requirements/MR-0001/example_body.md",
      ),
    },
  };
  const vscode = {
    workspace: {
      getWorkspaceFolder() { return { uri: { fsPath: targetRoot } }; },
      getConfiguration() {
        return {
          inspect() {
            return { globalValue: engineRoot };
          },
        };
      },
    },
  };
  assert.equal(adapter.workspaceContext(vscode, document), null);
});

test("unified VS Code adapter classifies the ThreatForge repository as engine", () => {
  const adapter = require(extensionAdapterPath);
  const document = {
    uri: {
      fsPath: path.join(
        engineRoot,
        "docs/reference/project-model/body/requirements/MR-0002/MR-0002ADR-0006REQ-0001_body.md",
      ),
    },
  };
  const vscode = {
    workspace: {
      getWorkspaceFolder() { return { uri: { fsPath: engineRoot } }; },
      getConfiguration() {
        return { inspect() { return {}; } };
      },
    },
  };
  const context = adapter.workspaceContext(vscode, document);
  assert.equal(context.mode, "engine");
  assert.equal(context.rootDir, engineRoot);
});

test("packages only the unified assistance adapter", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-unified-vsix-test-"));
  try {
    const outputPath = path.join(root, "unified-assistance.vsix");
    const result = packageGovernedMarkdownExtension({
      rootDir: engineRoot,
      outputPath,
    });
    assert.equal(
      result.extensionId,
      "threatforge.threatforge-governed-markdown-assistance",
    );
    assert.equal(result.version, "0.3.0");
    assert.ok(fs.existsSync(outputPath));
    assert.ok(fs.statSync(outputPath).size > 0);
    assert.equal(
      fs.existsSync(path.join(
        engineRoot,
        "tools",
        "MR-0004",
        "vscode-target-project-assistance",
        "package.json",
      )),
      false,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  buildVsCodeCliInvocation,
  buildVsCodeCliUninstallInvocation,
  obsoleteTargetAssistanceExtensionId,
  packageGovernedMarkdownExtension,
  parseInstalledExtensionIds,
} from "../install-vscode-governed-markdown-assistance.mjs";

/**
 * @file Verification of unified VS Code governed Markdown routing and VSIX.
 *
 * @implementsRequirement MR-0002ADR-0006REQ-0002
 * @implementsRequirement MR-0002ADR-0006REQ-0002GOV-0001
 * @implementsRequirement MR-0002ADR-0006REQ-0005
 * @implementsRequirement MR-0002ADR-0006REQ-0005GOV-0001
 * @implementsRequirement MR-0004ADR-0001REQ-0005
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0002
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 */

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "..", "..", "..");
const extensionPath = path.join(
  rootDir,
  "tools",
  "MR-0002",
  "vscode-governed-markdown-assistance",
  "extension.cjs",
);
const require = createRequire(import.meta.url);
const adapter = require(extensionPath);

class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
}
class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
}
class MarkdownString {
  constructor(value) {
    this.value = value;
  }
}
class CompletionItem {
  constructor(label, kind) {
    this.label = label;
    this.kind = kind;
  }
}
class Diagnostic {
  constructor(range, message, severity) {
    this.range = range;
    this.message = message;
    this.severity = severity;
  }
}
class WorkspaceEdit {
  constructor() {
    this.operations = [];
  }
  replace(uri, range, text) {
    this.operations.push({ uri, range, text });
  }
}
class CodeAction {
  constructor(title, kind) {
    this.title = title;
    this.kind = kind;
  }
}

function configurationInspection(values = {}) {
  return {
    inspect(key) {
      assert.equal(key, "engineRoot");
      return { key: "threatforge.engineRoot", ...values };
    },
    get(key) {
      assert.equal(key, "engineRoot");
      return values.workspaceFolderValue ?? values.workspaceValue ?? values.globalValue;
    },
  };
}

function createFakeVscode(folderRoot = rootDir, inspected = {}) {
  return {
    Position,
    Range,
    MarkdownString,
    CompletionItem,
    Diagnostic,
    WorkspaceEdit,
    CodeAction,
    CompletionItemKind: { Struct: 1, Value: 2 },
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
    CodeActionKind: { QuickFix: "quickfix" },
    workspace: {
      getWorkspaceFolder() {
        return { uri: { fsPath: folderRoot } };
      },
      getConfiguration(section) {
        assert.equal(section, "threatforge");
        return configurationInspection(inspected);
      },
    },
  };
}

const fakeVscode = createFakeVscode();

function governedDocument(root) {
  return {
    uri: {
      fsPath: path.join(
        root,
        "docs/reference/project-model/body/macro-requirements/MR-0001_body.md",
      ),
    },
    getText() {
      return "unsaved text";
    },
  };
}

test("adapter forwards current unsaved engine document text and cursor position", () => {
  const request = adapter.createAnalysisRequest(
    fakeVscode,
    governedDocument(rootDir),
    new Position(7, 3),
  );
  assert.equal(request.mode, "engine");
  assert.equal(request.rootDir, rootDir);
  assert.equal(
    request.projectPath,
    "docs/reference/project-model/body/macro-requirements/MR-0001_body.md",
  );
  assert.equal(request.text, "unsaved text");
  assert.deepEqual(request.position, { line: 7, character: 3 });
});

test("adapter classifies an explicit workspace value as a Target Project", () => {
  const targetRoot = path.join(os.tmpdir(), "unified-target-workspace");
  const vscode = createFakeVscode(targetRoot, { workspaceValue: rootDir });
  const request = adapter.createAnalysisRequest(
    vscode,
    governedDocument(targetRoot),
    new Position(1, 2),
  );
  assert.equal(request.mode, "target");
  assert.equal(request.engineRoot, rootDir);
  assert.equal(request.targetRoot, targetRoot);
});

test("adapter resolves a workspace-folder relative Target Project engine root", () => {
  const targetRoot = path.join(rootDir, "examples", "case-studies", "example");
  const engineReference = path.relative(targetRoot, rootDir).replaceAll("\\", "/");
  const vscode = createFakeVscode(targetRoot, { workspaceFolderValue: engineReference });
  const context = adapter.workspaceContext(vscode, governedDocument(targetRoot));
  assert.equal(context.mode, "target");
  assert.equal(context.engineRoot, rootDir);
  assert.equal(context.targetRoot, targetRoot);
});

test("adapter ignores globally inherited engine roots", () => {
  const unrelatedRoot = path.join(os.tmpdir(), "unified-unrelated-workspace");
  const vscode = createFakeVscode(unrelatedRoot, { globalValue: rootDir });
  assert.equal(
    adapter.createAnalysisRequest(vscode, governedDocument(unrelatedRoot), null),
    null,
  );
});

test("adapter ignores unsupported Markdown workspaces", () => {
  const unrelatedRoot = path.join(os.tmpdir(), "unified-unsupported-workspace");
  const vscode = createFakeVscode(unrelatedRoot);
  assert.equal(
    adapter.createAnalysisRequest(vscode, governedDocument(unrelatedRoot), null),
    null,
  );
});

test("adapter preserves canonical completion ordering and identities", () => {
  const result = {
    completions: [
      {
        id: "a",
        kind: "section",
        label: "first",
        detail: "one",
        documentation: "doc one",
        insert_text: "first text",
        filter_text: "## first",
        sort_text: "0000",
        preselect: true,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 2 },
        },
      },
      {
        id: "b",
        kind: "value",
        label: "second",
        detail: "two",
        documentation: "doc two",
        insert_text: "second text",
        sort_text: "0001",
        range: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 0 },
        },
      },
    ],
  };
  const mapped = adapter.mapCompletionItems(fakeVscode, result);
  assert.deepEqual(mapped.map((item) => item.label), ["first", "second"]);
  assert.deepEqual(mapped.map((item) => item.sortText), ["0000", "0001"]);
  assert.deepEqual(mapped.map((item) => item.insertText), ["first text", "second text"]);
  assert.deepEqual(mapped.map((item) => item.filterText), ["## first", "second"]);
  assert.deepEqual(mapped.map((item) => item.preselect), [true, false]);
});

test("adapter preserves diagnostic rule identifiers", () => {
  const result = {
    diagnostics: [
      {
        rule_id: "canonical.rule",
        severity: "error",
        message: "message",
        range: {
          start: { line: 2, character: 1 },
          end: { line: 2, character: 4 },
        },
      },
    ],
  };
  const mapped = adapter.mapDiagnostics(fakeVscode, result);
  assert.equal(mapped[0].code, "canonical.rule");
  assert.equal(mapped[0].message, "message");
  assert.equal(mapped[0].source, "ThreatForge");
});

test("adapter maps only core-supplied quick fixes and performs no direct write", () => {
  const uri = { fsPath: "body.md" };
  const coreRange = {
    start: { line: 3, character: 0 },
    end: { line: 3, character: 2 },
  };
  const editorDiagnostic = new Diagnostic(
    new Range(new Position(3, 0), new Position(3, 2)),
    "missing",
    0,
  );
  editorDiagnostic.code = "canonical.rule";
  const result = {
    diagnostics: [
      {
        rule_id: "canonical.rule",
        message: "missing",
        range: coreRange,
        quick_fix_ids: ["canonical-fix"],
      },
    ],
    quick_fixes: [
      {
        id: "canonical-fix",
        title: "Apply canonical fix",
        edits: [{ range: coreRange, new_text: "replacement" }],
      },
      { id: "unrelated", title: "Unrelated", edits: [] },
    ],
  };
  const actions = adapter.mapCodeActions(
    fakeVscode,
    { uri },
    result,
    [editorDiagnostic],
  );
  assert.equal(actions.length, 1);
  assert.equal(actions[0].title, "Apply canonical fix");
  assert.deepEqual(actions[0].edit.operations[0].text, "replacement");
});

test("thin adapter source contains no canonical section or value inventory", () => {
  const source = fs.readFileSync(extensionPath, "utf8");
  const forbidden = [
    '"Status"',
    '"Context"',
    '"Decision"',
    '"Consequences"',
    '"Functional obligation"',
    '"Governance obligation"',
    '"Draft"',
    '"Accepted"',
  ];
  for (const fragment of forbidden) assert.equal(source.includes(fragment), false, fragment);
  assert.equal(source.includes("writeFile"), false);
  assert.equal(source.includes("appendFile"), false);
});

test("Windows installer passes cmd.exe call tokens without embedded quoting", () => {
  const invocation = buildVsCodeCliInvocation({
    outputPath: "C:\\Temp Folder\\threatforge.vsix",
    platform: "win32",
    env: {
      VSCODE_CLI: "code.cmd",
      ComSpec: "C:\\Windows\\System32\\cmd.exe",
    },
  });
  assert.equal(invocation.command, "C:\\Windows\\System32\\cmd.exe");
  assert.deepEqual(invocation.args, [
    "/d",
    "/c",
    "call",
    "code.cmd",
    "--install-extension",
    "C:\\Temp Folder\\threatforge.vsix",
    "--force",
  ]);
  assert.equal(invocation.args.some((value) => value.includes('"')), false);
});

test("Windows migration uninstalls the obsolete target extension id", () => {
  const invocation = buildVsCodeCliUninstallInvocation({
    extensionId: obsoleteTargetAssistanceExtensionId,
    platform: "win32",
    env: {
      VSCODE_CLI: "code.cmd",
      ComSpec: "C:\\Windows\\System32\\cmd.exe",
    },
  });
  assert.deepEqual(invocation.args.slice(-2), [
    "--uninstall-extension",
    "threatforge.threatforge-target-project-assistance",
  ]);
  assert.ok(parseInstalledExtensionIds(
    "THREATFORGE.THREATFORGE-TARGET-PROJECT-ASSISTANCE\nother.extension\n",
  ).has(obsoleteTargetAssistanceExtensionId));
});

test("VSIX packaging is deterministic and contains the unified adapter", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tf-vsix-test-"));
  try {
    const firstPath = path.join(directory, "first.vsix");
    const secondPath = path.join(directory, "second.vsix");
    const first = packageGovernedMarkdownExtension({ rootDir, outputPath: firstPath });
    const second = packageGovernedMarkdownExtension({ rootDir, outputPath: secondPath });
    const firstBytes = fs.readFileSync(firstPath);
    const secondBytes = fs.readFileSync(secondPath);
    assert.equal(firstBytes.subarray(0, 2).toString("ascii"), "PK");
    assert.equal(
      createHash("sha256").update(firstBytes).digest("hex"),
      createHash("sha256").update(secondBytes).digest("hex"),
    );
    assert.deepEqual(second.entries, first.entries);
    assert.ok(first.entries.includes("extension/extension.cjs"));
    assert.ok(first.entries.includes("extension/package.json"));
    assert.equal(
      first.extensionId,
      "threatforge.threatforge-governed-markdown-assistance",
    );
    assert.equal(first.version, "0.3.0");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

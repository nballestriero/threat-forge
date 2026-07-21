const path = require("node:path");
const { pathToFileURL } = require("node:url");

/**
 * @file Thin VS Code adapter for Target Project governed Markdown assistance.
 *
 * @implementsRequirement MR-0004ADR-0001REQ-0005
 * @implementsRequirement MR-0004ADR-0001REQ-0006
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * The adapter maps workspace/editor coordinates and presentation objects only.
 * Canonical rules are loaded from the configured ThreatForge engine, while the
 * opened workspace is always the target-owned document and BAE source.
 */

const serviceProjectPath = path.join(
  "tools",
  "MR-0004",
  "lib",
  "target-project-markdown-assistance.mjs",
);
const bodyProjectPathPattern =
  /^docs\/reference\/project-model\/body\/.+_body\.md$/u;

const serviceCache = new Map();
const analysisGeneration = new Map();
let diagnosticsCollection;

function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, "");
}

function workspaceContext(vscode, document) {
  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!folder) return null;
  const projectPath = normalizeProjectPath(
    path.relative(folder.uri.fsPath, document.uri.fsPath),
  );
  if (!bodyProjectPathPattern.test(projectPath)) return null;
  const engineRoot = String(
    vscode.workspace
      .getConfiguration("threatforge", folder.uri)
      .get("engineRoot") ?? "",
  ).trim();
  if (!engineRoot) {
    throw new Error(
      "The Target Project workspace is missing the threatforge.engineRoot setting.",
    );
  }
  const configuredEngineRoot =
    path.isAbsolute(engineRoot) || path.win32.isAbsolute(engineRoot)
      ? path.resolve(engineRoot)
      : path.resolve(folder.uri.fsPath, engineRoot);
  return {
    engineRoot: configuredEngineRoot,
    targetRoot: folder.uri.fsPath,
    projectPath,
  };
}

async function loadService(engineRoot, targetRoot) {
  const key = `${path.resolve(engineRoot)}\u0000${path.resolve(targetRoot)}`;
  if (!serviceCache.has(key)) {
    const moduleUrl = pathToFileURL(
      path.join(engineRoot, serviceProjectPath),
    ).href;
    const promise = import(moduleUrl).then((module) =>
      module.createTargetProjectMarkdownAssistanceService({
        engineRoot,
        targetRoot,
      }),
    );
    serviceCache.set(key, promise);
  }
  return serviceCache.get(key);
}

function invalidateServices() {
  for (const promise of serviceCache.values()) {
    Promise.resolve(promise)
      .then((service) => service?.dispose?.())
      .catch(() => {});
  }
  serviceCache.clear();
}

function createAnalysisRequest(vscode, document, position) {
  const context = workspaceContext(vscode, document);
  if (!context) return null;
  return {
    ...context,
    text: document.getText(),
    position: position
      ? { line: position.line, character: position.character }
      : { line: 0, character: 0 },
  };
}

async function analyze(vscode, document, position) {
  const request = createAnalysisRequest(vscode, document, position);
  if (!request) return null;
  const service = await loadService(request.engineRoot, request.targetRoot);
  return service.analyze({
    projectPath: request.projectPath,
    text: request.text,
    position: request.position,
  });
}

function toRange(vscode, range) {
  return new vscode.Range(
    new vscode.Position(range.start.line, range.start.character),
    new vscode.Position(range.end.line, range.end.character),
  );
}

function severity(vscode, value) {
  if (value === "warning") return vscode.DiagnosticSeverity.Warning;
  if (value === "information") return vscode.DiagnosticSeverity.Information;
  if (value === "hint") return vscode.DiagnosticSeverity.Hint;
  return vscode.DiagnosticSeverity.Error;
}

function mapDiagnostics(vscode, result) {
  return (result?.diagnostics ?? []).map((item) => {
    const diagnostic = new vscode.Diagnostic(
      toRange(vscode, item.range),
      item.message,
      severity(vscode, item.severity),
    );
    diagnostic.source = "ThreatForge";
    diagnostic.code = item.rule_id;
    return diagnostic;
  });
}

function mapCompletionItems(vscode, result) {
  return (result?.completions ?? []).map((item) => {
    const completion = new vscode.CompletionItem(
      item.label,
      item.kind === "section"
        ? vscode.CompletionItemKind.Struct
        : vscode.CompletionItemKind.Value,
    );
    completion.detail = item.detail;
    completion.documentation = new vscode.MarkdownString(item.documentation ?? "");
    completion.insertText = item.insert_text;
    completion.range = toRange(vscode, item.range);
    completion.sortText = item.sort_text;
    completion.filterText = item.filter_text ?? item.label;
    completion.preselect = item.preselect === true;
    return completion;
  });
}

function rangesEqual(left, right) {
  return left.start.line === right.start.line &&
    left.start.character === right.start.character &&
    left.end.line === right.end.line &&
    left.end.character === right.end.character;
}

function quickFixIdsForContext(vscode, result, contextDiagnostics) {
  const ids = new Set();
  for (const editorDiagnostic of contextDiagnostics) {
    for (const coreDiagnostic of result?.diagnostics ?? []) {
      if (
        String(editorDiagnostic.code ?? "") === coreDiagnostic.rule_id &&
        editorDiagnostic.message === coreDiagnostic.message &&
        rangesEqual(editorDiagnostic.range, toRange(vscode, coreDiagnostic.range))
      ) {
        for (const id of coreDiagnostic.quick_fix_ids ?? []) ids.add(id);
      }
    }
  }
  return ids;
}

function mapCodeActions(vscode, document, result, contextDiagnostics) {
  const applicableIds = quickFixIdsForContext(
    vscode,
    result,
    contextDiagnostics,
  );
  return (result?.quick_fixes ?? [])
    .filter((fix) => applicableIds.has(fix.id))
    .map((fix, index) => {
      const action = new vscode.CodeAction(
        fix.title,
        vscode.CodeActionKind.QuickFix,
      );
      const edit = new vscode.WorkspaceEdit();
      for (const operation of fix.edits ?? []) {
        edit.replace(
          document.uri,
          toRange(vscode, operation.range),
          operation.new_text,
        );
      }
      action.edit = edit;
      action.isPreferred = index === 0;
      action.diagnostics = contextDiagnostics;
      return action;
    });
}

async function publishDiagnostics(vscode, document) {
  if (!diagnosticsCollection) return;
  let context;
  try {
    context = workspaceContext(vscode, document);
  } catch (error) {
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
      `ThreatForge Target Project analysis failed: ${error.message}`,
      vscode.DiagnosticSeverity.Error,
    );
    diagnostic.source = "ThreatForge";
    diagnosticsCollection.set(document.uri, [diagnostic]);
    return;
  }
  if (!context) {
    diagnosticsCollection.delete(document.uri);
    return;
  }
  const key = document.uri.toString();
  const generation = (analysisGeneration.get(key) ?? 0) + 1;
  analysisGeneration.set(key, generation);
  try {
    const result = await analyze(vscode, document);
    if (analysisGeneration.get(key) !== generation) return;
    diagnosticsCollection.set(document.uri, mapDiagnostics(vscode, result));
  } catch (error) {
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
      `ThreatForge Target Project analysis failed: ${error.message}`,
      vscode.DiagnosticSeverity.Error,
    );
    diagnostic.source = "ThreatForge";
    diagnosticsCollection.set(document.uri, [diagnostic]);
  }
}

async function activate(context) {
  const vscode = require("vscode");
  diagnosticsCollection = vscode.languages.createDiagnosticCollection(
    "threatforge-target-project-markdown",
  );
  context.subscriptions.push(diagnosticsCollection);

  const selector = { language: "markdown", scheme: "file" };
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(selector, {
      async provideCompletionItems(document, position) {
        const result = await analyze(vscode, document, position);
        return result?.supported ? mapCompletionItems(vscode, result) : [];
      },
    }, "#", "-", ":", "["),
    vscode.languages.registerHoverProvider(selector, {
      async provideHover(document, position) {
        const result = await analyze(vscode, document, position);
        const item = result?.hovers?.[0];
        return item
          ? new vscode.Hover(
              new vscode.MarkdownString(item.markdown),
              toRange(vscode, item.range),
            )
          : null;
      },
    }),
    vscode.languages.registerCodeActionsProvider(selector, {
      async provideCodeActions(document, range, codeActionContext) {
        const result = await analyze(vscode, document, range.start);
        return result?.supported
          ? mapCodeActions(
              vscode,
              document,
              result,
              codeActionContext.diagnostics,
            )
          : [];
      },
    }, {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    }),
    vscode.workspace.onDidOpenTextDocument((document) =>
      publishDiagnostics(vscode, document),
    ),
    vscode.workspace.onDidChangeTextDocument((event) =>
      publishDiagnostics(vscode, event.document),
    ),
    vscode.workspace.onDidSaveTextDocument((document) => {
      const relative = normalizeProjectPath(
        vscode.workspace.asRelativePath(document.uri, false),
      );
      if (
        relative.startsWith("docs/reference/project-model/registers/") ||
        relative.startsWith(".vscode/")
      ) {
        invalidateServices();
        for (const candidate of vscode.workspace.textDocuments) {
          publishDiagnostics(vscode, candidate);
        }
      } else {
        publishDiagnostics(vscode, document);
      }
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      analysisGeneration.delete(document.uri.toString());
      diagnosticsCollection.delete(document.uri);
    }),
  );

  for (const document of vscode.workspace.textDocuments) {
    publishDiagnostics(vscode, document);
  }
}

function deactivate() {
  invalidateServices();
  analysisGeneration.clear();
}

module.exports = {
  activate,
  deactivate,
  createAnalysisRequest,
  mapDiagnostics,
  mapCompletionItems,
  mapCodeActions,
  workspaceContext,
};

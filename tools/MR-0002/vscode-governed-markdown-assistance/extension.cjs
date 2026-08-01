const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

/**
 * @file Unified thin VS Code adapter for governed Markdown assistance.
 *
 * @implementsRequirement MR-0002ADR-0005REQ-0003
 * @implementsRequirement MR-0002ADR-0005REQ-0003GOV-0001
 * @implementsRequirement MR-0002ADR-0006REQ-0002
 * @implementsRequirement MR-0002ADR-0006REQ-0002GOV-0001
 * @implementsRequirement MR-0002ADR-0006REQ-0005
 * @implementsRequirement MR-0002ADR-0006REQ-0005GOV-0001
 * @implementsRequirement MR-0004ADR-0001REQ-0005
 * @implementsRequirement MR-0004ADR-0001REQ-0006
 * @derivedFromDecision MR-0002/ADR-0005
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0002
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * The adapter registers one provider set and selects one composition per
 * workspace folder. Engine workspaces delegate to the shared assistance core;
 * declared Target Projects delegate to the target-local composition root.
 * Canonical rules remain outside the extension.
 */

const coreProjectPath = path.join(
  "tools",
  "MR-0002",
  "lib",
  "governed-markdown-assistance.mjs",
);
const targetServiceProjectPath = path.join(
  "tools",
  "MR-0004",
  "lib",
  "target-project-markdown-assistance.mjs",
);
const bodyProjectPathPattern =
  /^docs\/reference\/project-model\/body\/.+_body\.md$/u;
const governedAuthoringRequestSuffix =
  ".governed-document-authoring.yml";
const governedAuthoringSchemaProjectPath = path.join(
  ".vscode",
  "schemas",
  "governed-document-authoring.schema.json",
);
const yamlExtensionId = "redhat.vscode-yaml";
const governedAuthoringSchemaContributorScheme =
  "threatforge-governed-authoring";

const serviceCache = new Map();
const governedAuthoringSchemaPathsByUri = new Map();
const analysisGeneration = new Map();
let diagnosticsCollection;

function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, "");
}

function isRegularFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function isInside(parentPath, candidatePath) {
  const relative = path.relative(
    path.resolve(parentPath),
    path.resolve(candidatePath),
  );
  return relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function readJsonObject(filePath) {
  try {
    const value = JSON.parse(
      fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, ""),
    );
    return value &&
      typeof value === "object" &&
      !Array.isArray(value)
      ? value
      : null;
  } catch {
    return null;
  }
}

function resolveDeclaredTargetSchema(resourcePath, workspaceRoot) {
  let current = path.dirname(path.resolve(resourcePath));
  const boundary = path.resolve(workspaceRoot);

  while (isInside(boundary, current)) {
    const settingsPath = path.join(
      current,
      ".vscode",
      "settings.json",
    );
    const schemaPath = path.join(
      current,
      governedAuthoringSchemaProjectPath,
    );
    const settings = isRegularFile(settingsPath)
      ? readJsonObject(settingsPath)
      : null;
    const engineReference = String(
      settings?.["threatforge.engineRoot"] ?? "",
    ).trim();

    if (
      engineReference &&
      isRegularFile(schemaPath)
    ) {
      const engineRoot =
        path.isAbsolute(engineReference) ||
        path.win32.isAbsolute(engineReference)
          ? path.resolve(engineReference)
          : path.resolve(current, engineReference);
      const schema = readJsonObject(schemaPath);

      if (
        isEngineWorkspace(engineRoot) &&
        schema?.["x-threatforge"]?.ownership_scope ===
          "target_project"
      ) {
        return schemaPath;
      }
    }

    if (current === boundary) break;

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return "";
}

function resolveGovernedAuthoringSchemaPath(
  resourcePath,
  workspaceRoot,
) {
  const resource = path.resolve(String(resourcePath ?? ""));
  const root = path.resolve(String(workspaceRoot ?? ""));

  if (
    !String(resourcePath ?? "").endsWith(
      governedAuthoringRequestSuffix,
    ) ||
    !isInside(root, resource)
  ) {
    return "";
  }

  const targetSchema = resolveDeclaredTargetSchema(
    resource,
    root,
  );
  if (targetSchema) return targetSchema;

  if (!isEngineWorkspace(root)) return "";

  const engineSchema = path.join(
    root,
    governedAuthoringSchemaProjectPath,
  );
  return isRegularFile(engineSchema) ? engineSchema : "";
}

function governedAuthoringSchemaUri(schemaPath) {
  const absolute = path.resolve(schemaPath);
  const encoded = Buffer
    .from(absolute, "utf8")
    .toString("base64url");
  const uri =
    `${governedAuthoringSchemaContributorScheme}` +
    `://schema/${encoded}`;
  governedAuthoringSchemaPathsByUri.set(uri, absolute);
  return uri;
}

function readGovernedAuthoringSchemaContent(uri) {
  const schemaPath = governedAuthoringSchemaPathsByUri.get(
    String(uri ?? ""),
  );

  if (!schemaPath || !isRegularFile(schemaPath)) {
    throw new Error(
      "ThreatForge governed authoring schema URI is unknown.",
    );
  }

  return fs.readFileSync(schemaPath, "utf8");
}

async function registerGovernedAuthoringSchemaContributor(
  vscode,
) {
  const yamlExtension = vscode.extensions.getExtension(
    yamlExtensionId,
  );

  if (!yamlExtension) {
    return {
      registered: false,
      reason: "yaml-extension-missing",
    };
  }

  const api = await yamlExtension.activate();

  if (typeof api?.registerContributor !== "function") {
    return {
      registered: false,
      reason: "yaml-schema-api-unavailable",
    };
  }

  const registered = api.registerContributor(
    governedAuthoringSchemaContributorScheme,
    (resource) => {
      let uri;

      try {
        uri = vscode.Uri.parse(resource);
      } catch {
        return undefined;
      }

      const folder = vscode.workspace.getWorkspaceFolder(uri);
      if (!folder) return undefined;

      const schemaPath = resolveGovernedAuthoringSchemaPath(
        uri.fsPath,
        folder.uri.fsPath,
      );

      return schemaPath
        ? governedAuthoringSchemaUri(schemaPath)
        : undefined;
    },
    readGovernedAuthoringSchemaContent,
  );

  return {
    registered,
    reason: registered ? "" : "contributor-already-registered",
  };
}

function explicitWorkspaceEngineRoot(vscode, folder) {
  const configuration = vscode.workspace.getConfiguration("threatforge", folder.uri);
  const inspected = typeof configuration.inspect === "function"
    ? configuration.inspect("engineRoot")
    : null;
  if (inspected && typeof inspected === "object") {
    if (inspected.workspaceFolderValue !== undefined) {
      return String(inspected.workspaceFolderValue ?? "").trim();
    }
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    if (inspected.workspaceValue !== undefined && workspaceFolders.length <= 1) {
      return String(inspected.workspaceValue ?? "").trim();
    }
    return "";
  }
  return String(configuration.get?.("engineRoot") ?? "").trim();
}

function isEngineWorkspace(rootDir) {
  return isRegularFile(path.join(rootDir, coreProjectPath)) &&
    isRegularFile(path.join(rootDir, targetServiceProjectPath));
}

function classifyWorkspaceFolder(vscode, folder) {
  const targetEngineRoot = explicitWorkspaceEngineRoot(vscode, folder);
  if (targetEngineRoot) {
    const engineRoot =
      path.isAbsolute(targetEngineRoot) || path.win32.isAbsolute(targetEngineRoot)
        ? path.resolve(targetEngineRoot)
        : path.resolve(folder.uri.fsPath, targetEngineRoot);
    return {
      mode: "target",
      engineRoot,
      targetRoot: folder.uri.fsPath,
    };
  }
  if (isEngineWorkspace(folder.uri.fsPath)) {
    return { mode: "engine", rootDir: folder.uri.fsPath };
  }
  return { mode: "unsupported" };
}

function workspaceContext(vscode, document) {
  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!folder) return null;
  const projectPath = normalizeProjectPath(
    path.relative(folder.uri.fsPath, document.uri.fsPath),
  );
  if (!bodyProjectPathPattern.test(projectPath)) return null;
  const classification = classifyWorkspaceFolder(vscode, folder);
  if (classification.mode === "unsupported") return null;
  return { ...classification, projectPath };
}

async function loadEngineService(rootDir) {
  const key = `engine\u0000${path.resolve(rootDir)}`;
  if (!serviceCache.has(key)) {
    const moduleUrl = pathToFileURL(path.join(rootDir, coreProjectPath)).href;
    const promise = import(moduleUrl).then((module) =>
      module.createGovernedMarkdownAssistanceService({ rootDir }),
    );
    serviceCache.set(key, promise);
  }
  return serviceCache.get(key);
}

async function loadTargetService(engineRoot, targetRoot) {
  const key = `target\u0000${path.resolve(engineRoot)}\u0000${path.resolve(targetRoot)}`;
  if (!serviceCache.has(key)) {
    const moduleUrl = pathToFileURL(
      path.join(engineRoot, targetServiceProjectPath),
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
  if (request.mode === "target") {
    const service = await loadTargetService(request.engineRoot, request.targetRoot);
    return service.analyze({
      projectPath: request.projectPath,
      text: request.text,
      position: request.position,
    });
  }
  const service = await loadEngineService(request.rootDir);
  return service.analyze({
    rootDir: request.rootDir,
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
  const diagnosticByCode = new Map(
    contextDiagnostics.map((item) => [String(item.code ?? ""), item]),
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
        edit.replace(document.uri, toRange(vscode, operation.range), operation.new_text);
      }
      action.edit = edit;
      action.isPreferred = index === 0;
      action.diagnostics = [...diagnosticByCode.values()];
      return action;
    });
}

async function publishDiagnostics(vscode, document) {
  if (!diagnosticsCollection) return;
  const context = workspaceContext(vscode, document);
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
      `ThreatForge Markdown analysis failed: ${error.message}`,
      vscode.DiagnosticSeverity.Error,
    );
    diagnostic.source = "ThreatForge";
    diagnosticsCollection.set(document.uri, [diagnostic]);
  }
}

function documentProjectPath(vscode, document) {
  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  return folder
    ? normalizeProjectPath(path.relative(folder.uri.fsPath, document.uri.fsPath))
    : "";
}

function republishOpenDocuments(vscode) {
  for (const document of vscode.workspace.textDocuments) {
    publishDiagnostics(vscode, document);
  }
}

async function activate(context) {
  const vscode = require("vscode");
  await registerGovernedAuthoringSchemaContributor(vscode);
  diagnosticsCollection = vscode.languages.createDiagnosticCollection(
    "threatforge-governed-markdown",
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
      const relative = documentProjectPath(vscode, document);
      if (
        relative.startsWith("docs/reference/project-model/registers/") ||
        relative.startsWith("docs/reference/project-model/contracts/") ||
        relative.startsWith(".vscode/")
      ) {
        invalidateServices();
        republishOpenDocuments(vscode);
      } else {
        publishDiagnostics(vscode, document);
      }
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("threatforge.engineRoot")) return;
      invalidateServices();
      republishOpenDocuments(vscode);
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      analysisGeneration.delete(document.uri.toString());
      diagnosticsCollection.delete(document.uri);
    }),
  );

  republishOpenDocuments(vscode);
}

function deactivate() {
  invalidateServices();
  analysisGeneration.clear();
  governedAuthoringSchemaPathsByUri.clear();
}

module.exports = {
  activate,
  deactivate,
  classifyWorkspaceFolder,
  createAnalysisRequest,
  explicitWorkspaceEngineRoot,
  mapDiagnostics,
  mapCompletionItems,
  mapCodeActions,
  readGovernedAuthoringSchemaContent,
  registerGovernedAuthoringSchemaContributor,
  resolveGovernedAuthoringSchemaPath,
  workspaceContext,
};

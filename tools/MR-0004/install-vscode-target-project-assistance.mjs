#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildVsCodeCliInvocation,
  writeVsix,
} from "../MR-0002/install-vscode-governed-markdown-assistance.mjs";

/**
 * @file Target Project VS Code assistance VSIX packager and installer.
 *
 * @implementsRequirement MR-0004ADR-0001REQ-0005
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * Packages the thin Target Project editor adapter and optionally installs it
 * through the official VS Code CLI. Canonical authoring and Markdown rules are
 * not copied into the extension and remain owned by the ThreatForge engine.
 */

const scriptPath = fileURLToPath(import.meta.url);
const defaultEngineRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const extensionProjectDirectory =
  "tools/MR-0004/vscode-target-project-assistance";

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function loadPackage(engineRoot) {
  const extensionRoot = path.join(
    engineRoot,
    ...extensionProjectDirectory.split("/"),
  );
  const packagePath = path.join(extensionRoot, "package.json");
  if (!fs.existsSync(packagePath)) {
    throw new Error(`Target Project extension package is missing: ${packagePath}`);
  }
  const packageValue = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  for (const field of ["name", "displayName", "description", "version", "publisher"]) {
    if (!String(packageValue[field] ?? "").trim()) {
      throw new Error(`Target Project extension package is missing ${field}.`);
    }
  }
  return { extensionRoot, packageValue };
}

/** Packages the target adapter into one deterministic VSIX. */
export function packageTargetProjectAssistanceExtension({ engineRoot, outputPath }) {
  const resolvedEngineRoot = path.resolve(engineRoot ?? defaultEngineRoot);
  const resolvedOutputPath = path.resolve(outputPath);
  const { extensionRoot, packageValue } = loadPackage(resolvedEngineRoot);
  const entries = new Map();
  for (const fileName of ["package.json", "extension.cjs", "README.md"]) {
    entries.set(
      `extension/${fileName}`,
      fs.readFileSync(path.join(extensionRoot, fileName)),
    );
  }
  const manifest = `<?xml version="1.0" encoding="utf-8"?>\n<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">\n  <Metadata>\n    <Identity Language="en-US" Id="${xmlEscape(packageValue.name)}" Version="${xmlEscape(packageValue.version)}" Publisher="${xmlEscape(packageValue.publisher)}" />\n    <DisplayName>${xmlEscape(packageValue.displayName)}</DisplayName>\n    <Description xml:space="preserve">${xmlEscape(packageValue.description)}</Description>\n    <Categories>Linters</Categories>\n    <Properties>\n      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="${xmlEscape(packageValue.engines?.vscode ?? "*")}" />\n    </Properties>\n  </Metadata>\n  <Installation>\n    <InstallationTarget Id="Microsoft.VisualStudio.Code" />\n  </Installation>\n  <Dependencies />\n  <Assets>\n    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />\n  </Assets>\n</PackageManifest>\n`;
  const contentTypes = `<?xml version="1.0" encoding="utf-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n  <Default Extension="json" ContentType="application/json" />\n  <Default Extension="cjs" ContentType="application/octet-stream" />\n  <Default Extension="md" ContentType="text/markdown" />\n  <Default Extension="vsixmanifest" ContentType="text/xml" />\n</Types>\n`;
  entries.set("extension.vsixmanifest", Buffer.from(manifest, "utf8"));
  entries.set("[Content_Types].xml", Buffer.from(contentTypes, "utf8"));
  writeVsix(entries, resolvedOutputPath);
  return {
    outputPath: resolvedOutputPath,
    extensionId: `${packageValue.publisher}.${packageValue.name}`,
    version: packageValue.version,
    entries: [...entries.keys()].sort(),
  };
}

function installExtension(engineRoot) {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "threatforge-target-project-assistance-"),
  );
  const outputPath = path.join(
    temporaryRoot,
    "threatforge-target-project-assistance.vsix",
  );
  try {
    const packaged = packageTargetProjectAssistanceExtension({
      engineRoot,
      outputPath,
    });
    const invocation = buildVsCodeCliInvocation({ outputPath });
    const result = spawnSync(invocation.command, invocation.args, {
      cwd: engineRoot,
      encoding: "utf8",
      windowsHide: true,
      shell: false,
    });
    if (result.error || result.status !== 0) {
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
      throw new Error(
        `VS Code CLI installation failed${output ? `: ${output}` : `: ${result.error?.message ?? "unknown error"}`}`,
      );
    }
    return { ...packaged, output: String(result.stdout ?? "").trim() };
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function parseArgs(args) {
  if (args.length === 1 && args[0] === "--install") {
    return { mode: "install" };
  }
  if (args.length === 2 && args[0] === "--package") {
    return { mode: "package", outputPath: path.resolve(args[1]) };
  }
  throw new Error(
    "Usage: install-vscode-target-project-assistance.mjs --install | --package <output.vsix>",
  );
}

function main() {
  const engineRoot = process.env.TF_TARGET_PROJECT_ASSISTANCE_ROOT
    ? path.resolve(process.env.TF_TARGET_PROJECT_ASSISTANCE_ROOT)
    : defaultEngineRoot;
  const options = parseArgs(process.argv.slice(2));
  const result = options.mode === "install"
    ? installExtension(engineRoot)
    : packageTargetProjectAssistanceExtension({
        engineRoot,
        outputPath: options.outputPath,
      });
  console.log("ThreatForge Target Project assistance extension prepared.");
  console.log("Implemented requirement: MR-0004ADR-0001REQ-0005");
  console.log(`Extension: ${result.extensionId}`);
  console.log(`Version: ${result.version}`);
  if (options.mode === "package") console.log(`VSIX: ${result.outputPath}`);
  if (options.mode === "install") {
    console.log("Installation completed. Reload the VS Code window to activate the extension.");
    if (result.output) console.log(result.output);
  }
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === directExecutionUrl) {
  try {
    main();
  } catch (error) {
    console.error(`ThreatForge Target Project assistance installation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

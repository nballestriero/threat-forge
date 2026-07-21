#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  installGovernedMarkdownExtension,
  packageGovernedMarkdownExtension,
} from "../MR-0002/install-vscode-governed-markdown-assistance.mjs";

/**
 * @file Compatibility entrypoint for the retired target-only VSIX installer.
 *
 * @implementsRequirement MR-0002ADR-0006REQ-0005
 * @implementsRequirement MR-0002ADR-0006REQ-0005GOV-0001
 * @implementsRequirement MR-0004ADR-0001REQ-0005
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0002
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * Existing tasks may still invoke this path. It packages or installs the single
 * unified extension and never creates the retired Target Project extension id.
 */

const scriptPath = fileURLToPath(import.meta.url);
const defaultEngineRoot = path.resolve(path.dirname(scriptPath), "..", "..");

function parseArgs(args) {
  if (args.length === 1 && args[0] === "--install") return { mode: "install" };
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
    ? installGovernedMarkdownExtension(engineRoot)
    : packageGovernedMarkdownExtension({
        rootDir: engineRoot,
        outputPath: options.outputPath,
      });
  console.log("ThreatForge Target Project installer compatibility entrypoint completed.");
  console.log("Implemented requirement: MR-0002ADR-0006REQ-0005");
  console.log("Implemented requirement: MR-0004ADR-0001REQ-0005");
  console.log(`Extension: ${result.extensionId}`);
  console.log(`Version: ${result.version}`);
  if (options.mode === "package") console.log(`VSIX: ${result.outputPath}`);
  if (options.mode === "install") {
    for (const id of result.removedExtensionIds) {
      console.log(`Removed obsolete extension: ${id}`);
    }
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
    console.error(`ThreatForge Target Project compatibility installation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

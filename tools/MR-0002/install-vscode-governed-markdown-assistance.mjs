#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * @file Local VSIX packager, migrator and installer for unified assistance.
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
 *
 * Packages one deterministic VSIX for engine and Target Project workspaces.
 * Installation removes the obsolete target-only extension when present, then
 * force-installs the unified extension id. Canonical repository files are not
 * modified.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const extensionProjectDirectory =
  "tools/MR-0002/vscode-governed-markdown-assistance";
export const obsoleteTargetAssistanceExtensionId =
  "threatforge.threatforge-target-project-assistance";

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function crc32Table() {
  const table = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

const crcTable = crc32Table();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime() {
  const date = new Date(2026, 0, 1, 0, 0, 0);
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date:
      ((date.getFullYear() - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),
  };
}

/** Creates a deterministic ZIP-compatible VSIX from an entry map. */
export function writeVsix(entries, outputPath) {
  const localParts = [];
  const centralParts = [];
  const names = [...entries.keys()].sort();
  const dos = dosDateTime();
  let offset = 0;

  for (const name of names) {
    const content = entries.get(name);
    const nameBuffer = Buffer.from(name, "utf8");
    const compressed = zlib.deflateRawSync(content);
    const checksum = crc32(content);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(dos.time, 10);
    localHeader.writeUInt16LE(dos.date, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuffer, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(dos.time, 12);
    centralHeader.writeUInt16LE(dos.date, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + compressed.length;
  }

  const localDirectory = Buffer.concat(localParts);
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localDirectory.length, 16);
  end.writeUInt16LE(0, 20);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    Buffer.concat([localDirectory, centralDirectory, end]),
  );
}

function loadExtensionPackage(rootDir) {
  const extensionDir = path.join(rootDir, ...extensionProjectDirectory.split("/"));
  const packagePath = path.join(extensionDir, "package.json");
  const packageValue = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  for (const field of ["name", "displayName", "description", "version", "publisher"]) {
    if (!String(packageValue[field] ?? "").trim()) {
      throw new Error(`Extension package is missing ${field}.`);
    }
  }
  return { extensionDir, packageValue };
}

/** Packages the unified thin adapter into a deterministic VSIX. */
export function packageGovernedMarkdownExtension({ rootDir, outputPath }) {
  const { extensionDir, packageValue } = loadExtensionPackage(rootDir);
  const sourceFiles = ["package.json", "extension.cjs", "README.md"];
  const entries = new Map();
  for (const fileName of sourceFiles) {
    entries.set(
      `extension/${fileName}`,
      fs.readFileSync(path.join(extensionDir, fileName)),
    );
  }

  const manifest = `<?xml version="1.0" encoding="utf-8"?>\n<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">\n  <Metadata>\n    <Identity Language="en-US" Id="${xmlEscape(packageValue.name)}" Version="${xmlEscape(packageValue.version)}" Publisher="${xmlEscape(packageValue.publisher)}" />\n    <DisplayName>${xmlEscape(packageValue.displayName)}</DisplayName>\n    <Description xml:space="preserve">${xmlEscape(packageValue.description)}</Description>\n    <Categories>Linters</Categories>\n    <Properties>\n      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="${xmlEscape(packageValue.engines?.vscode ?? "*")}" />\n    </Properties>\n  </Metadata>\n  <Installation>\n    <InstallationTarget Id="Microsoft.VisualStudio.Code" />\n  </Installation>\n  <Dependencies />\n  <Assets>\n    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />\n  </Assets>\n</PackageManifest>\n`;
  const contentTypes = `<?xml version="1.0" encoding="utf-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n  <Default Extension="json" ContentType="application/json" />\n  <Default Extension="cjs" ContentType="application/octet-stream" />\n  <Default Extension="md" ContentType="text/markdown" />\n  <Default Extension="vsixmanifest" ContentType="text/xml" />\n</Types>\n`;
  entries.set("extension.vsixmanifest", Buffer.from(manifest, "utf8"));
  entries.set("[Content_Types].xml", Buffer.from(contentTypes, "utf8"));
  writeVsix(entries, outputPath);
  return {
    outputPath,
    extensionId: `${packageValue.publisher}.${packageValue.name}`,
    version: packageValue.version,
    entries: [...entries.keys()].sort(),
  };
}

function buildVsCodeCliCommand({ args, platform = process.platform, env = process.env }) {
  const configured = String(env.VSCODE_CLI ?? "").trim();
  const executable = configured || (platform === "win32" ? "code.cmd" : "code");
  if (platform === "win32" && /\.(?:cmd|bat)$/iu.test(executable)) {
    const command = String(env.ComSpec ?? env.COMSPEC ?? "cmd.exe").trim() || "cmd.exe";
    return { command, args: ["/d", "/c", "call", executable, ...args] };
  }
  return { command: executable, args };
}

/** Builds a platform-safe VS Code install invocation. */
export function buildVsCodeCliInvocation({
  outputPath,
  platform = process.platform,
  env = process.env,
}) {
  return buildVsCodeCliCommand({
    args: ["--install-extension", outputPath, "--force"],
    platform,
    env,
  });
}

/** Builds a platform-safe VS Code uninstall invocation. */
export function buildVsCodeCliUninstallInvocation({
  extensionId,
  platform = process.platform,
  env = process.env,
}) {
  return buildVsCodeCliCommand({
    args: ["--uninstall-extension", extensionId],
    platform,
    env,
  });
}

/** Builds a platform-safe VS Code extension-list invocation. */
export function buildVsCodeCliListInvocation({
  platform = process.platform,
  env = process.env,
} = {}) {
  return buildVsCodeCliCommand({ args: ["--list-extensions"], platform, env });
}

function runCli(invocation, rootDir, label) {
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });
  if (result.error || result.status !== 0) {
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(
      `${label} failed${output ? `: ${output}` : `: ${result.error?.message ?? "unknown error"}`}`,
    );
  }
  return String(result.stdout ?? "").trim();
}

export function parseInstalledExtensionIds(output) {
  return new Set(
    String(output ?? "")
      .split(/\r?\n/u)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Packages, migrates and installs the unified extension. */
export function installGovernedMarkdownExtension(rootDir, options = {}) {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "threatforge-governed-markdown-"),
  );
  const outputPath = path.join(
    temporaryDirectory,
    "threatforge-governed-markdown-assistance.vsix",
  );
  try {
    const packaged = packageGovernedMarkdownExtension({ rootDir, outputPath });
    const listOutput = runCli(
      buildVsCodeCliListInvocation(options),
      rootDir,
      "VS Code extension discovery",
    );
    const installed = parseInstalledExtensionIds(listOutput);
    const removedExtensionIds = [];
    if (installed.has(obsoleteTargetAssistanceExtensionId.toLowerCase())) {
      runCli(
        buildVsCodeCliUninstallInvocation({
          extensionId: obsoleteTargetAssistanceExtensionId,
          ...options,
        }),
        rootDir,
        "Obsolete Target Project extension removal",
      );
      removedExtensionIds.push(obsoleteTargetAssistanceExtensionId);
    }
    const output = runCli(
      buildVsCodeCliInvocation({ outputPath, ...options }),
      rootDir,
      "VS Code CLI installation",
    );
    return { ...packaged, output, removedExtensionIds };
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function parseArgs(args) {
  if (args.length === 1 && args[0] === "--install") return { mode: "install" };
  if (args.length === 2 && args[0] === "--package") {
    return { mode: "package", outputPath: path.resolve(args[1]) };
  }
  throw new Error(
    "Usage: install-vscode-governed-markdown-assistance.mjs --install | --package <output.vsix>",
  );
}

function main() {
  const rootDir = process.env.TF_GOVERNED_MARKDOWN_ASSISTANCE_ROOT
    ? path.resolve(process.env.TF_GOVERNED_MARKDOWN_ASSISTANCE_ROOT)
    : defaultRootDir;
  const options = parseArgs(process.argv.slice(2));
  const result = options.mode === "install"
    ? installGovernedMarkdownExtension(rootDir)
    : packageGovernedMarkdownExtension({
        rootDir,
        outputPath: options.outputPath,
      });
  console.log("ThreatForge unified Markdown assistance extension prepared.");
  console.log("Implemented requirement: MR-0002ADR-0006REQ-0005");
  console.log("Implemented requirement: MR-0002ADR-0006REQ-0005GOV-0001");
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
    console.error(
      `ThreatForge unified Markdown assistance installation failed: ${error.message}`,
    );
    process.exitCode = 1;
  }
}

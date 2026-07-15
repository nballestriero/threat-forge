#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * @file Local VSIX packager and installer for the thin VS Code adapter.
 *
 * @implementsRequirement MR-0002ADR-0006REQ-0002
 * @implementsRequirement MR-0002ADR-0006REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0006
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Packages the governed Markdown adapter source into a deterministic temporary
 * VSIX and optionally asks the official VS Code CLI to install it. The tool does
 * not modify canonical repository files.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const extensionProjectDirectory =
  "tools/MR-0002/vscode-governed-markdown-assistance";

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

/**
 * Creates a deterministic ZIP-compatible VSIX from an entry map.
 *
 * @param {Map<string, Buffer>} entries - Archive entries.
 * @param {string} outputPath - Destination VSIX path.
 */
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

/**
 * Packages the current thin adapter into a deterministic VSIX.
 *
 * @param {{rootDir: string, outputPath: string}} input - Packaging input.
 * @returns {{outputPath: string, extensionId: string, version: string, entries: string[]}}
 */
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

function runInstall(rootDir) {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "threatforge-governed-markdown-"),
  );
  const outputPath = path.join(
    temporaryDirectory,
    "threatforge-governed-markdown-assistance.vsix",
  );
  try {
    const packaged = packageGovernedMarkdownExtension({ rootDir, outputPath });
    const executable = process.env.VSCODE_CLI ||
      (process.platform === "win32" ? "code.cmd" : "code");
    const result = spawnSync(
      executable,
      ["--install-extension", outputPath, "--force"],
      {
        cwd: rootDir,
        encoding: "utf8",
        windowsHide: true,
        shell: false,
      },
    );
    if (result.error || result.status !== 0) {
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
      throw new Error(
        `VS Code CLI installation failed${output ? `: ${output}` : `: ${result.error?.message ?? "unknown error"}`}`,
      );
    }
    return { ...packaged, output: String(result.stdout ?? "").trim() };
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
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
    "Usage: install-vscode-governed-markdown-assistance.mjs --install | --package <output.vsix>",
  );
}

function main() {
  const rootDir = process.env.TF_GOVERNED_MARKDOWN_ASSISTANCE_ROOT
    ? path.resolve(process.env.TF_GOVERNED_MARKDOWN_ASSISTANCE_ROOT)
    : defaultRootDir;
  const options = parseArgs(process.argv.slice(2));
  const result = options.mode === "install"
    ? runInstall(rootDir)
    : packageGovernedMarkdownExtension({
        rootDir,
        outputPath: options.outputPath,
      });
  console.log("ThreatForge governed Markdown assistance extension prepared.");
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
    console.error(
      `ThreatForge governed Markdown assistance installation failed: ${error.message}`,
    );
    process.exitCode = 1;
  }
}

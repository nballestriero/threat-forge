#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";

function printHelp() {
  console.log(`Usage:
  npm run context:zip
  npm run context:zip -- --include-git
  npm run context:zip -- --include-git --name threat-forge-handoff-with-git.zip
  npm run context:zip -- --output-dir ./handoff --include-artifacts

Options:
  --include-git          Include the .git directory. Default: excluded.
  --include-artifacts    Include artifacts/. Default: excluded.
  --output-dir <path>    Output directory. Default: ./handoff.
  --name <filename>      ZIP filename. Default includes timestamp.
  --help                 Show this help.
`);
}

function parseArgs(argv) {
  const args = {
    includeGit: false,
    includeArtifacts: false,
    outputDir: "./handoff",
    name: "",
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--include-git") {
      args.includeGit = true;
    } else if (arg === "--include-artifacts") {
      args.includeArtifacts = true;
    } else if (arg === "--output-dir") {
      args.outputDir = argv[index + 1] ?? "";
      index += 1;
    } else if (arg.startsWith("--output-dir=")) {
      args.outputDir = arg.slice("--output-dir=".length);
    } else if (arg === "--name") {
      args.name = argv[index + 1] ?? "";
      index += 1;
    } else if (arg.startsWith("--name=")) {
      args.name = arg.slice("--name=".length);
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function getRepoRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return process.cwd();
  }
}

function normalizeSlash(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function isExcluded(relativePath, options) {
  const normalized = normalizeSlash(relativePath);

  if (!options.includeGit && (normalized === ".git" || normalized.startsWith(".git/"))) {
    return true;
  }

  const pathParts = normalized.split("/");
  if (!options.includeArtifacts && pathParts.includes("artifacts")) {
    return true;
  }

  const excludedPrefixes = [
    ".vs/",
    ".idea/",
    ".next/",
    ".turbo/",
    ".cache/",
    ".pytest_cache/",
    "__pycache__/",
    "node_modules/",
    "backend/node_modules/",
    "frontend/node_modules/",
    "dist/",
    "build/",
    "coverage/",
    "handoff/",
  ];

  for (const prefix of excludedPrefixes) {
    const directory = prefix.slice(0, -1);
    if (normalized === directory || normalized.startsWith(prefix)) {
      return true;
    }
  }

  const basename = path.posix.basename(normalized);
  return [
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    ".suo",
    ".user",
  ].some((name) => basename === name || basename.endsWith(name));
}

function collectFiles(rootDir, options, warnings) {
  const rootAbsolute = path.resolve(rootDir);
  const files = [];

  function visit(directory) {
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      warnings.push(`Skipped unreadable directory: ${normalizeSlash(path.relative(rootAbsolute, directory))} (${error.code ?? error.message})`);
      return;
    }

    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = normalizeSlash(path.relative(rootAbsolute, absolute));

      if (isExcluded(relative, options)) {
        continue;
      }

      try {
        if (entry.isDirectory()) {
          visit(absolute);
        } else if (entry.isFile()) {
          files.push({ absolute, relative });
        }
      } catch (error) {
        warnings.push(`Skipped unreadable entry: ${relative} (${error.code ?? error.message})`);
      }
    }
  }

  visit(rootAbsolute);
  files.sort((a, b) => a.relative.localeCompare(b.relative));
  return files;
}

function makeCrc32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC32_TABLE = makeCrc32Table();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosDate, dosTime };
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value & 0xffff, 0);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function encodedPath(relativePath) {
  return Buffer.from(normalizeSlash(relativePath), "utf8");
}

function createZip(outputZip, files, warnings) {
  const output = fs.openSync(outputZip, "w");
  const centralEntries = [];
  let offset = 0;
  let included = 0;
  let skipped = 0;

  try {
    for (const file of files) {
      let data;
      let stats;

      try {
        data = fs.readFileSync(file.absolute);
        stats = fs.statSync(file.absolute);
      } catch (error) {
        warnings.push(`Skipped locked or unreadable file: ${file.relative} (${error.code ?? error.message})`);
        skipped += 1;
        continue;
      }

      const compressed = zlib.deflateRawSync(data, { level: zlib.constants.Z_BEST_COMPRESSION });
      const name = encodedPath(file.relative);
      const { dosDate, dosTime } = dosDateTime(stats.mtime);
      const crc = crc32(data);

      const localHeader = Buffer.concat([
        u32(0x04034b50),
        u16(20),
        u16(0x0800),
        u16(8),
        u16(dosTime),
        u16(dosDate),
        u32(crc),
        u32(compressed.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        name,
      ]);

      fs.writeSync(output, localHeader);
      fs.writeSync(output, compressed);

      centralEntries.push({
        name,
        crc,
        compressedSize: compressed.length,
        uncompressedSize: data.length,
        dosDate,
        dosTime,
        localHeaderOffset: offset,
      });

      offset += localHeader.length + compressed.length;
      included += 1;
    }

    const centralStart = offset;
    for (const entry of centralEntries) {
      const central = Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(8),
        u16(entry.dosTime),
        u16(entry.dosDate),
        u32(entry.crc),
        u32(entry.compressedSize),
        u32(entry.uncompressedSize),
        u16(entry.name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(entry.localHeaderOffset),
        entry.name,
      ]);

      fs.writeSync(output, central);
      offset += central.length;
    }

    const centralSize = offset - centralStart;
    const eocd = Buffer.concat([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(centralEntries.length),
      u16(centralEntries.length),
      u32(centralSize),
      u32(centralStart),
      u16(0),
    ]);

    fs.writeSync(output, eocd);
  } finally {
    fs.closeSync(output);
  }

  return { included, skipped };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const repoRoot = getRepoRoot();
  const repoName = path.basename(repoRoot);
  const outputDir = path.resolve(repoRoot, args.outputDir || "./handoff");
  const warnings = [];

  fs.mkdirSync(outputDir, { recursive: true });

  let name = args.name?.trim();
  if (!name) {
    name = `${repoName}-handoff${args.includeGit ? "-with-git" : ""}-${timestamp()}.zip`;
  }
  if (!name.endsWith(".zip")) {
    name += ".zip";
  }

  const outputZip = path.join(outputDir, name);
  if (fs.existsSync(outputZip)) {
    fs.rmSync(outputZip, { force: true });
  }

  const files = collectFiles(repoRoot, {
    includeGit: args.includeGit,
    includeArtifacts: args.includeArtifacts,
  }, warnings).filter((file) => path.resolve(file.absolute) !== path.resolve(outputZip));

  const result = createZip(outputZip, files, warnings);

  console.log("Handoff ZIP created:");
  console.log(outputZip);
  console.log(`Repository root: ${repoRoot}`);
  console.log(`Included .git: ${args.includeGit}`);
  console.log(`Included artifacts: ${args.includeArtifacts}`);
  console.log(`Included files: ${result.included}`);
  console.log(`Skipped locked/unreadable files: ${result.skipped}`);

  if (warnings.length) {
    console.log("");
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

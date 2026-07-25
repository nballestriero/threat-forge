import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";

import {
  commonAnalysisFindingAffectedSubjectKinds,
  commonAnalysisFindingModel,
  commonAnalysisFindingProfile,
  commonAnalysisFindingReviewStates,
} from "../lib/common-analysis-finding-model.mjs";
import {
  buildCommonAnalysisFindingEditorSchema,
  commonAnalysisFindingSchemaProjectPath,
  formatCommonAnalysisFindingSchema,
  materializeCommonAnalysisFindingSchema,
} from "../lib/materialize-common-analysis-finding-schema.mjs";

/**
 * @file Common analysis finding editor schema materialization verification.
 *
 * @implementsRequirement MR-0005ADR-0002REQ-0001GOV-0002
 * @derivedFromDecision MR-0005/ADR-0002
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Verifies deterministic model-derived schema construction, explicit write and
 * check behavior, atomic replacement hygiene, canonical-source immutability
 * and implementation traceability for the complete editor-schema slice.
 *
 * Side effects: creates and removes isolated operating-system temporary
 * directories. It reads, but never modifies, governed repository sources.
 */

const testPath = fileURLToPath(import.meta.url);
const testDir = path.dirname(testPath);
const rootDir = path.resolve(testDir, "..", "..", "..");
const modelProjectPath =
  "tools/MR-0005/lib/common-analysis-finding-model.mjs";
const materializerProjectPath =
  "tools/MR-0005/lib/materialize-common-analysis-finding-schema.mjs";
const traceRegistryProjectPath =
  "docs/reference/project-model/registers/implementation/" +
  "implementation-trace.registry.yml";
const requirementId = "MR-0005ADR-0002REQ-0001GOV-0002";

function resolveProjectPath(baseRootDir, projectPath) {
  return path.resolve(
    baseRootDir,
    ...projectPath.split("/"),
  );
}

function withTemporaryProject(callback) {
  const temporaryRoot = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "threat-forge-common-finding-schema-",
    ),
  );

  try {
    return callback(temporaryRoot);
  } finally {
    fs.rmSync(temporaryRoot, {
      recursive: true,
      force: true,
    });
  }
}

async function withTemporaryProjectAsync(callback) {
  const temporaryRoot = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "threat-forge-common-finding-schema-",
    ),
  );

  try {
    return await callback(temporaryRoot);
  } finally {
    fs.rmSync(temporaryRoot, {
      recursive: true,
      force: true,
    });
  }
}

function writeProjectText(baseRootDir, projectPath, text) {
  const absolutePath = resolveProjectPath(
    baseRootDir,
    projectPath,
  );

  fs.mkdirSync(path.dirname(absolutePath), {
    recursive: true,
  });
  fs.writeFileSync(absolutePath, text, "utf8");

  return absolutePath;
}

function hashFile(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function collectFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  const paths = [];

  for (
    const entry of fs.readdirSync(directoryPath, {
      withFileTypes: true,
    })
  ) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      paths.push(...collectFiles(entryPath));
      continue;
    }

    if (entry.isFile()) {
      paths.push(entryPath);
    }
  }

  return paths;
}

function collectAnalysisRecordPaths(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  const ignoredDirectories = new Set([
    ".git",
    "artifacts",
    "node_modules",
    "old",
  ]);
  const paths = [];

  for (
    const entry of fs.readdirSync(directoryPath, {
      withFileTypes: true,
    })
  ) {
    if (
      entry.isDirectory() &&
      ignoredDirectories.has(entry.name)
    ) {
      continue;
    }

    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      paths.push(...collectAnalysisRecordPaths(entryPath));
      continue;
    }

    if (
      entry.isFile() &&
      (
        entry.name.endsWith(".analysis-record.yml") ||
        entry.name.endsWith(".analysis-finding.yml")
      )
    ) {
      paths.push(entryPath);
    }
  }

  return paths;
}

function snapshotCanonicalGovernedSources() {
  const paths = new Set([
    resolveProjectPath(rootDir, modelProjectPath),
    ...collectFiles(
      resolveProjectPath(
        rootDir,
        "docs/reference/project-model/registers",
      ),
    ),
    ...collectFiles(
      resolveProjectPath(
        rootDir,
        "docs/reference/project-model/body/requirements",
      ),
    ),
    ...collectAnalysisRecordPaths(rootDir),
  ]);

  return new Map(
    [...paths]
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((filePath) => [
        path.relative(rootDir, filePath).replaceAll("\\", "/"),
        hashFile(filePath),
      ]),
  );
}

function assertNoTemporarySchemaFiles(baseRootDir) {
  const absoluteSchemaPath = resolveProjectPath(
    baseRootDir,
    commonAnalysisFindingSchemaProjectPath,
  );
  const directoryPath = path.dirname(absoluteSchemaPath);
  const temporaryPrefix =
    `.${path.basename(absoluteSchemaPath)}.`;

  const temporaryPaths = fs.existsSync(directoryPath)
    ? fs.readdirSync(directoryPath).filter(
      (name) =>
        name.startsWith(temporaryPrefix) &&
        name.endsWith(".tmp"),
    )
    : [];

  assert.deepEqual(temporaryPaths, []);
}

function readTraceRecord(registryText, artifactId) {
  const lines = registryText.replace(/\r\n/gu, "\n").split("\n");
  const startIndex = lines.findIndex(
    (line) => line.trim() === `- id: ${artifactId}`,
  );

  assert.notEqual(
    startIndex,
    -1,
    `Missing implementation trace ${artifactId}.`,
  );

  let endIndex = lines.length;

  for (
    let index = startIndex + 1;
    index < lines.length;
    index += 1
  ) {
    if (/^\s*-\s+id:\s+/u.test(lines[index])) {
      endIndex = index;
      break;
    }
  }

  return lines.slice(startIndex, endIndex).join("\n");
}

async function importIsolatedMaterializer(
  temporaryRoot,
  {
    includeModel = true,
    transformModel = (source) => source,
  } = {},
) {
  const isolatedLibDir = resolveProjectPath(
    temporaryRoot,
    "tools/MR-0005/lib",
  );
  const sourceModelPath = resolveProjectPath(
    rootDir,
    modelProjectPath,
  );
  const sourceMaterializerPath = resolveProjectPath(
    rootDir,
    materializerProjectPath,
  );
  const isolatedModelPath = path.join(
    isolatedLibDir,
    "common-analysis-finding-model.mjs",
  );
  const isolatedMaterializerPath = path.join(
    isolatedLibDir,
    "materialize-common-analysis-finding-schema.mjs",
  );

  fs.mkdirSync(isolatedLibDir, {
    recursive: true,
  });

  if (includeModel) {
    fs.writeFileSync(
      isolatedModelPath,
      transformModel(
        fs.readFileSync(sourceModelPath, "utf8"),
      ),
      "utf8",
    );
  }

  fs.copyFileSync(
    sourceMaterializerPath,
    isolatedMaterializerPath,
  );

  return import(
    `${pathToFileURL(isolatedMaterializerPath).href}` +
    `?verification=${process.pid}-${Date.now()}-${Math.random()}`
  );
}

test("editor schema is deterministic and model-derived", () => {
  const modelBefore = JSON.stringify(commonAnalysisFindingModel);
  const profileBefore = JSON.stringify(commonAnalysisFindingProfile);

  const first = buildCommonAnalysisFindingEditorSchema();
  const second = buildCommonAnalysisFindingEditorSchema();
  const firstText = formatCommonAnalysisFindingSchema(first);
  const secondText = formatCommonAnalysisFindingSchema(second);

  assert.deepEqual(first, second);
  assert.equal(firstText, secondText);
  assert.equal(firstText.endsWith("\n"), true);
  assert.equal(firstText.endsWith("\n\n"), false);

  assert.equal(
    first.$schema,
    "https://json-schema.org/draft/2020-12/schema",
  );
  assert.equal(
    first.$id,
    "https://threatforge.local/schemas/" +
      "common-analysis-finding.schema.json",
  );
  assert.equal(first.title, "Common analysis Finding");
  assert.equal(first.type, "object");
  assert.equal(first.additionalProperties, false);
  assert.deepEqual(
    first.required,
    commonAnalysisFindingProfile.required_fields,
  );
  assert.deepEqual(
    Object.keys(first.properties),
    Object.keys(commonAnalysisFindingProfile.fields),
  );

  assert.equal(
    first.properties.id.pattern,
    commonAnalysisFindingModel.identifier_pattern,
  );
  assert.equal(
    first.properties.analysis_record_id.pattern,
    commonAnalysisFindingModel
      .analysis_record_identifier_pattern,
  );
  assert.deepEqual(
    first.properties.affected_subjects.items.properties.kind.enum,
    commonAnalysisFindingAffectedSubjectKinds.map(
      ({ value }) => value,
    ),
  );
  assert.deepEqual(
    first.properties.affected_subjects["x-threatforge-unique-by"],
    commonAnalysisFindingProfile.fields.affected_subjects
      .unique_by,
  );
  assert.deepEqual(
    first.properties.review_state.enum,
    commonAnalysisFindingReviewStates,
  );

  for (const propertyName of first.required) {
    assert.equal(
      first.properties[propertyName].description,
      commonAnalysisFindingProfile.fields[propertyName]
        .description,
      `${propertyName} description must be model-derived.`,
    );
  }

  assert.deepEqual(first["x-threatforge"], {
    model_id: commonAnalysisFindingModel.model_id,
    profile_id: commonAnalysisFindingProfile.profile_id,
    record_domain: commonAnalysisFindingProfile.record_domain,
    file_glob: commonAnalysisFindingProfile.file_glob,
    governed_document_model: false,
    authorable_governed_document_type: false,
    canonical_source: modelProjectPath,
  });

  assert.equal(JSON.stringify(commonAnalysisFindingModel), modelBefore);
  assert.equal(JSON.stringify(commonAnalysisFindingProfile), profileBefore);
});

test("write mode creates, preserves and updates deterministic output", () => {
  const governedSourcesBefore =
    snapshotCanonicalGovernedSources();

  withTemporaryProject((temporaryRoot) => {
    const firstWrite = materializeCommonAnalysisFindingSchema({
      rootDir: temporaryRoot,
      mode: "write",
    });
    const absoluteSchemaPath = resolveProjectPath(
      temporaryRoot,
      commonAnalysisFindingSchemaProjectPath,
    );
    const createdBytes = fs.readFileSync(absoluteSchemaPath);

    assert.equal(firstWrite.status, "created");
    assert.equal(
      firstWrite.path,
      commonAnalysisFindingSchemaProjectPath,
    );
    assertNoTemporarySchemaFiles(temporaryRoot);

    const currentWrite = materializeCommonAnalysisFindingSchema({
      rootDir: temporaryRoot,
      mode: "write",
    });

    assert.equal(currentWrite.status, "current");
    assert.deepEqual(
      fs.readFileSync(absoluteSchemaPath),
      createdBytes,
    );
    assertNoTemporarySchemaFiles(temporaryRoot);

    const staleSchema = JSON.parse(
      fs.readFileSync(absoluteSchemaPath, "utf8"),
    );
    staleSchema.title = "Stale common analysis Finding";
    fs.writeFileSync(
      absoluteSchemaPath,
      formatCommonAnalysisFindingSchema(staleSchema),
      "utf8",
    );

    const updatedWrite = materializeCommonAnalysisFindingSchema({
      rootDir: temporaryRoot,
      mode: "write",
    });

    assert.equal(updatedWrite.status, "updated");
    assert.deepEqual(
      fs.readFileSync(absoluteSchemaPath),
      createdBytes,
    );
    assertNoTemporarySchemaFiles(temporaryRoot);
  });

  assert.deepEqual(
    snapshotCanonicalGovernedSources(),
    governedSourcesBefore,
  );
});

test("check mode accepts current output", () => {
  withTemporaryProject((temporaryRoot) => {
    materializeCommonAnalysisFindingSchema({
      rootDir: temporaryRoot,
      mode: "write",
    });

    const result = materializeCommonAnalysisFindingSchema({
      rootDir: temporaryRoot,
      mode: "check",
    });

    assert.equal(result.status, "current");
    assert.equal(
      result.path,
      commonAnalysisFindingSchemaProjectPath,
    );
    assert.equal(
      result.model_id,
      commonAnalysisFindingModel.model_id,
    );
    assert.equal(
      result.profile_id,
      commonAnalysisFindingProfile.profile_id,
    );
  });
});

test("check mode rejects missing, invalid and stale output", () => {
  withTemporaryProject((temporaryRoot) => {
    assert.throws(
      () => materializeCommonAnalysisFindingSchema({
        rootDir: temporaryRoot,
        mode: "check",
      }),
      /schema is missing:/u,
    );
  });

  withTemporaryProject((temporaryRoot) => {
    writeProjectText(
      temporaryRoot,
      commonAnalysisFindingSchemaProjectPath,
      "{ invalid json\n",
    );

    assert.throws(
      () => materializeCommonAnalysisFindingSchema({
        rootDir: temporaryRoot,
        mode: "check",
      }),
      /schema is invalid JSON:/u,
    );
  });

  withTemporaryProject((temporaryRoot) => {
    writeProjectText(
      temporaryRoot,
      commonAnalysisFindingSchemaProjectPath,
      "{\n  \"stale\": true\n}\n",
    );

    assert.throws(
      () => materializeCommonAnalysisFindingSchema({
        rootDir: temporaryRoot,
        mode: "check",
      }),
      /schema is stale:/u,
    );
  });
});

test("unsupported materialization modes fail deterministically", () => {
  assert.throws(
    () => materializeCommonAnalysisFindingSchema({
      mode: "publish",
    }),
    /Unsupported schema materialization mode: publish\./u,
  );

  assert.throws(
    () => formatCommonAnalysisFindingSchema([]),
    /schema must be an object\./u,
  );
});

test("missing or inconsistent canonical inputs prevent materialization", async () => {
  await withTemporaryProjectAsync(async (temporaryRoot) => {
    await assert.rejects(
      importIsolatedMaterializer(temporaryRoot, {
        includeModel: false,
      }),
      (error) =>
        error?.code === "ERR_MODULE_NOT_FOUND" ||
        /Cannot find module/u.test(String(error?.message)),
    );
  });

  await withTemporaryProjectAsync(async (temporaryRoot) => {
    const isolated = await importIsolatedMaterializer(
      temporaryRoot,
      {
        transformModel(source) {
          const declaration =
            "profile_id: commonAnalysisFindingProfile.profile_id,";

          assert.equal(
            source.includes(declaration),
            true,
            "Expected canonical model profile declaration.",
          );

          return source.replace(
            declaration,
            'profile_id: "inconsistent-common-finding-profile",',
          );
        },
      },
    );

    assert.throws(
      () => isolated.buildCommonAnalysisFindingEditorSchema(),
      /model and profile are inconsistent\./u,
    );
  });
});

test("materializer, schema and suite are implementation-trace linked", () => {
  const registryText = fs.readFileSync(
    resolveProjectPath(rootDir, traceRegistryProjectPath),
    "utf8",
  );
  const expectedArtifacts = [
    {
      id: `${requirementId}IMPL-0001`,
      artifactType: "source_module",
      projectPath: materializerProjectPath,
    },
    {
      id: `${requirementId}IMPL-0002`,
      artifactType: "verification_artifact",
      projectPath:
        "tools/MR-0005/test/" +
        "common-analysis-finding-schema.test.mjs",
    },
    {
      id: `${requirementId}IMPL-0003`,
      artifactType: "fixture",
      projectPath: commonAnalysisFindingSchemaProjectPath,
    },
  ];

  for (const expected of expectedArtifacts) {
    const record = readTraceRecord(registryText, expected.id);

    assert.match(
      record,
      new RegExp(
        `^\\s*artifact_type:\\s*${expected.artifactType}\\s*$`,
        "mu",
      ),
    );
    assert.match(
      record,
      new RegExp(
        `^\\s*-\\s+${requirementId}\\s*$`,
        "mu",
      ),
    );
    assert.equal(
      record.includes(expected.projectPath),
      true,
      `${expected.id} must trace ${expected.projectPath}.`,
    );
  }
});

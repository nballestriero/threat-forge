import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProjectDocumentationExplorerModule } from "../../backend/src/MR-0002/project-documentation-explorer/project-documentation-explorer.module.mjs";

/**
 * @file Static frontend snapshot exporter for the Project Documentation Explorer.
 *
 * @implementsRequirement MR-0002REQ-0012
 * @implementsRequirement MR-0002REQ-0026
 * @implementsRequirement MR-0002REQ-0035
 * @implementsRequirement MR-0002REQ-0036
 * @implementsRequirement MR-0002REQ-0037
 * @derivedFromDecision MR-0002/ADR-0003
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0008
 * @derivedFromDecision MR-0002/ADR-0009
 * @macroRequirement MR-0002
 *
 * The exporter creates a generated, frontend-served JSON snapshot from the
 * governed backend Project Documentation Explorer module. It exists only to
 * validate the first React shell/page slice before an HTTP server contract is
 * wired. The generated file is ignored by Git and is not a canonical source.
 *
 * Side effects: writes `frontend/public/project-documentation-explorer.snapshot.json`.
 * It does not mutate documentation registries, graph files, requirements, ADR,
 * Git state or application runtime storage.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const outputPath = path.join(rootDir, "frontend/public/project-documentation-explorer.snapshot.json");
const principal = Object.freeze({ authenticated: true, role: "registered_user" });

const module = createProjectDocumentationExplorerModule({ rootDir });
const list = await module.controller.listDocumentation({ principal, query: {} });
const detailsById = {};

for (const item of list.items) {
  detailsById[item.id] = await module.controller.getDocumentationEntity({ principal, id: item.id });
}

const snapshot = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  generator: "frontend/tools/export-project-documentation-explorer-snapshot.mjs",
  list,
  details_by_id: detailsById,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

console.log(`Project Documentation Explorer frontend snapshot generated: ${outputPath}`);
console.log(`Items: ${list.items.length}`);
console.log(`Details: ${Object.keys(detailsById).length}`);

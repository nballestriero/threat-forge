import React from "react";
import { createRoot } from "react-dom/client";
import { GovernanceConsoleShell } from "./MR-0002/app-shell/GovernanceConsoleShell.jsx";
import { ProtectedPageFrame } from "./MR-0002/app-shell/ProtectedPageFrame.jsx";
import { ProjectDocumentationExplorerPage } from "./MR-0002/project-documentation-explorer/ProjectDocumentationExplorerPage.jsx";
import { createProjectDocumentationExplorerClient } from "./MR-0002/project-documentation-explorer/project-documentation-explorer.client.js";
import "./styles.css";

/**
 * @file Browser entry point for the first MR-0002 Governance Console frontend slice.
 *
 * @implementsRequirement MR-0002REQ-0002
 * @implementsRequirement MR-0002REQ-0003
 * @implementsRequirement MR-0002REQ-0021
 * @implementsRequirement MR-0002REQ-0022
 * @implementsRequirement MR-0002REQ-0024
 * @implementsRequirement MR-0002REQ-0026
 * @implementsRequirement MR-0002REQ-0039
 * @implementsRequirement MR-0002REQ-0041
 * @implementsRequirement MR-0002REQ-0048
 * @implementsRequirement MR-0002REQ-0049
 * @derivedFromDecision MR-0002/ADR-0001
 * @derivedFromDecision MR-0002/ADR-0005
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0010
 * @derivedFromDecision MR-0002/ADR-0015
 * @derivedFromDecision MR-0002/ADR-0016
 * @macroRequirement MR-0002
 *
 * The entry point composes the shared shell, a protected page frame and the
 * read-only Project Documentation Explorer page using a client-port adapter.
 * It does not read YAML, Markdown, graph files, Git state, filesystem paths or
 * project-model registries from the browser. Local preview data remains snapshot
 * backed by default; explicit frontend configuration may select the governed
 * HTTP data source without changing page rendering code.
 *
 * Side effects: mounts React into the `#root` DOM node and performs browser
 * network reads through the configured client port. It does not mutate
 * project-model sources, write repository files, start backend services or
 * implement identity/RBAC administration.
 */
const client = createProjectDocumentationExplorerClient({
  source: import.meta.env.VITE_PROJECT_DOCUMENTATION_EXPLORER_SOURCE,
  snapshotUrl: "/project-documentation-explorer.snapshot.json",
  httpBaseUrl: import.meta.env.VITE_PROJECT_DOCUMENTATION_EXPLORER_HTTP_BASE_URL,
  snapshotFallback: import.meta.env.VITE_PROJECT_DOCUMENTATION_EXPLORER_SNAPSHOT_FALLBACK !== "false",
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GovernanceConsoleShell workspaceKind="platform" activeNavigationId="project-documentation">
      <ProtectedPageFrame requiredCapability="project_model.documentation.read">
        <ProjectDocumentationExplorerPage client={client} />
      </ProtectedPageFrame>
    </GovernanceConsoleShell>
  </React.StrictMode>,
);

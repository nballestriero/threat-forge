import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { GovernanceConsoleShell } from "./MR-0002/app-shell/GovernanceConsoleShell.jsx";
import { ProtectedPageFrame } from "./MR-0002/app-shell/ProtectedPageFrame.jsx";
import { ProjectDocumentationExplorerPage } from "./MR-0002/project-documentation-explorer/ProjectDocumentationExplorerPage.jsx";
import { createProjectDocumentationExplorerClient } from "./MR-0002/project-documentation-explorer/project-documentation-explorer.client.js";
import { ChildProjectsPage } from "./MR-0003/child-project-management/ChildProjectsPage.jsx";
import { createChildProjectManagementClient } from "./MR-0003/child-project-management/child-project-management.client.js";
import { ChildProjectGovernancePlanPage } from "./MR-0003/child-project-governance-plan/ChildProjectGovernancePlanPage.jsx";
import { createChildProjectGovernancePlanClient } from "./MR-0003/child-project-governance-plan/child-project-governance-plan.client.js";
import "./styles.css";

/**
 * @file Browser entry point for the Governance Console frontend slices.
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
 * @implementsRequirement MR-0003REQ-0012
 * @implementsRequirement MR-0003REQ-0013
 * @implementsRequirement MR-0003REQ-0014
 * @implementsRequirement MR-0003REQ-0015
 * @implementsRequirement MR-0003REQ-0028
 * @implementsRequirement MR-0003REQ-0059
 * @implementsRequirement MR-0003REQ-0060
 * @derivedFromDecision MR-0002/ADR-0001
 * @derivedFromDecision MR-0002/ADR-0005
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0010
 * @derivedFromDecision MR-0002/ADR-0015
 * @derivedFromDecision MR-0002/ADR-0016
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0005
 * @derivedFromDecision MR-0003/ADR-0011
 * @macroRequirement MR-0002
 * @macroRequirement MR-0003
 *
 * The entry point composes the shared shell, protected page frame and the first
 * read-only Project Documentation, Child Projects and Child Project
 * Governance Plan pages using client-port adapters. It does not read YAML, Markdown, graph files, Git state, SQLite,
 * filesystem paths or project-model registries from the browser. Local preview
 * data remains snapshot/static backed by default; explicit frontend
 * configuration may select governed HTTP data sources without changing page
 * rendering code.
 *
 * Side effects: mounts React into the `#root` DOM node and performs browser
 * network reads through configured client ports and can route from a demo child
 * project detail view to the existing Project Documentation Explorer page. It
 * does not mutate project-model sources, write repository files, start backend
 * services, generate child projects, run validators or implement identity/RBAC
 * administration.
 */

const navigationCapabilities = Object.freeze({
  "project-documentation": "project_model.documentation.read",
  "child-projects": "child_projects.view_operational_state",
  "child-governance-plans": "child_project_governance_plan.read",
});

/**
 * Render the configured Governance Console frontend application.
 *
 * @returns {import("react").JSX.Element} App element.
 */
function GovernanceConsoleApp() {
  const [activeNavigationId, setActiveNavigationId] = useState("project-documentation");

  const documentationClient = useMemo(() => createProjectDocumentationExplorerClient({
    source: import.meta.env.VITE_PROJECT_DOCUMENTATION_EXPLORER_SOURCE,
    snapshotUrl: "/project-documentation-explorer.snapshot.json",
    httpBaseUrl: import.meta.env.VITE_PROJECT_DOCUMENTATION_EXPLORER_HTTP_BASE_URL,
    snapshotFallback: import.meta.env.VITE_PROJECT_DOCUMENTATION_EXPLORER_SNAPSHOT_FALLBACK !== "false",
  }), []);

  const childProjectsClient = useMemo(() => createChildProjectManagementClient({
    source: import.meta.env.VITE_CHILD_PROJECT_MANAGEMENT_SOURCE,
    httpBaseUrl: import.meta.env.VITE_CHILD_PROJECT_MANAGEMENT_HTTP_BASE_URL,
  }), []);

  const governancePlanClient = useMemo(() => createChildProjectGovernancePlanClient({
    source: import.meta.env.VITE_CHILD_PROJECT_GOVERNANCE_PLAN_SOURCE,
    httpBaseUrl: import.meta.env.VITE_CHILD_PROJECT_GOVERNANCE_PLAN_HTTP_BASE_URL,
  }), []);

  const requiredCapability = navigationCapabilities[activeNavigationId] ?? navigationCapabilities["project-documentation"];

  return (
    <GovernanceConsoleShell
      workspaceKind="platform"
      activeNavigationId={activeNavigationId}
      onNavigate={setActiveNavigationId}
    >
      <ProtectedPageFrame requiredCapability={requiredCapability}>
        {activeNavigationId === "child-projects" ? (
          <ChildProjectsPage client={childProjectsClient} onOpenProjectModel={() => setActiveNavigationId("project-documentation")} />
        ) : activeNavigationId === "child-governance-plans" ? (
          <ChildProjectGovernancePlanPage client={governancePlanClient} />
        ) : (
          <ProjectDocumentationExplorerPage client={documentationClient} />
        )}
      </ProtectedPageFrame>
    </GovernanceConsoleShell>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GovernanceConsoleApp />
  </React.StrictMode>,
);

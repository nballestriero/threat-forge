import { Icon } from "../design-system/Icon.jsx";
import { shellNavigation } from "../design-system/design-system.tokens.js";

/**
 * @file Shared Governance Console shell for MR-0002 frontend pages.
 *
 * @implementsRequirement MR-0002REQ-0017
 * @implementsRequirement MR-0002REQ-0018
 * @implementsRequirement MR-0002REQ-0019
 * @implementsRequirement MR-0002REQ-0020
 * @implementsRequirement MR-0002REQ-0021
 * @implementsRequirement MR-0002REQ-0022
 * @implementsRequirement MR-0002REQ-0024
 * @implementsRequirement MR-0002REQ-0039
 * @implementsRequirement MR-0002REQ-0041
 * @implementsRequirement MR-0003REQ-0012
 * @implementsRequirement MR-0003REQ-0013
 * @derivedFromDecision MR-0002/ADR-0005
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0010
 * @derivedFromDecision MR-0003/ADR-0002
 * @macroRequirement MR-0002
 *
 * The shell provides a single workspace-aware layout for platform and future
 * child-project contexts. It also exposes the platform-only Child Projects
 * navigation entry when the application shell provides an enabled navigation
 * handler. Navigation entries are semantic and capability-aware;
 * disabled future areas are rendered as visible placeholders without enabling
 * unimplemented runtime behavior. Feature pages must render inside this shell
 * rather than defining local templates.
 *
 * Side effects: none beyond React rendering. It does not fetch data, perform
 * authorization, mutate navigation state, read project-model files or implement
 * child-project/threat-analysis/reporting runtime behavior.
 */

/**
 * Render shared application navigation.
 *
 * @param {{workspaceKind: "platform"|"child-project", activeNavigationId: string, onNavigate?: Function}} props - Navigation props.
 * @returns {import("react").JSX.Element} Navigation element.
 */
function Navigation({ workspaceKind, activeNavigationId, onNavigate }) {
  const items = shellNavigation.filter((item) => workspaceKind === "platform" || !item.platformOnly);
  return (
    <nav className="tf-navigation" aria-label="Governance Console">
      {items.map((item) => (
        <button
          key={item.id}
          className={`tf-navigation__item ${item.id === activeNavigationId ? "is-active" : ""}`}
          type="button"
          disabled={item.disabled || typeof onNavigate !== "function"}
          title={item.disabled ? "Planned capability" : item.label}
          onClick={() => onNavigate?.(item.id)}
        >
          <Icon token={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

/**
 * Render the reusable Governance Console shell.
 *
 * @param {{children: import("react").ReactNode, workspaceKind?: "platform"|"child-project", activeNavigationId?: string, onNavigate?: Function}} props - Shell props.
 * @returns {import("react").JSX.Element} Shell layout.
 */
export function GovernanceConsoleShell({ children, workspaceKind = "platform", activeNavigationId = "project-documentation", onNavigate }) {
  return (
    <div className="tf-shell">
      <aside className="tf-sidebar">
        <div className="tf-brand">
          <div className="tf-brand__mark">TF</div>
          <div>
            <strong>Threat Forge</strong>
            <span>{workspaceKind === "platform" ? "Platform workspace" : "Child project workspace"}</span>
          </div>
        </div>
        <Navigation workspaceKind={workspaceKind} activeNavigationId={activeNavigationId} onNavigate={onNavigate} />
      </aside>
      <div className="tf-workspace">
        <header className="tf-topbar">
          <div>
            <strong>Governance Console</strong>
            <span>Doc-as-Code / security-first workspace</span>
          </div>
          <div className="tf-topbar__principal">registered_user · read-only</div>
        </header>
        <main className="tf-content">{children}</main>
      </div>
    </div>
  );
}

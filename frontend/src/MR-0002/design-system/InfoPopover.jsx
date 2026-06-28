import { useState } from "react";

/**
 * @file Shared information-icon progressive-disclosure component.
 *
 * @implementsRequirement MR-0002REQ-0058
 * @implementsRequirement MR-0003REQ-0065
 * @derivedFromDecision MR-0002/ADR-0023
 * @derivedFromDecision MR-0003/ADR-0013
 * @macroRequirement MR-0002
 *
 * Renders a small information icon that reveals backend-provided or caller-provided
 * explanatory content on mouse hover, keyboard focus and click/tap. It centralizes
 * the compact/detail interaction pattern used by the Project Documentation Explorer
 * and Governance gate plans without owning the semantic content shown inside the
 * popover.
 *
 * Side effects: keeps local open/closed UI state only.
 */

/**
 * Convert a stable id fragment into a DOM-safe identifier.
 *
 * @param {unknown} value - Candidate id fragment.
 * @returns {string} Safe id fragment.
 */
function sanitizeIdFragment(value) {
  return String(value ?? "info").replace(/[^a-zA-Z0-9_-]/g, "-");
}

/**
 * Render a reusable information icon and associated on-demand panel.
 *
 * @param {{id: string, ariaLabel: string, children: import("react").ReactNode}} props - Popover props.
 * @returns {import("react").JSX.Element} Information popover.
 */
export function InfoPopover({ id, ariaLabel, children }) {
  const [isHelpOpen, setHelpOpen] = useState(false);
  const helpId = `${sanitizeIdFragment(id)}-help`;

  return (
    <div
      className={isHelpOpen ? "tf-info-popover is-open" : "tf-info-popover"}
      onMouseEnter={() => setHelpOpen(true)}
      onMouseLeave={() => setHelpOpen(false)}
      onFocus={() => setHelpOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHelpOpen(false);
      }}
    >
      <button
        type="button"
        className="tf-info-popover__button"
        aria-label={ariaLabel}
        aria-expanded={isHelpOpen}
        aria-describedby={isHelpOpen ? helpId : undefined}
        onClick={() => setHelpOpen((current) => !current)}
      >
        i
      </button>
      <div id={helpId} className="tf-info-popover__panel">
        {children}
      </div>
    </div>
  );
}

import { EmptyState } from "../design-system/components.jsx";

/**
 * @file Shared protected page frame for MR-0002 frontend pages.
 *
 * @implementsRequirement MR-0002REQ-0003
 * @implementsRequirement MR-0002REQ-0021
 * @implementsRequirement MR-0002REQ-0041
 * @derivedFromDecision MR-0002/ADR-0001
 * @derivedFromDecision MR-0002/ADR-0005
 * @derivedFromDecision MR-0002/ADR-0010
 * @macroRequirement MR-0002
 *
 * The frame establishes the page-level guard mechanism. In this first slice the
 * guard accepts an optional capability list from a normalized view model and can
 * render a denied state. It deliberately avoids hardcoding final RBAC semantics;
 * future MR-0007 identity/access work can replace the capability source without
 * changing page composition.
 *
 * Side effects: none. It does not authenticate users, manage sessions, mutate
 * route state or implement dynamic RBAC administration.
 */

/**
 * Render a protected content frame.
 *
 * @param {{children: import("react").ReactNode, requiredCapability: string, capabilities?: string[]}} props - Frame props.
 * @returns {import("react").JSX.Element} Protected frame content.
 */
export function ProtectedPageFrame({ children, requiredCapability, capabilities }) {
  const isUnknownCapabilityState = capabilities == null;
  const isAllowed = isUnknownCapabilityState || capabilities.includes(requiredCapability);

  if (!isAllowed) {
    return (
      <EmptyState title="Access denied">
        This page requires capability {requiredCapability}. The final dynamic role and policy model belongs to MR-0007.
      </EmptyState>
    );
  }

  return <section className="tf-page-frame" data-required-capability={requiredCapability}>{children}</section>;
}

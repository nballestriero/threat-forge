import { iconTokens } from "./design-system.tokens.js";

/**
 * @file Shared semantic icon adapter for the MR-0002 frontend design system.
 *
 * @implementsRequirement MR-0002REQ-0025
 * @implementsRequirement MR-0002REQ-0040
 * @implementsRequirement MR-0002REQ-0061
 * @implementsRequirement MR-0002REQ-0068
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0010
 * @derivedFromDecision MR-0002/ADR-0025
 * @derivedFromDecision MR-0002/ADR-0028
 * @macroRequirement MR-0002
 *
 * Pages render icons through semantic tokens such as `navigation.threatAnalysis`,
 * `action.notifications` or `status.accepted`. This adapter maps tokens to a compact built-in outline
 * icon set and to the reusable ThreatForge shield mark. Keeping all concrete SVG
 * drawings here prevents scattered feature-page icons while preserving a future
 * path to replace the implementation with a governed icon-library adapter.
 *
 * Side effects: none. Rendering is pure and does not read files, registries or
 * external icon packages.
 */
const outlineIcons = Object.freeze({
  "document-search": {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M7 3.75h7.25L18 7.5v12.75H7z" },
      { d: "M14.25 3.75V7.5H18" },
      { d: "M9.5 11h5" },
      { d: "M9.5 14h3.25" },
      { d: "M15.25 16.25l2.5 2.5" },
      { d: "M16 16.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5z" },
    ],
  },
  "connected-nodes": {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M7.5 7.75h5.25" },
      { d: "M11.25 16.25h5.25" },
      { d: "M8.75 9.5l6.5 5" },
      { d: "M5.5 10.25a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" },
      { d: "M15.5 9.75a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" },
      { d: "M18.5 18.75a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" },
      { d: "M8.5 18.75a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" },
    ],
  },
  "shield-analysis": {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 3.5 18.25 6v5.25c0 4.1-2.35 6.85-6.25 9.25-3.9-2.4-6.25-5.15-6.25-9.25V6z" },
      { d: "M9 12.25h6" },
      { d: "M12 9.25v6" },
      { d: "M9.75 16.5h4.5" },
    ],
  },
  "project-board": {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M7.25 5.5h9.5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9.5a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2z" },
      { d: "M9 4.25h6v3H9z" },
      { d: "M8.75 11h6.5" },
      { d: "M8.75 14h4" },
      { d: "M8.75 17h6.5" },
    ],
  },
  "clipboard-check": {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M7.25 5.5h9.5a2 2 0 0 1 2 2v10.75a2 2 0 0 1-2 2h-9.5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2z" },
      { d: "M9 3.75h6v3H9z" },
      { d: "m8.75 13 2 2 4.5-5" },
      { d: "M8.75 17h6.5" },
    ],
  },
  "bar-chart": {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M5.5 19.25h13" },
      { d: "M7 16.25v-4.5" },
      { d: "M12 16.25V7.75" },
      { d: "M17 16.25V10.5" },
      { d: "M6.25 4.75h11.5a1 1 0 0 1 1 1v13.5H5.25V5.75a1 1 0 0 1 1-1z" },
    ],
  },
  "arrow-left": {
    viewBox: "0 0 24 24",
    paths: [{ d: "M19 12H5.75" }, { d: "m11 6.75-5.25 5.25L11 17.25" }],
  },
  filter: {
    viewBox: "0 0 24 24",
    paths: [{ d: "M5 7h14" }, { d: "M8 12h8" }, { d: "M10.5 17h3" }],
  },
  x: {
    viewBox: "0 0 24 24",
    paths: [{ d: "m7.5 7.5 9 9" }, { d: "m16.5 7.5-9 9" }],
  },
  search: {
    viewBox: "0 0 24 24",
    paths: [{ d: "M10.75 17a6.25 6.25 0 1 0 0-12.5 6.25 6.25 0 0 0 0 12.5z" }, { d: "m15.25 15.25 4.25 4.25" }],
  },
  "external-link": {
    viewBox: "0 0 24 24",
    paths: [{ d: "M8 8h8v8" }, { d: "m16 8-9 9" }, { d: "M6.5 5.5h12v12" }],
  },
  bell: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M7.25 10.25a4.75 4.75 0 0 1 9.5 0v3.75l1.5 2.5H5.75l1.5-2.5z" },
      { d: "M10.25 18.25a1.75 1.75 0 0 0 3.5 0" },
      { d: "M12 4.25v1.25" },
    ],
  },
  "user-circle": {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 19.25a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5z" },
      { d: "M12 12.25a2.35 2.35 0 1 0 0-4.7 2.35 2.35 0 0 0 0 4.7z" },
      { d: "M7.75 17.05a4.75 4.75 0 0 1 8.5 0" },
    ],
  },
  layers: {
    viewBox: "0 0 24 24",
    paths: [{ d: "m12 4.25 7 4-7 4-7-4z" }, { d: "m5 12 7 4 7-4" }, { d: "m5 15.75 7 4 7-4" }],
  },
  "check-square": {
    viewBox: "0 0 24 24",
    paths: [{ d: "M6.5 5.5h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z" }, { d: "m8.75 12 2 2 4.5-5" }],
  },
  "git-branch": {
    viewBox: "0 0 24 24",
    paths: [{ d: "M7.5 6.5v8.75a3.25 3.25 0 0 0 3.25 3.25H16" }, { d: "M16.5 9.5a3 3 0 0 1-3 3h-2.75" }, { d: "M7.5 8.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5z" }, { d: "M18.5 10.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5z" }, { d: "M18.5 20.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5z" }],
  },
  tags: {
    viewBox: "0 0 24 24",
    paths: [{ d: "M4.75 5.5h6.5l7.75 7.75-5.75 5.75L5.5 11.25z" }, { d: "M8.5 8.75h.1" }],
  },
  "file-text": {
    viewBox: "0 0 24 24",
    paths: [{ d: "M7 3.75h7.25L18 7.5v12.75H7z" }, { d: "M14.25 3.75V7.5H18" }, { d: "M9.5 11.25h5" }, { d: "M9.5 14.25h5" }, { d: "M9.5 17.25h3" }],
  },
  code: {
    viewBox: "0 0 24 24",
    paths: [{ d: "m9 8-4 4 4 4" }, { d: "m15 8 4 4-4 4" }, { d: "m13 6.5-2 11" }],
  },
  "check-circle": {
    viewBox: "0 0 24 24",
    paths: [{ d: "M12 19.25a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5z" }, { d: "m8.75 12.25 2.25 2.25 4.25-5" }],
  },
  "circle-dashed": {
    viewBox: "0 0 24 24",
    paths: [{ d: "M12 19.25a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5z", strokeDasharray: "3 3" }],
  },
  "badge-check": {
    viewBox: "0 0 24 24",
    paths: [{ d: "m12 3.75 2.25 1.65 2.75-.15.85 2.6 2.15 1.75-1 2.55 1 2.55-2.15 1.75-.85 2.6-2.75-.15L12 20.25 9.75 18.6l-2.75.15-.85-2.6L4 14.4l1-2.55-1-2.55 2.15-1.75.85-2.6 2.75.15z" }, { d: "m8.75 12.25 2.25 2.25 4.25-5" }],
  },
  clock: {
    viewBox: "0 0 24 24",
    paths: [{ d: "M12 19.25a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5z" }, { d: "M12 8v4.25l2.75 1.5" }],
  },
  "circle-help": {
    viewBox: "0 0 24 24",
    paths: [{ d: "M12 19.25a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5z" }, { d: "M9.75 9.5a2.35 2.35 0 0 1 4.5.75c0 1.9-2.25 2.15-2.25 3.75" }, { d: "M12 16.75h.1" }],
  },
  dot: {
    viewBox: "0 0 24 24",
    paths: [{ d: "M12 12h.1" }],
  },
});

/**
 * Resolve a dotted semantic token into a concrete icon identifier.
 *
 * @param {string} token - Semantic icon token, for example `entity.requirement`.
 * @returns {string} Concrete icon id or the original token when no mapping exists.
 */
function resolveIconName(token) {
  return token.split(".").reduce((current, segment) => current?.[segment], iconTokens) ?? token;
}

/**
 * Render a semantic outline icon token.
 *
 * @param {{token: string, label?: string, className?: string}} props - Icon rendering props.
 * @returns {import("react").JSX.Element} Accessible SVG icon.
 */
export function Icon({ token, label, className = "" }) {
  const iconName = resolveIconName(token);
  const icon = outlineIcons[iconName] ?? outlineIcons.dot;
  const titleId = label ? `tf-icon-title-${token.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}` : undefined;
  return (
    <svg
      className={`tf-icon ${className}`}
      viewBox={icon.viewBox}
      role={label ? "img" : undefined}
      aria-labelledby={titleId}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {label ? <title id={titleId}>{label}</title> : null}
      {icon.paths.map((path, index) => (
        <path key={`${iconName}-${index}`} {...path} />
      ))}
    </svg>
  );
}

/**
 * Render the reusable ThreatForge shield mark.
 *
 * @param {{label?: string, className?: string}} props - Brand mark props.
 * @returns {import("react").JSX.Element} Accessible brand SVG.
 */
export function ThreatForgeMark({ label = "ThreatForge", className = "" }) {
  const titleId = "tf-brand-mark-title";
  return (
    <svg className={`tf-brand-mark ${className}`} viewBox="0 0 32 32" role="img" aria-labelledby={titleId} focusable="false">
      <title id={titleId}>{label}</title>
      <path className="tf-brand-mark__shield" d="M16 2.75 27 7v8.25c0 6.35-4.05 10.75-11 14-6.95-3.25-11-7.65-11-14V7z" />
      <path className="tf-brand-mark__cut" d="M9.5 8.25h13v3h-4.75v11.5h-3.5v-11.5H9.5z" />
      <path className="tf-brand-mark__cut" d="M18.75 13h5.25v3h-5.25z" />
      <path className="tf-brand-mark__cut" d="M18.75 18h4.25v3h-4.25z" />
    </svg>
  );
}

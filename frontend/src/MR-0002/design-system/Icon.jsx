import { iconTokens } from "./design-system.tokens.js";

/**
 * @file Shared semantic icon adapter for the MR-0002 frontend design system.
 *
 * @implementsRequirement MR-0002REQ-0025
 * @implementsRequirement MR-0002REQ-0040
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0010
 * @macroRequirement MR-0002
 *
 * Pages render icons through semantic tokens such as `navigation.threatAnalysis`
 * or `status.accepted`. This adapter maps tokens to a minimal built-in glyph set
 * for the first slice, keeping the concrete icon implementation replaceable by
 * a future SVG/icon-library adapter without touching feature pages.
 *
 * Side effects: none. Rendering is pure and does not read files, registries or
 * external icon packages.
 */
const glyphs = Object.freeze({
  "book-open": "▤",
  network: "◇",
  shield: "⬟",
  "folder-tree": "▦",
  chart: "▥",
  "arrow-left": "←",
  filter: "⌁",
  x: "×",
  search: "⌕",
  "external-link": "↗",
  layers: "▧",
  "check-square": "☑",
  "git-branch": "⑂",
  tags: "⌑",
  "file-text": "□",
  code: "{}",
  "check-circle": "✓",
  "circle-dashed": "○",
  "badge-check": "✓",
  clock: "◷",
  "circle-help": "?",
});

/**
 * Resolve a dotted semantic token into a concrete glyph identifier.
 *
 * @param {string} token - Semantic icon token, for example `entity.requirement`.
 * @returns {string} Concrete glyph id or the original token when no mapping exists.
 */
function resolveIconName(token) {
  return token.split(".").reduce((current, segment) => current?.[segment], iconTokens) ?? token;
}

/**
 * Render a semantic icon token.
 *
 * @param {{token: string, label?: string, className?: string}} props - Icon rendering props.
 * @returns {import("react").JSX.Element} Accessible icon span.
 */
export function Icon({ token, label, className = "" }) {
  const iconName = resolveIconName(token);
  const glyph = glyphs[iconName] ?? "•";
  return (
    <span className={`tf-icon ${className}`} aria-label={label} aria-hidden={label ? undefined : true} title={label}>
      {glyph}
    </span>
  );
}

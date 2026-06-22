import { Icon } from "./Icon.jsx";
import { statusLabels } from "./design-system.tokens.js";

/**
 * @file Shared MR-0002 frontend design-system components.
 *
 * @implementsRequirement MR-0002REQ-0022
 * @implementsRequirement MR-0002REQ-0023
 * @implementsRequirement MR-0002REQ-0024
 * @implementsRequirement MR-0002REQ-0039
 * @implementsRequirement MR-0002REQ-0041
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0010
 * @macroRequirement MR-0002
 *
 * These components define the first reusable presentation primitives for the
 * Governance Console shell and read-only explorer pages. They are deliberately
 * domain-neutral and render only caller-provided view models. They do not read
 * YAML, Markdown, graph files, Git state, filesystem paths or project-model
 * registries.
 *
 * Side effects: none beyond React rendering and caller-provided event handlers.
 */

/**
 * Shared button primitive.
 *
 * @param {{children: import("react").ReactNode, onClick?: Function, variant?: "primary"|"secondary", type?: "button"|"submit", disabled?: boolean}} props - Button props.
 * @returns {import("react").JSX.Element} Button element.
 */
export function Button({ children, onClick, variant = "secondary", type = "button", disabled = false }) {
  return (
    <button className={`tf-button tf-button--${variant}`} type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/**
 * Shared card container.
 *
 * @param {{children: import("react").ReactNode, className?: string}} props - Card props.
 * @returns {import("react").JSX.Element} Card element.
 */
export function Card({ children, className = "" }) {
  return <article className={`tf-card ${className}`}>{children}</article>;
}

/**
 * Shared search input.
 *
 * @param {{value: string, onChange: Function, placeholder?: string}} props - Search props.
 * @returns {import("react").JSX.Element} Search field.
 */
export function SearchInput({ value, onChange, placeholder = "Search" }) {
  return (
    <label className="tf-field">
      <span><Icon token="action.search" /> Search</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

/**
 * Shared select field.
 *
 * @param {{label: string, value: string, values: Array<{value: string, label?: string, count?: number}>, onChange: Function}} props - Select props.
 * @returns {import("react").JSX.Element} Select field.
 */
export function SelectField({ label, value, values, onChange }) {
  return (
    <label className="tf-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {values.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label ?? option.value}{Number.isFinite(option.count) ? ` (${option.count})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Shared status badge.
 *
 * @param {{value?: string, label?: string}} props - Badge props.
 * @returns {import("react").JSX.Element|null} Status badge or null.
 */
export function StatusBadge({ value, label }) {
  if (!value) return null;
  return (
    <span className={`tf-badge tf-badge--${String(value).replaceAll("_", "-")}`}>
      <Icon token={`status.${value}`} /> {label ?? statusLabels[value] ?? value}
    </span>
  );
}

/**
 * Shared empty-state block.
 *
 * @param {{title: string, children?: import("react").ReactNode}} props - Empty-state props.
 * @returns {import("react").JSX.Element} Empty-state element.
 */
export function EmptyState({ title, children }) {
  return (
    <div className="tf-empty-state">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

/**
 * Shared markdown body container. Markdown is intentionally displayed as text in
 * this first slice to avoid introducing an ungoverned Markdown renderer.
 *
 * @param {{markdown?: string}} props - Markdown body props.
 * @returns {import("react").JSX.Element} Preformatted body block.
 */
export function MarkdownBody({ markdown }) {
  return <pre className="tf-markdown-body">{markdown || "No body content available."}</pre>;
}

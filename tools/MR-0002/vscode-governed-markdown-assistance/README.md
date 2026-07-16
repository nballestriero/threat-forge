# ThreatForge Governed Markdown Assistance

This workspace extension delegates governed Markdown analysis to the repository's shared, editor-independent assistance core.

It provides live diagnostics, visible section completion after typing `##`, canonical hover information and explicit quick fixes for existing governed body documents. Missing-section diagnostics are anchored at their canonical insertion point.

Registry-mirrored controlled sections expose only the current authoritative label as a body completion. Their hover explains the source registry member, current value, value set and the meaning of every controlled lifecycle value.

The extension does not own canonical headings, controlled values or repository mutations.

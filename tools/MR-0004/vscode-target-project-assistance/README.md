# ThreatForge Target Project Assistance

This thin VS Code adapter analyzes governed Markdown bodies in a Target Project.

The workspace setting `threatforge.engineRoot` identifies the ThreatForge engine. Canonical profiles, controlled values, reference grammar and analysis logic remain engine-owned; governed documents and Base Analysis Elements are resolved only from the opened Target Project.

The extension is installed through the generated task `ThreatForge: install target Markdown assistance` and becomes active after reloading the VS Code window.

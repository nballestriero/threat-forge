# ThreatForge Unified Markdown Assistance

One local VS Code extension provides governed Markdown diagnostics, completion,
hover and quick fixes in both supported workspace modes:

- **ThreatForge engine** — the opened folder contains the engine-owned governed
  Markdown core and Target Project composition root;
- **Target Project** — the opened folder explicitly declares
  `threatforge.engineRoot` in workspace or workspace-folder settings.

The adapter registers one provider set. It delegates engine documents to the
shared MR-0002 assistance core and target documents to the MR-0004 Target Project
composition root. Unsupported Markdown workspaces are ignored silently.

A user-level or globally inherited `threatforge.engineRoot` value is never used
to classify a workspace. Relative engine roots are resolved from the Target
Project workspace folder, which keeps repository-contained case studies
portable.

Install from the ThreatForge root:

```powershell
node .\tools\MR-0002\install-vscode-governed-markdown-assistance.mjs --install
```

Installation removes the obsolete
`threatforge.threatforge-target-project-assistance` extension when present and
force-installs `threatforge.threatforge-governed-markdown-assistance`.
Reload the VS Code window after installation.

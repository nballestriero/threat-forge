# Retired Target Project extension package

The former `threatforge.threatforge-target-project-assistance` VSIX has been
retired. Target Project support is now part of the single extension:

```text
threatforge.threatforge-governed-markdown-assistance
```

`extension.cjs` remains only as a repository compatibility module. This
directory intentionally contains no `package.json`, so it cannot be packaged or
installed as a second VS Code extension.

Use the unified installer:

```powershell
node .\tools\MR-0002\install-vscode-governed-markdown-assistance.mjs --install
```

# Handoff ZIP tool

NPM commands from the repository root:

```bash
npm run context:zip
npm run context:zip -- --include-git
npm run context:zip -- --include-git --name threat-forge-handoff-with-git.zip
```

Default exclusions:

- `.git/`
- `.vs/`
- `.idea/`
- `artifacts/`
- `node_modules/`
- common build/cache folders
- `handoff/`

Use `--include-git` only when the next chat needs the local Git history and branch state.

Locked Visual Studio cache files under `.vs/` are intentionally excluded.

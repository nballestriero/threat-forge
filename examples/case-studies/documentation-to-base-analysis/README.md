# Documentation to Base Analysis Case Study

This repository-contained Target Project is the didactic case study used to demonstrate the transition from governed documentation to a methodology-neutral Base Analysis.

## Purpose

The case study starts from governed documentary sources and an intentionally empty Base Analysis inventory. Its purpose is to make each analytical step observable: documentary reading, evidence identification, candidate review, canonical BAE registration, governed references, validation and derivation of a static data-flow view.

The case study is not an automated test fixture and is not the source of the Target Project generator template. External Target Projects remain independently creatable in any valid explicit destination.

## Generation provenance

The initial Target Project structure was created on 2026-07-21 with the maintained ThreatForge generator:

```powershell
node .\tools\MR-0004\create-target-project.mjs `
  --destination-root .\examples\case-studies\documentation-to-base-analysis `
  --project-id documentation-to-base-analysis `
  --project-title "Documentation to Base Analysis Case Study" `
  --author "Nicolo Ballestriero" `
  --decision-date "2026-07-21"
```

After generation, the demonstration BAE records supplied by the generic template were deliberately removed and the governed documentation was rewritten as the pre-analysis evidence corpus. The generator itself was not changed by that normalization.

## Pre-analysis baseline

At this baseline:

- the governed Macro-requirement, Decision and Functional Requirement are the authoritative documentary sources;
- the Base Analysis inventory is empty;
- no canonical BAE identifier is referenced by the documentation;
- no DFD has been asserted;
- the Functional Requirement remains in draft because its Base Analysis acceptance condition has not yet been satisfied;
- the VS Code workspace uses a repository-relative ThreatForge engine reference.

## Demonstration workflow

1. Read the governed documentation without assuming a predefined DFD.
2. Identify documentary evidence for actors, components, data resources, boundaries and data flows.
3. Record proposed candidates separately from the canonical inventory.
4. Review each candidate against its documentary source and precedence.
5. Register only accepted Base Analysis Elements and their relations.
6. Add eligible governed BAE references to the documentary bodies.
7. Run the Target Project checker.
8. Derive a static DFD from the validated canonical inventory.
9. Record ambiguities and any resulting documentation or ThreatForge changes.

## Validation

Run these commands from the ThreatForge repository root:

```powershell
node .\tools\MR-0004\run-target-project-check.mjs `
  --target-root .\examples\case-studies\documentation-to-base-analysis
```

```powershell
node .\tools\MR-0004\materialize-target-project-vscode-workspace.mjs `
  --check `
  --engine-root . `
  --target-root .\examples\case-studies\documentation-to-base-analysis
```

The case study is versioned by the parent ThreatForge repository and must not contain a nested Git repository.

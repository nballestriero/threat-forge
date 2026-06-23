# ADR-0007 — Governed CI execution boundary

## Status

Accepted.

## Context

Threat-forge now has a governed local verification path through `npm run repo:check` and `npm run repo:commit-push`. The stabilization gate sequence has made the runner responsible for frontend build verification, runtime unit tests, lockfile registry and integrity checks, runtime source traceability coverage and orphan governed body detection.

The next stability risk is that these checks currently execute only on the developer workstation. A remote CI backstop is needed, but it must not become a second validation model. A GitHub Actions workflow that duplicates the individual gate commands would drift from the governed runner and weaken MR-0000 as the single repository operation control boundary.

## Decision

MR-0000 shall own a minimal governed CI execution boundary.

The CI workflow shall execute the governed repository check as the authoritative verification command. It shall install dependencies from the lockfile with `npm ci` and then run `npm run repo:check`. The workflow shall avoid duplicating the internal gate list because the runner is the canonical place where repository gates are ordered, named and extended.

The CI workflow shall be read-only with respect to repository state. It shall not commit, push, tag, publish, deploy, generate release artifacts or mutate governed records. Local developers must continue to use the governed repository commands for local verification and commits.

## Scope

In scope:

- defining CI as a remote execution surface for the governed runner;
- requiring `npm ci` before the governed check;
- requiring `npm run repo:check` as the canonical CI verification command;
- keeping the workflow minimal for pushes and pull requests targeting `master`;
- preventing duplication of individual gate commands in the workflow.

Out of scope:

- adding the GitHub Actions workflow in this decision micropasso;
- adding audit, license, secrets, deployment or release checks;
- introducing a CI matrix;
- validating OpenAPI or HTTP route contracts;
- changing local governed commit and push behavior.

## Consequences

### Positive consequences

* Local and CI verification stay aligned because both use the same governed runner.
* New gates added to `repo:check` automatically become part of CI.
* The CI workflow remains small enough to review and maintain.
* The project gains a remote backstop without weakening the Doc-as-Code governance model.

### Negative consequences

* CI will initially provide only the checks already present in the governed runner.
* CI failures will depend on the runner output, so diagnostics must stay clear in the runner itself.
* Future CI concerns require additional governed decisions instead of being added opportunistically.

## Follow-up

1. Add a functional requirement for a minimal governed CI repository check workflow.
2. Add graph relations from MR-0000 to this decision and from the decision to the derived requirement.
3. In a later micropasso, add a GitHub Actions workflow that runs `npm ci` and `npm run repo:check`.
4. Introduce audit, license, secrets, OpenAPI or release checks only through separate governed decisions and requirements.

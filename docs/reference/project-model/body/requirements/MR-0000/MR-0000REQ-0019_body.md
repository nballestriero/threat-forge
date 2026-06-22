# MR-0000REQ-0019 — Lockfile registry and dependency integrity guard

## Intent

The project has already encountered a practical lockfile risk: generated lockfiles can contain non-public registry URLs or incomplete package metadata from the environment that created them. A security-first repository must fail fast when dependency metadata points to unapproved registries or lacks expected integrity information.

## Requirement

The repository must provide a deterministic lockfile guard that detects forbidden registry URLs and dependency integrity issues before governed commits are accepted.

## Scope

This requirement governs `package-lock.json` and npm dependency metadata. It does not choose a full dependency-update policy, Dependabot/Renovate setup, license policy or vulnerability-audit threshold.

## Rules

- The guard must scan lockfile package entries for forbidden internal or environment-specific registry URLs.
- The guard must allow only approved public or explicitly governed registry domains.
- The guard must detect missing integrity metadata for package entries where npm should provide integrity hashes.
- The guard must produce diagnostics naming the package path and invalid field.
- The guard must be suitable for inclusion in `repo:check` after it is implemented.

## Acceptance Criteria

```gherkin
Scenario: Internal registry URL in package lock fails
  Given package-lock.json contains a resolved URL for an unapproved internal registry
  When the lockfile guard runs
  Then the guard fails
  And the diagnostic identifies the offending package entry
```

## Verification Expectation

The implementation should include positive and negative fixtures or a focused self-test for forbidden registry URLs and missing integrity metadata.

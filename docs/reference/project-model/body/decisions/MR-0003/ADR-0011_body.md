# ADR-0011 — Gate Applicability and Profile Registry Contract

## Status

Accepted.

## Context

Threat-forge now defines a mandatory child-project governance baseline, a child-project archetype/capability model, and provisional gate applicability classes. These decisions establish why a gate may be required, planned, unsupported, platform-only or not applicable, and they require every developed governance capability to be validated inside threat-forge before it governs child projects.

The next step must make that vocabulary registrable. Without a registry contract, future gate orchestration would risk hardcoding profile logic in tools, mixing platform-only checks with child-project checks, hiding skipped gates, or applying child-project enforcement that has not been dogfooded in threat-forge.

The registry contract must remain provisional enough to grow with Base Analysis, STRIDE, STRIDE-AI, data, AI, CI/CD, deployment and language adapter work. It must also be concrete enough that future tooling can validate profile definitions, calculate an execution plan and produce evidence for pass, fail, warning, planned, unsupported and not-applicable outcomes.

## Decision

Threat-forge will define child-project governance registry contracts for gate applicability, capabilities, governance gates, governance profiles, validation surfaces and execution planning results. The contracts will be the source of truth for future child-project gate orchestration and UI reporting.

The intended registry family is:

- `gate-applicability-classes.registry.yml`, for the controlled vocabulary of applicability classes;
- `governance-capabilities.registry.yml`, for capability facets and evidence states;
- `governance-gates.registry.yml`, for gate metadata, applicability inputs, execution target, validation surfaces and implementation links;
- `governance-profiles.registry.yml`, for provisional profile compositions;
- `validation-surfaces.registry.yml`, for threat-forge self-checks, demo workspaces, fixtures, snapshots, contract tests and runtime tests that validate gates before child-project enforcement.

The future default location for these registries is:

```text
docs/reference/project-model/registers/child-project-governance/
```

Each gate registry record must declare at least:

- stable gate id;
- label and description;
- owner macro requirement;
- applicability class;
- target scopes, such as `platform_self`, `demo_child_project` or `child_project`;
- required or enabling capabilities;
- validation surfaces inside threat-forge;
- implementation artifact reference when implemented;
- result behavior when not applicable;
- unsupported behavior when the capability exists but no adapter/method exists;
- relationship to the mandatory child-project baseline and Threat Analysis lifecycle when relevant.

Each profile record must compose gates from the mandatory baseline, capability facets, target scope and provisional method availability. Profiles must not hardcode final STRIDE, STRIDE-AI or language-specific enforcement while those methods and adapters remain under development.

Each execution plan result must preserve skipped or deferred gates. A gate that does not run must still be reported with status, reason, evidence, profile context, capability context and validation-surface maturity.

## Scope

In scope:

- defining registry contracts for governance gates, capabilities, profiles, validation surfaces and planning results;
- defining required fields for future registry records;
- defining evidence expectations for not-applicable and unsupported outcomes;
- preserving threat-forge dogfooding as a required validation surface principle;
- preparing future backend, UI and tooling work to read governed registries instead of hardcoding profile matrices.

Out of scope:

- adding the concrete registry files;
- adding JSON schemas or validators;
- implementing the gate orchestrator;
- implementing capability detectors;
- implementing Base Analysis, STRIDE or STRIDE-AI gates;
- implementing language/ecosystem adapters;
- changing frontend UI behavior;
- mutating child project repositories;
- enforcing final child-project gate matrices.

## Consequences

### Positive consequences

- Future gate orchestration can be driven by governed registries instead of hardcoded project-type branches.
- UI and reports can explain why each gate ran, did not run, was planned or was unsupported.
- Every gate can remain traceable to validation surfaces inside threat-forge.
- Profiles can evolve as Base Analysis, STRIDE, STRIDE-AI and other methods mature.
- Child-project enforcement can be introduced incrementally without losing auditability.

### Negative consequences

- The registry contract adds another governed model that must later receive schemas and validators.
- Early profiles will contain provisional and planned states until implementation catches up.
- Gate authors must maintain metadata in addition to executable checks.
- The orchestrator must reason over applicability, validation maturity and execution status separately.

## Follow-up

1. Add the child-project governance registry files under the governed Project Model registers.
2. Add a schema and validator for the registry contracts.
3. Add positive and negative fixtures for invalid gate/profile/capability records.
4. Implement a read-only execution-plan preview that reports applicability without enforcing final gates.
5. Extend the demo child project with baseline, capability and Threat Analysis lifecycle records.
6. Render gate/profile/capability registry details in the Project Documentation Explorer.
7. Expand the registry after Base Analysis, STRIDE, STRIDE-AI and future methods become available.

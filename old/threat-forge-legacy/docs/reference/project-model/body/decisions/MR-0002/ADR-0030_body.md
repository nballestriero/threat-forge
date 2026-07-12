# ADR-0030 — Demo Child Project Documentation UI Test Source Boundary

## Status

Accepted.

## Context

The child-project documentation no-fallback boundary prevents the Governance Console from showing ThreatForge platform documents when the selected child project has no configured Project Documentation Explorer source. That fail-closed behavior is correct, but local UI review also needs a safe way to see actual demo child-project documents without manually wiring a second backend or accidentally pointing the child context at the platform endpoint.

The local UI test environment runner already starts platform documentation, governance plan and frontend services. It can become the governed local place where the demo child-project documentation source is started as a separate read-only Project Documentation Explorer service.

## Decision

ThreatForge will extend the local UI test environment runner so `npm run dev:ui-test:start` prepares the demo child-project workspace and starts a dedicated demo child-project Project Documentation Explorer backend on a port distinct from the platform Project Documentation Explorer backend.

The runner will configure the frontend with `VITE_CHILD_PROJECT_DOCUMENTATION_EXPLORER_HTTP_BASE_URL` pointing to the demo child-project documentation service. The platform documentation endpoint remains separate. The PID registry and status output will record the demo child-project documentation service and endpoint so manual UI review can distinguish platform documents from demo child documents.

## Scope

In scope:

- resetting the generated demo child-project workspace before starting the local UI test environment;
- starting a second read-only Project Documentation Explorer backend for the demo child project;
- using a port distinct from the platform Project Documentation Explorer backend;
- configuring the frontend child-documentation HTTP source explicitly during local UI tests;
- recording the demo child documentation endpoint in generated UI-test process metadata;
- adding deterministic runtime tests for the local service wiring.

Out of scope:

- implementing production child-project documentation routing;
- resolving arbitrary real child projects from registered storage;
- changing the child-project no-fallback rule;
- adding write operations for child Project Models;
- changing the platform Project Documentation Explorer endpoint;
- changing governance gate planning semantics.

## Consequences

### Positive consequences

- Local UI testing can show demo child-project documents without reintroducing platform fallback.
- The demo child documentation source has a visible, separate endpoint from platform documentation.
- Manual review of child Project Model browsing becomes repeatable through the existing start/status/stop workflow.
- The next real-project resolver can build on a tested source-separation pattern.

### Negative consequences

- The local UI test environment starts one additional backend process.
- Startup now prepares the generated demo child-project workspace before launching services.
- A port conflict on the demo child documentation port will prevent the local UI test environment from starting cleanly.

## Follow-up

1. Resolve child-project documentation sources from registered child-project records instead of a single demo environment variable.
2. Show live platform and child documentation source status in the shell or page header.
3. Add diagnostics that distinguish source-not-configured, source-unavailable and source-empty child Project Model states.

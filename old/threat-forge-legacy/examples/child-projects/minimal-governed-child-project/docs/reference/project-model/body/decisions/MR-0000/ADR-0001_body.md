# ADR-0001 — Use Threat-Forge Standard Project Model for Governed Child Development

## Status

Accepted.

## Context

This demo child project must be analyzable by threat-forge using the same Project Model structure as other governed child projects.

## Decision

The demo child project uses the threat-forge standard Project Model: macro-requirements, ADR registries, requirement registries, governed Markdown bodies and graph registries.

## Scope

This decision applies to the minimal demo seed and the resettable demo workspace generated from it.

## Consequences

The seed can be validated by threat-forge external child-project validators and can be reset to a known baseline after experimentation.

## Follow-up

Add implementation artifacts only after new requirements and graph traceability are introduced.

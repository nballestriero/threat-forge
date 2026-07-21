# MR-0001 — Documentation to Base Analysis Case Study system description

## Intent

Describe the documentary system boundary and initial interaction for Documentation to Base Analysis Case Study before implementation artifacts exist.

## Context

A person outside the governed service domain submits a request containing a demonstration record. A logical service inside the governed domain receives the request and processes the supplied information. The request crosses the separation between the person's environment and the service domain. No executable backend, frontend, database or transport implementation has yet been selected.

The intended analytical process derives records from this evidence rather than assuming them in advance.

## Macro obligation

- The demonstration project must preserve governed documentary sources for analysis.

## Scope

- Includes: A person who initiates the documented request
- Includes: A logical service that receives and processes the request
- Includes: The demonstration record carried by the request
- Includes: The separation between the external user environment and the governed service domain
- Includes: The directed request from the person to the logical service
- Excludes: Executable application source code
- Excludes: A pre-established Base Analysis inventory
- Excludes: A pre-established data-flow diagram

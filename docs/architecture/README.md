# Architecture

This folder describes how AI Post Recipe is designed. Start with the overview, then read the part you need. Decisions that shaped the design are recorded as ADRs in [`adr/`](adr/README.md).

| #   | Document                                                       | Covers                                                        |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| 01  | [Overview](01-overview.md)                                     | Goals, deliverables, technology choices, guiding principles   |
| 02  | [System architecture](02-system-architecture.md)               | Containers, network boundaries, external services             |
| 03  | [Generation pipeline](03-generation-pipeline.md)               | The eight phases, approval gates, state machine, resumability |
| 04  | [Repository structure](04-repository-structure.md)             | Monorepo layout and shared packages                           |
| 05  | [Backend](05-backend.md)                                       | API layers, providers, phase contract, error handling         |
| 06  | [Frontend](06-frontend.md)                                     | Pages, features, data fetching, the brief form                |
| 07  | [Data model](07-data-model.md)                                 | Prisma schema and how each table is used                      |
| 08  | [API](08-api.md)                                               | REST endpoints, contracts, state rules                        |
| 09  | [Storage and rendering](09-storage-and-rendering.md)           | Object storage, slide templates, PNG rendering                |
| 10  | [Development and deployment](10-development-and-deployment.md) | Local setup, Docker Compose, configuration                    |
| 11  | [Testing and CI/CD](11-testing-and-ci.md)                      | Test layers, pipeline, image publishing                       |

## Reading the diagrams

Diagrams are written in [Mermaid](https://mermaid.js.org/) and render directly on GitHub.

## Current state vs. target design

These documents describe the target design. The repository is built towards it milestone by milestone (see [milestones](../milestones/README.md)). Where the code today deliberately differs from the target, the document says so in a **Current state** note.

# 0006 · Screenshots instead of Instagram scraping

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

The analysis needs to see the brand's Instagram profile and posts. Scraping Instagram breaks its terms of use, needs login and breaks often.

## Decision

The user uploads screenshots of the profile and of selected posts. A vision model analyses them in the brand analysis phase.

## Consequences

- No scraping code, no login, no terms-of-use risk.
- The user chooses which posts are representative.
- The analysis sees only what was uploaded; the form asks for enough screenshots.

## Update (after M8)

When a brand has no Instagram screenshots to upload, the brief can take the look from the brand's **website** instead: the app takes its own screenshots of the official pages and reads their colours. Instagram is still never downloaded, and the profile URL is optional.

# 0007 · No authentication in the MVP

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

The task does not ask for user accounts. The app runs locally for one person, and the reviewer starts it with their own key.

## Decision

Ship without login or user management.

## Consequences

- Less code and a simpler reviewer setup.
- The app must not be exposed publicly as it is. The README states that a public deployment needs authentication, and also rate limiting per user.

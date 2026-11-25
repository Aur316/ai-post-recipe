# 0004 · Render slides from React templates, not with an image model

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

The brief requires that products, packaging and labels look exactly as they are. Image models distort logos, text and labels.

## Decision

Slides are React templates in `packages/slide-templates`. The image model only generates the background or mood image. Playwright renders the template, with the real product photo, logo and text, to a PNG at the exact Instagram size.

## Consequences

- Text, logo and product are always exact and readable.
- The same component powers the browser preview and the export, so the approved slide is the exported slide.
- The API image needs headless Chromium, which makes it larger (Playwright base image from M7).
- Visual variety depends on the templates, not on the model.

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

## Implementation notes (M7)

- There is no separate render route: the API renders the template to static HTML with `react-dom/server`, with images as data URLs and the Geist font embedded, and Chromium loads it with `page.setContent`. Nothing is fetched over the network while rendering.
- The web preview shows the rendered PNGs, so the approved slide and the exported slide are the same file.
- Both stages of the API image use `mcr.microsoft.com/playwright:v1.65.1-noble`, whose version must match the `playwright` package exactly.

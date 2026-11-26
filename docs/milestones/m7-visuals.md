# M7 · Visuals

**Goal:** each post gets finished slides: an AI background with the real logo, product photo and text, rendered to PNG at the exact Instagram size, previewed in the browser.

**Status:** Not started

## Requirements

FR-12, FR-13

## User stories

**US-7.1** As an **operator**, I want the slides to show the real product and logo, so that the posts are accurate.

- The product photo and logo on the slide are the uploaded files, not generated.
- The text is rendered as text and is readable.
- Feed and carousel slides are 1080×1350; stories are 1080×1920.

**US-7.2** As an **operator**, I want to preview the posts as they would look on Instagram, so that I can judge them before export.

- `PostPreview` shows an Instagram-like frame; carousels can be swiped.
- The preview uses the same template as the PNG.

**US-7.3** As an **operator**, I want to regenerate one slide with an instruction, so that I can fix it without redoing the post.

- "Regenerate" with an optional instruction replaces only that slide.

## Tasks

**Templates**

- [ ] `packages/slide-templates`: carousel, single image and story templates
- [ ] Brand tokens (colours and font) from the analysis as template props

**Rendering**

- [ ] Internal `/render/:templateId` page
- [ ] `SlideRenderer` with Playwright: exact viewport, PNG screenshot
- [ ] Switch `docker/api.Dockerfile` to the Playwright base image
- [ ] Background generation through OpenRouter image models
- [ ] Visuals phase: background, render, save `GENERATED_BACKGROUND` and `RENDERED_SLIDE` assets

**API and web**

- [ ] `POST /api/runs/:id/posts/:index/slides/:order/regenerate`
- [ ] `PostPreview` and `CarouselViewer`
- [ ] Regenerate button with an instruction field
- [ ] `CaptionEditor` on the post preview (moved from M6)

**Tests**

- [ ] Renderer test: correct size, logo present
- [ ] Visuals phase test with fake image and renderer providers

## Exit criteria

- A real run produces PNG slides for all three posts, visible in the preview.

## Risks

| Risk                                              | Mitigation                                                                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Larger API image with Chromium                    | Accepted ([ADR 0004](../architecture/adr/0004-render-slides-from-react-templates.md)); multi-stage build keeps the rest small |
| Fonts differ between the preview and the renderer | Bundle the fonts with the templates                                                                                           |

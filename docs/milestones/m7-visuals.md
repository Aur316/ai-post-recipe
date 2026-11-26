# M7 · Visuals

**Goal:** each post gets finished slides: an AI background with the real logo, product photo and text, rendered to PNG at the exact Instagram size, previewed in the browser.

**Status:** Done

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

- [x] `packages/slide-templates`: one `Slide` component with cover, text and closing layouts for single images, carousels (1080×1350) and stories (1080×1920)
- [x] Brand tokens from the analysis colours (the most saturated one is the accent, with readable text on it); Geist font embedded

**Rendering**

- [x] ~~Internal `/render/:templateId` page~~ not needed: the API renders the template to static HTML (`react-dom/server`) and loads it with `page.setContent`
- [x] `SlideRenderer` with Playwright: exact viewport, fonts awaited, PNG screenshot; one browser reused
- [x] `docker/api.Dockerfile` on the Playwright base image (both stages, so sharp is built for the same system); `pnpm install` downloads Chromium for local development
- [x] Background generation through OpenRouter image models (`google/gemini-3.1-flash-image`, `background@v2` prompt), counted in the cost cap
- [x] Visuals phase: one background per post, every slide rendered with the uploaded logo and product photo, `GENERATED_BACKGROUND` and `RENDERED_SLIDE` assets, PNGs written onto the posts

**API and web**

- [x] `POST /api/runs/:id/posts/:index/slides/:order/regenerate`, and `PATCH /api/runs/:id/posts/:index` for caption and hashtags
- [x] `PostPreview`: Instagram-like frame with the rendered PNGs, carousel arrows and dots
- [x] Regenerate button with an instruction field
- [x] Caption and hashtag editor on the post preview (moved from M6)

**Tests**

- [x] Renderer test with real Chromium: correct sizes, the logo's pixels are on the slide (CI installs Chromium)
- [x] Visuals phase test with fake image and renderer providers; API tests for slides, regenerate and caption edits

## Exit criteria

- A real run produces PNG slides for all three posts, visible in the preview.

## Risks

| Risk                                              | Mitigation                                                                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Larger API image with Chromium                    | Accepted ([ADR 0004](../architecture/adr/0004-render-slides-from-react-templates.md)); multi-stage build keeps the rest small |
| Fonts differ between the preview and the renderer | Bundle the fonts with the templates                                                                                           |

## Notes

- **The preview shows the rendered PNGs**, not a live template, so what the person sees is exactly what is exported.
- **The background prompt describes a scene, not the post concept.** The first version passed the concept ("poll sticker", "save this post") and asked for a calm area for the text; the image model then drew fake text panels and stickers. Version 2 forbids text and design elements and gives only the brand, colours, style and a scene theme (product and goal).
- **Live run (GymBeam):** three backgrounds cost $0.20–0.27 (about $0.07–0.09 each), eleven slides rendered in about 40 s.
- Re-running the visuals phase leaves the earlier PNGs in storage; only the latest are on the posts.

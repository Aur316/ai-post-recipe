# Onboarding: API keys

The app runs without any key, in **demo mode**: the AI phases return recorded sample answers and the web app shows a yellow banner. For real results, add an OpenRouter key. A Serper key is optional.

Keys go in the `.env` file in the repository root. `pnpm install` creates it from `.env.example`, so the lines are already there, empty. Keys stay on your machine: `.env` is never committed and keys never reach the browser.

## 1. OpenRouter (required for real results)

OpenRouter is one API for many AI models. The app uses it for the brand analysis (a vision model), the content plan and the copy.

1. Go to [openrouter.ai](https://openrouter.ai) and sign in (Google, GitHub or e-mail).
2. Add credit on the [credits page](https://openrouter.ai/settings/credits). A few dollars is enough: one run costs well under $1, and the app stops a run at `MAX_COST_USD_PER_RUN` ($2 by default).
3. Create a key on the [keys page](https://openrouter.ai/keys). Copy it right away; it is shown only once.
4. Put it in `.env`:

   ```bash
   OPENROUTER_API_KEY=sk-or-v1-...
   ```

## 2. Serper (optional, web search)

Serper returns Google search results. With it, the research phase also finds pages about the brand and its products; without it, research reads only the links in the brief.

1. Go to [serper.dev](https://serper.dev) and sign up. New accounts get free searches, far more than this app needs (three per run).
2. Copy the key from the [API key page](https://serper.dev/api-key).
3. Put it in `.env`:

   ```bash
   SERPER_API_KEY=...
   ```

## 3. Restart the API

The API reads `.env` when it starts.

| How you run the app | Restart                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`          | Stop it (Ctrl+C) and run `pnpm dev` again                                     |
| Docker Compose      | `docker compose --profile full up -d` (recreates the API with the new `.env`) |

## 4. Check

- The yellow demo-mode banner is gone, and the **Setup** page (`/en/onboarding`) shows both keys as set.
- Or ask the API: `curl http://localhost:3000/api/health` returns `"providers": { "llm": "openrouter", "search": "serper" }`.

## Optional settings

| Variable               | Default                | Purpose                                                                     |
| ---------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `MAX_COST_USD_PER_RUN` | `2`                    | No AI call starts once a run has spent this much (USD)                      |
| `MODEL_<PROMPT ID>`    | (from the prompt file) | Another model for one prompt, e.g. `MODEL_ANALYSIS=google/gemini-3.5-flash` |
| `LLM_TIMEOUT_MS`       | `120000`               | Timeout of one model request                                                |

Model ids are listed at [openrouter.ai/models](https://openrouter.ai/models). The analysis needs a model that reads images and supports structured output.

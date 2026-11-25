# Architecture decision records

Each record captures one decision: the context, what was decided and what follows from it. Records are numbered and never rewritten; a changed decision gets a new record that supersedes the old one.

| #                                                         | Decision                                                    | Status   |
| --------------------------------------------------------- | ----------------------------------------------------------- | -------- |
| [0001](0001-monorepo-with-turborepo-and-pnpm.md)          | Monorepo with Turborepo and pnpm workspaces                 | Accepted |
| [0002](0002-postgres-job-queue-with-pg-boss.md)           | Background jobs with pg-boss on PostgreSQL                  | Accepted |
| [0003](0003-openrouter-as-model-gateway.md)               | OpenRouter as the single model gateway                      | Accepted |
| [0004](0004-render-slides-from-react-templates.md)        | Render slides from React templates, not with an image model | Accepted |
| [0005](0005-human-approval-gates.md)                      | Human approval after analysis and content plan              | Accepted |
| [0006](0006-screenshots-instead-of-instagram-scraping.md) | Screenshots instead of Instagram scraping                   | Accepted |
| [0007](0007-no-authentication-in-mvp.md)                  | No authentication in the MVP                                | Accepted |

New records follow the template in [`template.md`](template.md).

import { ignores, prettier, typescript } from '@ai-post-recipe/eslint-config'
import { defineConfig } from 'eslint/config'
import globals from 'globals'

export default defineConfig(
  ignores,
  typescript,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: ['./tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Until the pino logger arrives in M2.
      'no-console': 'off',
    },
  },
  {
    // Only the queue provider may know about pg-boss, so it stays swappable (ADR 0002).
    files: ['**/*.ts'],
    ignores: ['src/providers/queue/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'pg-boss',
              message:
                'Use the JobQueue interface from providers/queue instead.',
            },
          ],
        },
      ],
    },
  },
  { ignores: ['eslint.config.js'] },
  prettier,
)

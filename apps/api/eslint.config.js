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
      'no-console': 'off',
    },
  },
  {
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

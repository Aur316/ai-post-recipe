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
  { ignores: ['eslint.config.js'] },
  prettier,
)

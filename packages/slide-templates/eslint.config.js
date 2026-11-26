import { ignores, prettier, typescript } from '@ai-post-recipe/eslint-config'
import { defineConfig } from 'eslint/config'
import globals from 'globals'

export default defineConfig(
  ignores,
  typescript,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  { ignores: ['eslint.config.js'] },
  prettier,
)

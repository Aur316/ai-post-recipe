import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

export const ignores = {
  ignores: ['dist', 'node_modules', 'coverage', 'src/generated'],
}

export const typescript = {
  files: ['**/*.{ts,tsx}'],
  extends: [
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/only-throw-error': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: false },
    ],
    '@typescript-eslint/prefer-nullish-coalescing': [
      'error',
      { ignorePrimitives: { string: true, number: true } },
    ],
    '@typescript-eslint/array-type': ['error', { default: 'generic' }],
    '@typescript-eslint/no-duplicate-enum-values': 'error',
    '@typescript-eslint/prefer-enum-initializers': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    'no-restricted-syntax': [
      'error',
      {
        selector: 'TSEnumMember > Literal[raw!=/^["\'].*["\']$/]',
        message: 'Enum members must use string values, not numbers.',
      },
    ],
  },
}

export const prettier = eslintConfigPrettier

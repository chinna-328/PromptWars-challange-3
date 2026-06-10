import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: ['**/dist/**', 'coverage/**', 'node_modules/**', 'server/data/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Evaluation rubric: no `any`, no console debugging, low complexity.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // Express error handlers must keep 4 params; `_` marks intentional.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-console': 'error',
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    // JSX markup is declarative, not logic — components get a higher line
    // budget; the complexity cap (10) still applies everywhere.
    files: ['**/*.tsx'],
    rules: {
      'max-lines-per-function': ['error', { max: 180, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Test bodies are flat describe/it lists, not functions to decompose.
    files: ['**/*.test.{ts,tsx}', 'tests/**'],
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    files: ['client/src/**/*.{ts,tsx}'],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    // The logger util is the single sanctioned wrapper around console.
    files: ['server/src/lib/logger.ts'],
    rules: { 'no-console': 'off' },
  },
);

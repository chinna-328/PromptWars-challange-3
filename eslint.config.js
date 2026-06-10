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
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'error',
      complexity: ['error', 10],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
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

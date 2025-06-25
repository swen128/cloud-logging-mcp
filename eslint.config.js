import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import functional from 'eslint-plugin-functional';
import unicorn from 'eslint-plugin-unicorn';
import eslintComments from 'eslint-plugin-eslint-comments';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'functional': functional,
      'unicorn': unicorn,
      'eslint-comments': eslintComments,
    },
    rules: {
      // TypeScript strict rules - no any types allowed
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      
      // No type assertions allowed
      '@typescript-eslint/consistent-type-assertions': ['error', {
        assertionStyle: 'never',
      }],
      
      // Additional strict type rules
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      
      // General code quality rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-unused-expressions': 'error',
      'no-unused-vars': 'off', // TypeScript's noUnusedLocals and noUnusedParameters handle this
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'no-fallthrough': 'off', // Allow switch case fallthrough
      
      // Additional rules for exhaustive switches
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'unicorn/prefer-switch': 'error',
      
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSTypePredicate',
          message: 'Type predicates are not allowed because of the unsoundness. Rethink your type design.',
        },
      ],
      
      // Ban eslint-disable comments
      'eslint-comments/no-use': ['error', { allow: [] }],
    },
  },
  {
    files: ['**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'functional/no-let': 'error',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'build/', '*.js', '!eslint.config.js', 'vite.config.ts'],
  },
];

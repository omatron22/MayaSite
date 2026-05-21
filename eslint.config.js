import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // React 19's new strict rule flags legitimate fetch-reset patterns
      // (set loading/error before kicking off a fetch in useEffect). Downgrade
      // to warn rather than block the build until those effects are migrated
      // to a query lib (TanStack Query / SWR).
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  // One-off data import / migration scripts. Relaxed because they deal with
  // loosely-typed external data (DB rows, scraped HTML, third-party JSON)
  // and aren't part of the deployed app.
  {
    files: ['scripts/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prefer-const': 'off',
    },
  },
])

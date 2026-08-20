import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// Minimal Phase 0 config: TypeScript sources only.
// .vue single-file components are covered by vue-tsc (nuxt typecheck);
// eslint-plugin-vue joins in Phase 1.
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/.turbo/**',
      '**/*.vue',
      '**/coverage/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // NestJS DI needs RUNTIME class references in constructors —
    // `import type` erases them and silently breaks injection.
    files: ['apps/api/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    // The React APK shells live on polling effects (courier offers, order
    // tracking) — exhaustive-deps is what catches a stale closure freezing a
    // poll on an old token or an old order id.
    files: ['apps/customer/**/*.{ts,tsx}', 'apps/courier/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);

import eslintComments from '@eslint-community/eslint-plugin-eslint-comments'
import importX from 'eslint-plugin-import-x'
import unicorn from 'eslint-plugin-unicorn'
import tseslint from 'typescript-eslint'

// One config block per rule category (Cat 1–7). Rule rationale, exceptions,
// and examples are documented in docs/rules.md.

const nativeEsReplacementMessage =
  'Use native ES (Array.prototype, structuredClone, Object.entries, etc.).'

export default tseslint.config(
  // Registers the @typescript-eslint parser and plugin so the rules below resolve.
  tseslint.configs.base,
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        // String at runtime (Node ≥20.11); cast satisfies type-aware lint when no @types/node is loaded.
        tsconfigRootDir: import.meta.dirname as string,
      },
    },
  },
  // === Cat 1 — TypeScript / Type system ===
  // ESLint resolves a rule to the last block that defines it; the `typeParameter`
  // selector for sub-block 1.4 therefore lives in the Cat 2 block below.
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 10,
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'as',
          objectLiteralTypeAssertions: 'never',
        },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    },
  },
  // === Cat 2 — Naming ===
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    plugins: { unicorn },
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          // Quoted property keys (eslint rule names, package names) are not identifiers.
          selector: 'objectLiteralProperty',
          format: null,
          modifiers: ['requiresQuotes'],
        },
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'variable',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          // typescript-eslint trims the prefix before checking format, so the residual
          // (`Enabled` from `isEnabled`) must be PascalCase, not camelCase.
          selector: 'variable',
          types: ['boolean'],
          format: ['PascalCase'],
          prefix: ['is', 'has', 'should', 'can'],
        },
        {
          selector: 'variable',
          modifiers: ['const', 'global'],
          format: ['camelCase', 'UPPER_CASE'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          // `enumMember` is in `memberLike`, not `typeLike`, so the rule for
          // "enums are PascalCase" needs an explicit selector here.
          selector: 'enumMember',
          format: ['PascalCase'],
        },
        {
          selector: 'typeParameter',
          format: ['PascalCase'],
          prefix: ['T'],
        },
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
      ],
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      'unicorn/prevent-abbreviations': [
        'error',
        {
          allowList: {
            req: true,
            res: true,
            params: true,
            props: true,
            args: true,
            env: true,
            dev: true,
            prod: true,
            db: true,
            ctx: true,
            acc: true,
            prev: true,
            curr: true,
            fn: true,
            cb: true,
            lib: true,
            pkg: true,
            mod: true,
            src: true,
            dist: true,
          },
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message: 'Barrel files (export *) are banned. Import from the source module directly.',
        },
      ],
    },
  },
  // === Cat 3 — Imports / Exports ===
  // `consistent-type-imports` is layered on top of `verbatimModuleSyntax` (Cat 1.1)
  // deliberately — see docs/rules.md sub-block 3.3 for the trade-off. TS-only;
  // the broader import-x block below also runs on plain JS.
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx,cts,mts,js,jsx,cjs,mjs}'],
    plugins: { 'import-x': importX },
    rules: {
      'import-x/no-default-export': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      // `maxDepth` defaults to Infinity in eslint-plugin-import-x; we keep the
      // default explicit-by-omission rather than spelling it out.
      'import-x/no-cycle': ['error', { ignoreExternal: true }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'lodash', message: nativeEsReplacementMessage },
            { name: 'lodash-es', message: nativeEsReplacementMessage },
            { name: 'underscore', message: nativeEsReplacementMessage },
            { name: 'moment', message: 'Use Temporal, date-fns, or dayjs.' },
            { name: 'querystring', message: 'Use URLSearchParams.' },
            { name: 'node:querystring', message: 'Use URLSearchParams.' },
          ],
        },
      ],
    },
  },
  // === Cat 4 — Errors & Async ===
  // Sub-blocks 4.3 (cause chain) and 4.6 (semantic error class names) are convention
  // and live in docs/rules.md only — there is no mainstream lint rule
  // for either, and bolting on ad-hoc `no-restricted-syntax` matchers would catch
  // accidental shape but miss the intent.
  // `no-empty` (sub-block 4.1) is core ESLint and AST-only, so it spans JS as well —
  // empty `catch {}` is a defect in `.config.{js,mjs,cjs}` files too. The remaining
  // rules in this Cat need type information, so they stay TS-only.
  {
    files: ['**/*.{ts,tsx,cts,mts,js,jsx,cjs,mjs}'],
    rules: {
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    plugins: { unicorn },
    rules: {
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      'unicorn/error-message': 'error',
      'unicorn/throw-new-error': 'error',
      'unicorn/custom-error-definition': 'error',
      'unicorn/prefer-type-error': 'error',
    },
  },
  // === Cat 5 — Functions & Structure ===
  // All rules in this Cat are core ESLint AST-only, so they span JS as well —
  // a 200-line `vite.config.js` or a deeply-nested `.eslintrc.cjs` is a smell
  // for the same reasons as in TS. The test-file override at the bottom raises
  // the size caps for `**/*.{test,spec}.*`.
  {
    files: ['**/*.{ts,tsx,cts,mts,js,jsx,cjs,mjs}'],
    rules: {
      'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 3],
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-lines': ['error', 300],
      'func-style': ['error', 'declaration'],
    },
  },
  // === Cat 6 — Comments & Documentation ===
  // Sub-blocks 6.1 (zero-by-default), 6.2 (why-only), 6.3 (JSDoc on published APIs)
  // are convention only — no mainstream lint rule encodes "comment density" or
  // "JSDoc-on-public-API-only", and ad-hoc matchers would catch shape but miss intent.
  // The two enforced rules are universal (no type info needed), so they span JS too.
  {
    files: ['**/*.{ts,tsx,cts,mts,js,jsx,cjs,mjs}'],
    plugins: { '@eslint-community/eslint-comments': eslintComments },
    rules: {
      'no-warning-comments': [
        'error',
        { terms: ['todo', 'fixme', 'xxx', 'hack'], location: 'start' },
      ],
      // Narrow ignore: only the `disable*` directives carry real bug-hiding risk;
      // `eslint-enable` just inverts an already-justified disable, and config/global
      // directives are intentional file-level setup. See sub-block 6.5.
      '@eslint-community/eslint-comments/require-description': [
        'error',
        { ignore: ['eslint-enable', 'eslint', 'global', 'globals', 'exported'] },
      ],
    },
  },
  // Config files (vite, next, playwright, etc.) need a default export — they
  // are invoked as `import('./tool.config').then((m) => m.default)` and have
  // no way to consume a named export. The size caps are also lifted here:
  // a production-grade `vite.config.ts` or `eslint.config.ts` legitimately
  // exceeds the 30/300 limits the body rules enforce.
  {
    files: ['**/*.config.{ts,mts,cts,js,mjs,cjs}'],
    rules: {
      'import-x/no-default-export': 'off',
      'max-lines': ['error', 500],
      'max-lines-per-function': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
    },
  },
  // `interface` is required for module augmentation, so allow it inside `.d.ts`.
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  // Test files have long `describe()` callbacks and many cohesive scenarios per
  // file; raise the size caps from 30/300 to 100/500 so the rules still flag
  // truly bloated specs without forcing fragmentation of normal suites.
  {
    files: ['**/*.{test,spec}.{ts,tsx,cts,mts}'],
    rules: {
      'max-lines-per-function': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', 500],
    },
  },
)

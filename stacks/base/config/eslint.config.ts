import tseslint from 'typescript-eslint'
import unicorn from 'eslint-plugin-unicorn'
import importX from 'eslint-plugin-import-x'

// Each rule category (Cat 1–7) appends its own config block here as it is written.
// Rule rationale and exceptions are documented in stacks/base/docs/rules.md.

const nativeEsReplacementMessage =
  'Use native ES (Array.prototype, structuredClone, Object.entries, etc.).'

export default tseslint.config(
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
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
          message:
            'Barrel files (export *) are banned. Import from the source module directly.',
        },
      ],
    },
  },
  // === Cat 3 — Imports / Exports ===
  // Sub-blocks 3.3 / 3.4 (`consistent-type-imports`) are intentionally layered on
  // top of Cat 1.1's `verbatimModuleSyntax`. The compiler enforces that elidable
  // imports use `import type` but does not auto-fix and does not split mixed
  // `import { foo, type Foo }` statements; the ESLint rule does both. The two
  // can produce overlapping errors in narrow edge cases (decorator metadata,
  // `--isolatedDeclarations`); the auto-fix ergonomics are worth that cost.
  // See `stacks/base/docs/rules.md` sub-block 3.3 for the documented trade-off.
  // This rule is scoped to TypeScript files only — the broader import-x block
  // below also runs on plain JS.
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
      'import-x/no-cycle': ['error', { maxDepth: Infinity, ignoreExternal: true }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'lodash', message: nativeEsReplacementMessage },
            { name: 'lodash-es', message: nativeEsReplacementMessage },
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
  // and live in stacks/base/docs/rules.md only — there is no mainstream lint rule
  // for either, and bolting on ad-hoc `no-restricted-syntax` matchers would catch
  // accidental shape but miss the intent.
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    plugins: { unicorn },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: false }],
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      'unicorn/error-message': 'error',
      'unicorn/throw-new-error': 'error',
      'unicorn/custom-error-definition': 'error',
      'unicorn/prefer-type-error': 'error',
    },
  },
  // Default exports are required by most config files (vite, next, playwright, etc.).
  {
    files: ['**/*.config.{ts,mts,cts,js,mjs,cjs}'],
    rules: {
      'import-x/no-default-export': 'off',
    },
  },
  // `interface` is required for module augmentation, so allow it inside `.d.ts`.
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
)

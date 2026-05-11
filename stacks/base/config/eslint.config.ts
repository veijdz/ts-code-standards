import tseslint from 'typescript-eslint'
import unicorn from 'eslint-plugin-unicorn'

// Each rule category (Cat 1–7) appends its own config block here as it is written.
// Rule rationale and exceptions are documented in stacks/base/docs/rules.md.

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
  // The `naming-convention` rule for `typeParameter` (sub-block 1.4) is consolidated
  // into the Cat 2 block below — ESLint resolves a rule to the last block that defines
  // it, so the entry must live wherever the broader naming policy lives.
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
          selector: 'variable',
          types: ['boolean'],
          format: ['camelCase'],
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
            auth: true,
            ctx: true,
            acc: true,
            prev: true,
            curr: true,
            fn: true,
            cb: true,
            lib: true,
            pkg: true,
            mod: true,
            repo: true,
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
  // `interface` is required for module augmentation, so allow it inside `.d.ts`.
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
)

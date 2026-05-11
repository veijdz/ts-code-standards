import tseslint from 'typescript-eslint'

import baseConfig from './stacks/base/config/eslint.config.js'

// Re-export the base config and override `tsconfigRootDir` to this repo's root.
// The base config sets it to `import.meta.dirname` which evaluates to
// `stacks/base/config/` when the file is loaded; for the dogfood we need
// typescript-eslint to resolve the tsconfig from here instead.
export default tseslint.config(...baseConfig, {
  files: ['**/*.{ts,tsx,cts,mts}'],
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
})

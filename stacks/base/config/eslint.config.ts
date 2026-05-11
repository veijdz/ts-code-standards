import tseslint from 'typescript-eslint'

// Each rule category (Cat 1–7) appends its own config block here once written.
// Until then this file is an empty-but-typed baseline — lint passes on any file
// and no rules are enforced.

export default tseslint.config({
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
})

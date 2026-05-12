import type { KnipConfig } from 'knip'

// This repo ships configs as templates rather than runtime code. Knip auto-
// detects the root config files (`eslint.config.ts`, `commitlint.config.ts`,
// `knip.config.ts`) and `node_modules/`; we only need to surface the base
// templates that consumers copy via degit.
const config: KnipConfig = {
  entry: ['config/*.ts'],
  project: ['**/*.ts'],
  // Knip's lefthook plugin does not follow `extends:` into config/lefthook.yml,
  // so commitlint (invoked from the extended commit-msg hook) reads as unused.
  ignoreDependencies: ['@commitlint/cli'],
}

export default config

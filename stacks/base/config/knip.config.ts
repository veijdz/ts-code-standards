import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: ['src/index.ts', 'src/**/*.entry.ts'],
  project: ['src/**/*.{ts,tsx}'],
  ignore: ['dist/**', 'coverage/**', 'tests/**/__fixtures__/**'],
  rules: {
    files: 'error',
    dependencies: 'error',
    devDependencies: 'error',
    optionalPeerDependencies: 'off',
    unlisted: 'error',
    binaries: 'error',
    unresolved: 'error',
    exports: 'error',
    types: 'error',
    nsExports: 'error',
    nsTypes: 'error',
    enumMembers: 'warn',
    classMembers: 'off',
    duplicates: 'warn',
  },
}

export default config

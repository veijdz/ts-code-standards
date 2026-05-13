# ts-code-standards

A single, framework-agnostic baseline for Node/TypeScript projects — strict TypeScript rules plus Node 22 LTS runtime conventions, packaged as documentation and copyable configs.

This is **not** an npm package — consumers copy the templates via `npx degit` and own their own dependencies. Those that need framework-specific opinions (Nest, Expo, TanStack Start, etc.) derive their own repo from this baseline and overlay rules on top.

## Quickstart

Copy the configs straight into your project:

```bash
npx degit veijdz/ts-code-standards/config .standards
```

Then install the dev dependencies listed in the [Wiring](#wiring) section below and point your project's configs at `.standards/*` (or copy them to the root — your call).

## Staying up to date

Templates are not versioned — once copied, they belong to your repo. To find out when something changes:

- **Watch this repo** with "Releases only" — notable and breaking changes are cut as [GitHub Releases](https://github.com/veijdz/ts-code-standards/releases).
- Or subscribe to the [Atom feed](https://github.com/veijdz/ts-code-standards/releases.atom).
- Or audit explicitly: `git log -- config/ docs/rules.md` against your last `degit` date.

Breaking changes use a `YYYY-MM-DD-BREAKING` tag and list the migration steps in the release body. See [ADR 0002 — Release policy](docs/adr/0002-release-policy.md) for the full rationale.

## Wiring

Documentation and configs for a plain Node/TypeScript project.

- [`docs/rules.md`](docs/rules.md) — rule categories the baseline enforces
- [`config/`](config/) — copyable config files

### Copy the templates

```bash
pnpm dlx degit veijdz/ts-code-standards/config .standards
```

`pnpm dlx` is the canonical command. `npx degit ...` works for plain npm projects, but `pnpm init` writes a `devEngines.packageManager` field that rejects `npx` (it dispatches through `npm`); `pnpm dlx` sidesteps that.

The command above copies six files into `.standards/`:

| File                   | Role                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `tsconfig.json`        | Strict compiler flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, …) |
| `eslint.config.ts`     | Flat config with the rule categories from [`docs/rules.md`](docs/rules.md)          |
| `.prettierrc.json`     | `semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`       |
| `lefthook.yml`         | `pre-commit` (eslint + prettier + tsc) and `commit-msg` (commitlint) hooks          |
| `commitlint.config.ts` | Conventional Commits 1.0 with a fixed `type-enum` and `header-max-length: 72`       |
| `knip.config.ts`       | Knip baseline (the consumer overrides this — see [Setup](#setup))                   |

### Required dev dependencies

Pinned versions are what the templates are tested against. Floating ranges are likely to work but are not guaranteed by this repo.

| Package                                           | Version  | Used by                                            |
| ------------------------------------------------- | -------- | -------------------------------------------------- |
| `typescript`                                      | `6.0.3`  | `tsconfig.json`                                    |
| `@types/node`                                     | `25.6.2` | `tsconfig.json` (`types: ["node"]`)                |
| `eslint`                                          | `10.3.0` | `eslint.config.ts`                                 |
| `typescript-eslint`                               | `8.59.2` | `eslint.config.ts`                                 |
| `eslint-plugin-import-x`                          | `4.16.2` | `eslint.config.ts` (Cat 3)                         |
| `eslint-plugin-unicorn`                           | `64.0.0` | `eslint.config.ts` (Cat 2, 5)                      |
| `@eslint-community/eslint-plugin-eslint-comments` | `4.7.1`  | `eslint.config.ts` (Cat 6)                         |
| `jiti`                                            | `2.7.0`  | Lets ESLint and commitlint load `.ts` config files |
| `prettier`                                        | `3.8.3`  | `.prettierrc.json`                                 |
| `lefthook`                                        | `2.1.6`  | `lefthook.yml`                                     |
| `@commitlint/cli`                                 | `21.0.0` | `commitlint.config.ts`                             |
| `@commitlint/config-conventional`                 | `21.0.0` | `commitlint.config.ts`                             |
| `@commitlint/types`                               | `21.0.0` | `commitlint.config.ts` (types only)                |
| `knip`                                            | `6.12.2` | `knip.config.ts`                                   |

Install them all at once:

```bash
pnpm add -D \
  typescript@6.0.3 @types/node@25.6.2 \
  eslint@10.3.0 typescript-eslint@8.59.2 \
  eslint-plugin-import-x@4.16.2 eslint-plugin-unicorn@64.0.0 \
  @eslint-community/eslint-plugin-eslint-comments@4.7.1 \
  jiti@2.7.0 prettier@3.8.3 lefthook@2.1.6 \
  @commitlint/cli@21.0.0 @commitlint/config-conventional@21.0.0 @commitlint/types@21.0.0 \
  knip@6.12.2
```

### Setup

The templates land in `.standards/`. They are not picked up automatically — six root files connect them to your project. Copy each block verbatim into a new file at the project root.

#### `tsconfig.json`

```jsonc
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./.standards/tsconfig.json",
  "compilerOptions": {
    "types": ["node"],
  },
  "include": ["**/*.ts", "**/*.mts", "**/*.cts"],
  "exclude": ["node_modules"],
}
```

The wide `include` matters: ESLint's type-aware rules require every linted file (including root configs) to be in a TS project. A narrow `include` like `["src/**/*.ts"]` makes `eslint .` fail with "file was not found by the project service" on the root configs.

#### `eslint.config.ts`

```ts
export { default } from './.standards/eslint.config.js'
```

The `.js` suffix on a `.ts` source is intentional — ESM module resolution treats it as the compiled name, and `jiti` lets ESLint load it without a build step.

#### `commitlint.config.ts`

```ts
import baseConfig from './.standards/commitlint.config.js'

export default baseConfig
```

#### `lefthook.yml`

```yaml
extends:
  - ./.standards/lefthook.yml
```

#### `knip.config.ts`

Knip needs its own root config — `.standards/knip.config.ts` is not loaded automatically and shows up as an unused file if you do not exclude it.

```ts
import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: ['src/**/*.ts'],
  project: ['**/*.ts'],
  ignore: ['.standards/**'],
  // Knip's lefthook plugin does not follow `extends:`, so commitlint reads as unused.
  ignoreDependencies: ['@commitlint/cli'],
}

export default config
```

#### `package.json` additions

```jsonc
{
  "type": "module",
  "engines": { "node": ">=22.22.2" },
  "packageManager": "pnpm@11.0.8",
  "prettier": "./.standards/.prettierrc.json",
  "scripts": {
    "prepare": "lefthook install",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "knip": "knip",
  },
}
```

The `prettier` field is required: Prettier only looks for config in the same directory tree as the files it formats, so it does not auto-discover `.standards/.prettierrc.json` for files at the root. Pointing the field at it makes the base config the single source of truth.

#### Root files not provided by degit

Two more files belong at the project root and are not part of the degit copy because their content is consumer-specific:

**`.prettierignore`** — without this, `pnpm-lock.yaml` is reported as a Prettier violation:

```
node_modules
pnpm-lock.yaml
```

**`pnpm-workspace.yaml`** — `pnpm` 11+ requires explicit approval to run install scripts. Without this, the `lefthook` postinstall (which installs the git hooks) is silently skipped:

```yaml
allowBuilds:
  lefthook: true
  unrs-resolver: true
```

### Verify the wiring

After `pnpm install`, the following commands should all succeed:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm knip
```

Hooks are installed via the `prepare` script (run automatically by `pnpm install`). Sanity check:

```bash
ls .git/hooks/commit-msg .git/hooks/pre-commit  # both should exist
git commit --allow-empty -m "not conventional"   # should fail on commit-msg
git commit --allow-empty -m "chore: verify hook" # should pass
```

## Documentation

- [Foundational principles](docs/principles.md) — the eleven foundations every rule, convention, and ADR derives from
- Conventions — [dependencies](docs/conventions/dependencies.md), [git](docs/conventions/git.md), [testing](docs/conventions/testing.md), [GitHub settings](docs/conventions/github-settings.md)
- [ADRs](docs/adr/) — architectural decision records
- [Documentation templates](docs/_templates/) — canonical anatomy for [rules](docs/_templates/rules.md), [ADRs](docs/_templates/adr.md), [conventions](docs/_templates/convention.md), and [principles](docs/_templates/principles.md), plus a [filled rules example](docs/_templates/example-rules.md)

Every doc under `docs/` is built from one of those templates. New docs must reference the template they extend immediately after the frontmatter.

> The seven TypeScript rule categories (Cat 1–7) are landed; Node runtime categories (Cat 8–14) are the M2 roadmap. The `docs/adr/` directory records the strategic decisions, including [ADR 0004 — Single-baseline scope](docs/adr/0004-single-baseline.md).

## For AI agents

Read [`CLAUDE.md`](CLAUDE.md) before contributing.

## License

[MIT](LICENSE).

---
title: Cross-stack composition
status: accepted
date: 2026-05-10
supersedes:
superseded-by:
---

<!-- Based on docs/_templates/adr.md -->

# ADR 0001 — Cross-stack composition

## Context

This repo ships multiple stacks (`base`, `node`, `nestjs`, `expo`, `tanstack-start`) where each downstream stack extends the conventions and configs of one upstream stack. A consumer copies a single stack's `config/` directory via `npx degit` — there is no install step, no published package, and therefore no shared runtime to centralize logic in.

That raises a recurring question for every config file in every stack: **does a downstream stack reference the upstream, or does it carry a full copy?** Each of the six formats we ship (`eslint.config.ts`, `tsconfig.json`, `.prettierrc.json`, `lefthook.yml`, `commitlint.config.ts`, `knip.config.ts`) handles inheritance differently — some natively, some not at all. A single answer per format is needed so the repo stays predictable and the consumer can reason about their `.standards/` directory without surprises.

The constraints are:

- The consumer copies, not imports. Anything referenced inside the templates must resolve from inside the consumer's project after `degit`, not from this repo.
- Templates are stateless: there is no version on disk that lets a consumer "update".
- Each stack's `config/` must be a valid baseline on its own, so a consumer can adopt `base` without ever touching `node`.

This ADR decides, format by format, how composition is expressed.

## Decision

| Format | Composition strategy | Where the consumer touches it |
|---|---|---|
| **ESLint** (`eslint.config.ts`) | Each stack exports a typed array of flat-config blocks. Downstream stacks `import` the upstream array and spread it: `[...base, ...nodeOverrides]`. | Consumer's `eslint.config.ts` re-exports the final stack's array. |
| **TypeScript** (`tsconfig.json`) | Each downstream stack ships its own `tsconfig.json` that `extends` the upstream via a path relative to the template directory. | Consumer copies the final stack's `tsconfig.json` only; the chain of `extends` walks back through the copied stacks inside the consumer's `.standards/`. |
| **Prettier** (`.prettierrc.json`) | No native extends. Each stack carries a **full copy** of the file with its own deltas. | Consumer copies one file (the final stack's). |
| **`lefthook.yml`** | Lives only in the `base` stack. Downstream stacks inherit by virtue of being copied into the same consumer repo as `base`. | Consumer copies once, from `base`. |
| **`commitlint.config.ts`** | Same as `lefthook.yml`. Lives only in `base`. | Consumer copies once, from `base`. |
| **`knip.config.ts`** | Same as `lefthook.yml`. Lives only in `base`. | Consumer copies once, from `base`. |
| **`package.json`** | Not a copyable file. Each stack's README documents the dev-dependencies the consumer must install. | Consumer adds dev-dependencies manually; the dep list is the contract, not a template. |

### Why ESLint exports an array, not a function

The flat config format lets a config be either an array or a result of `tseslint.config(...)`. Exporting the array directly gives downstream stacks the simplest possible composition (`[...base, ...overrides]`) without forcing them to learn a helper. `tseslint.config` is still used **inside** each stack to get the typed wrapper, but the export is the plain array.

### Why `tsconfig.json` extends via relative path, not via a published name

`extends: "@veijdz/tsconfig-base"` would require publishing an npm package; that contradicts the "no package" stance of the repo. A relative path (`extends: "../base/tsconfig.json"`) works because the consumer copies the entire chain of stacks into `.standards/`, preserving the same relative layout.

### Why `lefthook` / `commitlint` / `knip` are not duplicated

These tools are per-repo, not per-stack — they govern commit-time behavior of the consumer's repo, not the build of any specific code path. Carrying copies in every stack would force the consumer to merge them, which defeats the "copy one stack, get a working baseline" promise.

### Live reference

The pattern is demonstrated end-to-end when the `node` stack lands in M2 (epic VEI-401). At that point, `stacks/node/config/eslint.config.ts` will read:

```ts
import baseConfig from '../../base/config/eslint.config'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  ...baseConfig,
  // node-stack-specific blocks added here
)
```

and `stacks/node/config/tsconfig.json` will read:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../../base/config/tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2024"],
    "types": ["node"]
  }
}
```

Until M2 lands, this ADR's decision is the contract; downstream stacks must conform when they are implemented.

## Consequences

### Positive

- Composition is uniform across formats with native support (ESLint, TypeScript), and explicit where there is none (Prettier copy-and-diverge).
- A consumer who only ever adopts `base` is never exposed to the chain at all — the upstream-only files are simply absent.
- Removing or renaming a stack is straightforward: a downstream stack that no longer needs the upstream just drops the spread or the `extends`.

### Negative

- A Prettier rule change at the `base` level must be hand-propagated to every downstream stack's `.prettierrc.json`. There is no tooling to detect drift.
- The relative-path `extends` chain is fragile to directory renames — moving a stack requires touching every downstream stack's `tsconfig.json`.
- Consumers reading a downstream stack's `eslint.config.ts` must follow the `import` to the upstream file to see the full ruleset. The price of explicit composition.

### Neutral

- Each stack's `README.md` must document the deps the consumer installs. Maintained per stack, no automation.
- `package.json` is not copyable, but stacks may ship an `examples/package.json` showing the recommended shape. Not part of M1.

## Alternatives considered

1. **Publish a base npm package.** Rejected: contradicts the stateless-copy stance documented in the project README. Brings back the version-coupling problem we are explicitly avoiding (the `@veijdz/eslint-config` history motivates this repo's existence).
2. **Generate composed configs at copy time.** A `pnpm dlx degit-compose nestjs` step would emit a single flat file with the combined rules inlined. Rejected: hides the source of each rule, makes upgrades opaque, and adds a runtime step the consumer has to trust.
3. **Centralize `lefthook` / `commitlint` per stack.** Rejected: triples the maintenance surface for files that are about the repo, not the code path. Drift between stacks would be inevitable.

## References

- [Principle 5 — Simplicity over flexibility](../principles.md)
- [Principle 6 — Tools enforce, humans decide](../principles.md)
- [ESLint flat config — composability](https://eslint.org/docs/latest/use/configure/configuration-files)
- [`typescript-eslint` `tseslint.config`](https://typescript-eslint.io/packages/typescript-eslint/#config)

---
title: Dependencies
last-reviewed: 2026-05-10
---

<!-- Based on docs/_templates/convention.md -->

# Conventions — Dependencies

> Criteria for adding, replacing, and auditing dependencies in any project that adopts these standards. Derives from [Principle 8 — Dependencies are debt](../principles.md).

## Scope

Applies to every package listed in `package.json` (runtime, dev, peer, optional) across all stacks in this repo. Covers what to add, what is banned outright, how to keep the dependency tree current, and how to detect dead weight. Does **not** cover internal workspace packages — those are governed by stack-specific rules.

## Rules

### Adding a new dependency

- **Rule.** Reach in this order: Node built-in or platform global → small, focused package → narrow niche dependency. Stop at the first one that fits.
  - **Why.** Every dependency adds an attack surface, a maintenance burden, and a version-conflict risk; the platform already covers most utility use cases in 2026.
  - **How.** Before opening `pnpm add`, check the "Native-first table" below. If the native equivalent exists, use it.

- **Rule.** Justify any new dependency in the PR description: what problem it solves, why a native or existing approach does not.
  - **Why.** Forces the cost to be made visible at the only moment it can still be vetoed.
  - **How.** A single sentence in the `## Summary` section is enough.

### Native-first table

Reach for the platform first. These are the most common substitutions; the principle generalizes to anything the platform already does.

| Native (ES2024 / Node 22 LTS) | Replaces |
|---|---|
| `fetch` (global) | `axios`, `got`, `node-fetch` |
| `structuredClone` | `lodash.clonedeep`, `rfdc` |
| `Object.groupBy`, `Map.groupBy` | `lodash.groupby` |
| `Promise.withResolvers` | manual deferred wrappers, `p-defer` |
| `Array.prototype.toSorted` / `.toReversed` / `.toSpliced` | mutation + clone helpers |
| `Array.prototype.findLast` / `.findLastIndex` | `lodash.findlast` |
| `Iterator.prototype.map` / `.filter` / `.take` | eager array transforms when the input is large |
| `URL`, `URLSearchParams` | `query-string`, `qs`, `url-parse` |
| `node:test` + `node:assert` | a test runner for trivial scripts |
| `node:crypto` `randomUUID`, `subtle` | `uuid`, `nanoid` (when v4 UUID is what you need) |
| `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.Collator` | `numeral`, locale string helpers |

### Banned packages

The following are not allowed anywhere in the dependency tree. CI must fail when one is introduced.

| Package | Reason |
|---|---|
| `lodash`, `lodash-es` | Modern platform equivalents (`structuredClone`, `Object.groupBy`, native array methods) cover the vast majority of real usage. Tree-shaking is not a counter-argument — if the function exists natively, importing it is still pure overhead. |
| `underscore` | Superseded by both `lodash` (also banned) and the native methods that supersede `lodash`. |
| `moment` | Legacy mode upstream; large bundle, mutable Date semantics, no tree-shaking. Use the native `Date` + `Intl` for most needs, `date-fns` or `dayjs` when arithmetic helpers are required. |
| `querystring` (the npm package) | Node's built-in `querystring` is also legacy. Use `URL` / `URLSearchParams` instead. |

### Lockfile discipline

- **Rule.** `pnpm-lock.yaml` is checked in, always. Generated lockfiles from other package managers are not.
  - **Why.** Reproducible installs across machines, CI, and time. The lockfile is the contract; without it, `npm install` is non-deterministic.
  - **How.** `pnpm` is the project package manager (pinned in `packageManager`). Other managers must error out — see the stack's `package.json` for the exact pin.

- **Rule.** A PR that changes the lockfile without changing `package.json` requires an explanation.
  - **Why.** Catches accidental dedupe churn, malicious replacements, and silent transitive bumps.
  - **How.** Either commit the `package.json` change in the same PR, or note in the description what triggered the lockfile change.

### Renovate policy

- **Rule.** Patch updates auto-merge after CI passes. Minor dev-dependency updates are grouped weekly and auto-merge. Minor runtime-dependency updates are grouped weekly and require human approval. Major updates always require human approval.
  - **Why.** Patches are almost always safe; majors almost never are. The asymmetry should be reflected in automation.
  - **How.** Configure Renovate (or Dependabot) with the matching grouping rules. The exact config file is delivered with each stack's CI setup.

- **Rule.** Group dev dependencies by ecosystem (e.g., "TypeScript toolchain", "linting", "testing").
  - **Why.** A single Renovate PR upgrading `vitest` + `@vitest/coverage-v8` is one review; two PRs is two reviews and a higher merge-order risk.

### Auditing

- **Rule.** `pnpm audit --audit-level=high` runs on every CI build. A high or critical advisory fails the build.
  - **Why.** Known CVEs are not negotiable, but lower severities produce too much noise to gate on.
  - **How.** Wire it into the CI workflow alongside lint/typecheck/test.

- **Rule.** `knip` runs in CI in `--strict` mode. Unused dependencies, unused files, and dead exports fail the build.
  - **Why.** Dead code is debt that compounds — easier to delete the moment it goes unused than after three more refactors orbit it.
  - **How.** `knip.config.ts` lives in `stacks/base/config/`; consumers copy and adapt.

### Peer dependencies (libraries only)

- **Rule.** A library published from a project that adopts these standards declares its framework couplings as peer dependencies, never runtime ones, and marks each in `peerDependenciesMeta` with the appropriate `optional` flag.
  - **Why.** Prevents version-duplication blowups in consumers (two copies of React, two copies of NestJS) and signals which couplings the library actually requires versus tolerates.
  - **How.** See the publishing rules in the `node` stack (lands in M2) for the exact `package.json` shape.

## Rationale

- **Why ban `lodash` outright instead of a curated allowlist?** A blanket ban is enforceable in tooling and easy to reason about. A per-function allowlist invites endless edge-case debates and drifts in practice.
- **Why patch auto-merge?** Most patches really are safe, and the friction of manually merging every Renovate PR causes them to pile up — at which point the team turns off Renovate and the dependency tree rots. Asymmetric automation keeps the signal high.
- **Why `pnpm` specifically?** Disk-efficient (content-addressable store), strict by default (hoists nothing implicit), and the workspace primitives are the cleanest of the three majors.

## Out of scope

- Stack-specific deps (NestJS modules, Expo plugins, etc.) — those live in the stack's `rules.md`.
- Build-time tool selection (bundler, transpiler) — handled in stack-specific rules.
- License auditing — separate convention; not yet defined.

## References

- [Principle 8 — Dependencies are debt](../principles.md)
- [Node.js Modern API Reference](https://nodejs.org/docs/latest-v22.x/api/)
- [`pnpm` strict policies](https://pnpm.io/configuring)

---
title: ESM-first as the default module system
status: accepted
date: 2026-05-12
supersedes:
superseded-by:
---

<!-- Based on docs/_templates/adr.md -->

# ADR 0003 — ESM-first as the default module system

## Context

This baseline targets Node 22 LTS and assumes the templates run in a project that uses ECMAScript Modules (ESM). The assumption is already woven through the M1 deliverables, but it has never been written down as a decision a consumer can read:

- `config/tsconfig.json` sets `"module": "NodeNext"` — Node's ESM resolver, not CJS.
- `config/eslint.config.ts`, `commitlint.config.ts`, and the rest of the `.ts` configs run as ESM and are loaded by tooling (ESLint, commitlint, Vitest) that itself runs in ESM mode.
- `README.md` explains the `.js` extension hint on `.ts` sources as a property of ESM module resolution; the explanation only makes sense if ESM is the operating model.
- `package.json` does not set `"type": "commonjs"` anywhere; the project-level default in Node 22 LTS is CJS for unmarked packages, so a consumer copying the templates into an unmarked package gets a working ESM toolchain only by accident.

There is no half-step the templates support: they are not "CJS-friendly with ESM as an option". The choice has already been made — this ADR makes it visible so that consumers and reviewers can rely on it instead of inferring it from configs.

## Decision

This baseline assumes ESM as the default module system.

- **Applications** built from these standards are ESM. Their `package.json` declares `"type": "module"`. They use ESM imports, `import.meta.url`, top-level await, and the Node ESM resolver.
- **Libraries** built from these standards publish either ESM-only or dual (ESM + CJS) outputs. ESM-only is preferred; dual is acceptable when the library targets ecosystems still anchored to CJS. Pure-CJS publishing is out of scope of these standards.
- **Tooling configs** in this baseline are written as ESM (`.ts` loaded via the toolchain's ESM loader, or `.mjs` when a tool requires it). CJS configs (`.cjs`, `module.exports = ...`) are not added.
- **Loaders and shims** that exist primarily to wrap CJS-only behavior (e.g., the `esm` package) are not added; if a runtime dependency is CJS-only, it is consumed via Node's CJS interop, not via a wrapper.

The decision is the contract for any project adopting this baseline. To deviate, a project must amend or supersede this ADR.

### Why this lives in the baseline, not per project

Module system is a property of the runtime, not of the framework. A Node service, a backend framework, a mobile bundler, a meta-framework — all support ESM source-side. Locating the decision in the baseline keeps every adopting project's `tsconfig.json` `extends` chain coherent (`module: NodeNext` flows through unmodified) and removes one thing each new project would otherwise need to re-decide.

### What this means for consumers

A consumer who copies these templates into a fresh project must ensure their `package.json` declares `"type": "module"`. The root `README.md` documents this in the wiring instructions; the practical effect is that `import` statements in `.ts` source files compile to ESM `import` statements at runtime, and the Node ESM resolver is the one that walks them.

## Consequences

**Positive.**

- A single, predictable module model across every adopting project — no drift between CJS and ESM, no half-converted projects.
- Top-level `await`, `import.meta.url` / `import.meta.dirname`, and dynamic `import()` are available everywhere without conditional wiring.
- Tree-shaking and dead-code elimination work as designed — bundlers no longer have to disambiguate `module.exports` vs ESM exports.
- Removes the `runtime ≠ bundler` failure mode where a project tests fine under one and breaks under the other.

**Negative.**

- Source `.ts` imports must carry the `.js` extension that NodeNext resolution expects (`import { foo } from './bar.js'`). This trips reviewers familiar with the older "no extension" TS style; the root `README.md` explains it but the friction is real.
- `__dirname` and `require` are not available at runtime. Code that needs them uses the ESM equivalents (`fileURLToPath(import.meta.url)`, `createRequire(import.meta.url)`); concrete patterns will land with M2 (Node runtime, Cat 8–14).
- A CJS-only dependency cannot be tree-shaken and cannot be top-level awaited; the dep must be consumed via Node's interop or replaced. The dependencies convention's native-first stance reduces how often this matters in practice, but real cases will still appear.
- Pure-CJS publishing is unsupported. A team that adopts these standards and later needs to publish CJS-only must amend this ADR rather than work around the templates.

**Neutral.**

- Any project that adopts this baseline must explicitly state if and where it deviates from ESM-first. The default is "no deviation".
- Tooling that does not yet support `.ts` in ESM mode is consumed via `.mts` when needed; the `.mts/.cts` extensions are covered by the baseline's lint and Prettier globs.

## Alternatives considered

- **CJS as the default.** Familiar, no `.js`-extension friction in TS sources, no `__dirname` polyfill. Rejected because the broader ecosystem (Node itself, every modern bundler, every modern framework's own configs) is moving the other way; locking the standards to CJS would mean re-deciding every time a tool drops CJS support, and every adopting project would inherit a model the tool authors are no longer optimizing for.
- **Dual support with no opinion.** Let each project pick. Rejected because "no opinion" pushes the cost onto the consumer — they would need to know the runtime behavior of every config file they copy. The whole point of the standards is to absorb that cost upstream.
- **ESM-first for apps, CJS-first for libraries.** Splits the contract along publishing intent. Rejected because it forces every library author to maintain two source trees or run a transpile step the standards do not document; the simpler rule (ESM-only or dual, never CJS-only) is enforceable in tooling and easier to reason about.

## References

- [Principle 5 — Simplicity over flexibility](../principles.md)
- [Principle 8 — Dependencies are debt](../principles.md)
- [Conventions — Dependencies (native-first table)](../conventions/dependencies.md)
- [ADR 0004 — Single-baseline scope](./0004-single-baseline.md)
- [Node.js ECMAScript Modules](https://nodejs.org/docs/latest-v22.x/api/esm.html)

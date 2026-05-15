---
title: Single-baseline scope
status: accepted
date: 2026-05-12
supersedes: 0001-cross-stack-composition
superseded-by:
---

<!-- Based on docs/_templates/adr.md -->

# ADR 0004 — Single-baseline scope

## Context

The repo was originally designed to ship five stacks composed in a chain: a `base` stack carrying language-level conventions, a `node` stack on top of it carrying runtime conventions, and three framework stacks (`nestjs`, `expo`, `tanstack-start`) on top of `node` or `base`. ADR 0001 codified how those stacks were supposed to compose — `extends` in `tsconfig.json`, array spread in `eslint.config.ts`, full copies of `.prettierrc.json`, and base-only files for `lefthook` / `commitlint` / `knip`.

After the seven TypeScript categories in `base` landed, two things became visible that the original design did not account for:

- **Framework rules age quickly, while the baseline does not.** NestJS, Expo, and TanStack Start each move on their own release cadence; their idiomatic patterns shift every few minor versions. A rule set committed to this repo for any of them would either run perpetually behind the framework or force this repo into the framework's release cycle. The maintenance cost is real; the value is small relative to the maintenance, because teams adopting those frameworks already carry strong opinions about how to use them.
- **The `node` stack is not actually a separate stack.** Its planned categories (8–14: runtime patterns, Node-specific APIs, error semantics on Node, async idioms, etc.) are not framework opinions — they are continuations of the same TypeScript baseline the seven categories delivered. The split between "base" and "node" was a packaging decision, not a content one. Once that became clear, the `extends` chain ADR 0001 documents was a layer of indirection without a payoff.

The decision now is whether to keep the multi-stack scaffolding ADR 0001 describes (and pay the maintenance cost of the framework stacks that motivated it) or collapse the repo to the work that has demonstrated value: a single, framework-agnostic TS + Node 22 LTS baseline.

## Decision

This repo ships a single baseline. Scope:

- **In:** TypeScript rules (Categories 1–7, already delivered) and Node 22 LTS runtime rules (Categories 8–14, planned next). Both live in one `docs/rules.md`, addressed to any consumer running TypeScript on Node — no framework assumptions.
- **Out:** framework-specific stacks (`nestjs`, `expo`, `tanstack-start`). The original `node` stack is folded into the baseline rather than kept as a separate layer. Consumers using a specific framework derive their own repo from this baseline if they need framework-level opinions; this repo does not vendor them.

ADR 0001 (cross-stack composition) is marked `superseded` by this ADR — its format-by-format composition strategy no longer applies, because there are no longer multiple stacks to compose. The composition table, the `extends` chain, and the array-spread pattern in ADR 0001 remain as historical record only.

Physical reshaping of the repo (flattening `stacks/base/{config,docs}` into the root, absorbing the base README into the root README, retargeting all internal paths) is delivered in follow-up PRs. This ADR is the contract those PRs implement.

### Why this is a scope decision, not a structural one

The `stacks/` directory was a consequence of the multi-stack model, not the cause. Removing the directory without removing the model would leave the repo's narrative misaligned with its layout: ADRs, README, and CLAUDE.md still describing five stacks while the filesystem ships one. The decision recorded here is scope first; flattening follows because the scope changed, not the other way around.

### Why the `node` stack is folded in rather than kept

Splitting "language conventions" from "runtime conventions" sounds clean but does not pay off in practice: every Node rule references TS types, every TS rule needs a runtime to anchor on, and a consumer adopting this repo without Node has no reason to be here. Keeping them separate would force every Cat 8–14 rule to specify "applies in the node stack" and every Cat 1–7 rule to specify "applies in all stacks" — overhead the single-baseline model removes entirely.

## Consequences

**Positive.**

- One place to maintain rules; no per-stack drift; no recurring "where does this rule belong?" question on every new convention.
- The repo's narrative collapses: one README, one `rules.md`, no composition chain to explain. Consumers stop asking "which stack do I copy?" because there is only one answer.
- The base stack's existing `config/` ships unchanged after flattening — the files that exist today are exactly the files a consumer needs, just at a different path.
- ADR 0001's composition complexity (relative-path `extends`, array-spread imports, copy-and-diverge Prettier) is no longer a contract to honor. New rules can ignore the multi-stack question entirely.

**Negative.**

- A consumer that needs framework-specific rules cannot extend this repo from the inside — they must vendor it (degit) and overlay their own rules in their own repo. There is no "drop in `nestjs` rules on top of `base`" path anymore.
- Until the follow-up PRs land, the repo is internally inconsistent at several concrete points: `stacks/base/docs/rules.md` anchors every Cat 1–7 rule to "the base stack"; `README.md` describes a five-stack catalog; `CLAUDE.md` lists `stacks/` in its layout block; six cross-references in `docs/principles.md` point at `stacks/base/docs/rules.md`. The supersession note on ADR 0001 covers the ADR layer, but the window between this ADR landing and the README / CLAUDE.md rewrite is a real cost, not a notional one.
- ADR 0001's example artifacts (the live `node` stack `eslint.config.ts` and `tsconfig.json` it sketched) never shipped. Anyone reading 0001 expecting those examples to materialize needs the supersession note to redirect them here.

**Neutral.**

- Numbering of ADRs is preserved. ADR 0001 stays at 0001, marked `superseded`; the supersession note + frontmatter point readers to this ADR. No history is rewritten.
- Categories 1–7 keep their numbering and content; Cat 8–14 (Node runtime) carry the content that would have lived in the old `node` stack, but addressed to the single baseline rather than to a stack-on-stack composition.
- The next rule chapter is rescoped to "Base extension: Node runtime (Cat 8–14)"; the framework chapters that would have followed (NestJS, Expo, TanStack Start) are cancelled.
- ADR 0002's release-tag format `YYYY-MM-DD-BREAKING-<stack>` and its per-stack `git log -- stacks/<stack>/` audit query inherit an open question — with a single baseline, `<stack>` is either vestigial or always the same value. This ADR does not decide what to do; the first breaking change after the follow-up PRs land is the natural forcing function for an amendment or supersession of ADR 0002. **Resolved 2026-05-12: ADR 0002 amended in-place to drop the `<stack>` segment — see PR #46.**

## Alternatives considered

- **Keep multi-stack with `node` only — drop the three framework stacks.** Solves the "framework rules age fast" half of the problem but leaves the composition machinery in place for a single downstream stack. The `extends` chain, array-spread imports, and prettier copy-and-diverge would still need to be documented, reviewed, and maintained — for one consumer (`node`) that turns out to share the same audience as `base`. Rejected: too much scaffolding for too little gain.
- **Keep `base` alone — drop `node` entirely.** A pure-TS baseline with no runtime opinion. Rejected: leaves an obvious gap that every consumer will fill the same way (copy-pasted Node patterns from blog posts), which is exactly the problem this repo exists to absorb. Cat 8–14 are not optional; they are the second half of the baseline.
- **Publish `base` as an npm package.** Pre-existing rejection from ADR 0001's alternatives section. Still rejected for the same reason: the stateless-copy model in the project README is a feature, not a workaround; reintroducing version coupling is the failure mode that motivated this repo's existence.

## References

- [Principle 5 — Simplicity over flexibility](../principles.md)
- [Principle 8 — Dependencies are debt](../principles.md)
- [ADR 0001 — Cross-stack composition](./0001-cross-stack-composition.md) (superseded by this ADR)
- [ADR 0002 — Release policy](./0002-release-policy.md)
- [ADR 0003 — ESM-first as the default module system](./0003-esm-first.md)

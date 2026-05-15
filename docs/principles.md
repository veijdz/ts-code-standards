---
title: Foundational principles
last-reviewed: 2026-05-10
---

<!-- Based on docs/_templates/principles.md -->

# Foundational principles

> These eleven principles are the **why** behind every rule and convention in this repo. They are intentionally few, short, and stable — when a principle changes, the rules and ADRs that derive from it must be revisited. Numbering is stable; do not renumber when adding.

1. **Type safety is non-negotiable.**
   TypeScript only earns its place if its guarantees actually hold. `any`, casual `as` casts, and silent `@ts-ignore` turn the compiler off exactly where the bug is most likely to live. The escape hatch is `@ts-expect-error` with a short written reason — the comment forces an explanation, and the directive itself surfaces as a failure if the underlying issue ever goes away. Concrete rules live in [Cat 1 — TypeScript](./rules.md). _Exception:_ third-party types that are demonstrably wrong may be narrowed with a localized `as` plus a comment pointing at the upstream issue.

2. **Explicit over implicit.**
   Code is read more than it is written, and most reading happens out of context. Default exports, inferred return types on exported surfaces, and clever metaprogramming push that missing context onto the reader. Named exports, explicit return types on public functions, and direct imports give the reader everything they need at the call site. Concrete rules live in [Cat 3 — Imports/Exports](./rules.md) and Cat 1 (TypeScript).

3. **Validate at boundaries, trust within.**
   Every untrusted input — HTTP request body, database row, env var, file contents, third-party API response — must be parsed through a schema at the boundary that produces a typed value. Internal code then trusts that type and does not re-validate. The result is two clearly separated zones: a thin, paranoid edge and a calm interior. _Exception:_ defensive checks that encode an invariant (e.g., an `assert` immediately after a narrowing operation) are documentation, not validation, and are fine.

4. **Errors are expected, not exceptional.**
   Anything touching IO, parsing, or another process can fail; the type system says so. Empty `catch` blocks, silent fallbacks, and `throw "string"` all destroy the trail that lets you debug the failure later. Throw real `Error` instances, wrap rethrows with `cause`, and let unhandled errors crash loudly rather than corrupt state quietly. Concrete rules live in [Cat 4 — Errors & Async](./rules.md).

5. **Simplicity over flexibility.**
   Every option, abstraction, and configuration point is a future maintenance cost paid against a hypothetical future benefit. Fifty obvious lines beat two hundred clever ones; one concrete implementation beats a generic engine with a single caller. Add the abstraction the third time you need it, not the first. _Exception:_ public surfaces consumed by code you do not control (libraries, plugin APIs) earn flexibility upfront, because changing them later is expensive.

6. **Tools enforce, humans decide.**
   Anything a linter, formatter, or compiler can check should be checked there. Style and consistency are settled in config; humans spend their review attention on design, naming, and intent. The corollary: if the same rule keeps coming up in code review, the failure is that it is not yet in the linter. Concrete enforcement lives in `config/`.

7. **Tests cover behavior, not implementation.**
   Tests bound to internals turn every refactor into a test rewrite, which quietly teaches the team to avoid refactoring. Prefer integration tests that drive the system through the same seams a real caller would. The database is part of that behavior — use a real one via testcontainers, never a mock. Concrete rules live in [conventions/testing.md](conventions/testing.md) and [Cat 7 — Testing](./rules.md). _Exception:_ pure functions with no IO are fine to unit-test directly; that is still testing behavior, just at a smaller seam.

8. **Dependencies are debt.**
   Every package adds an attack surface, a maintenance vector, and a version-conflict risk. Reach for the standard library and `node:` built-ins first; add a dependency only when writing it yourself clearly costs more than carrying it long term. `lodash`, `moment`, and `querystring` are banned outright because modern platform equivalents exist. Concrete rules live in [conventions/dependencies.md](conventions/dependencies.md).

9. **Performance is a feature.**
   N+1 queries, blocking calls inside hot paths, and bundle bloat are not optimizations to consider later — they are bugs to fix at the same time as correctness. This is not about micro-optimization (`x++` vs `++x`); it is about catching the predictable, structural costs that are obvious in review and painful to fix in production. Profile before optimizing anything that does not fall in this category. Unlike the other principles, this one does not produce a dedicated rule category — it guides review attention and design choices, not a tool-enforceable rule.

10. **Git history is enforced, not aspirational.**
    Conventional Commits, branch naming, and PR shape are enforced at the `commit-msg` and `pre-push` hooks, plus repo-level branch protection. A message that does not fit the contract is rejected at the point of writing, not in review. The reason is changelog automation: a release tool reads the commit history, not the PR titles. Concrete rules live in [conventions/git.md](conventions/git.md).

11. **Clarity over brevity.**
    `userPaymentMethod` reads in one second; `upm` requires the reader to either already know the abbreviation or pause to look it up. Save the brevity for loop counters and one-line lambdas. The same applies to comments: explain _why_ (a constraint, a workaround, a non-obvious tradeoff) — never _what_, because the code already says that. Concrete rules live in [Cat 2 — Naming](./rules.md) and Cat 6 (Comments & Documentation).

## How to use this document

- Every rule in `rules.md` should be traceable to at least one principle here.
- Every ADR should cite the principles it leans on, or explicitly state it overrides one.
- Disagreements about a specific rule are resolved by going back to these principles, not by debating the rule in isolation.

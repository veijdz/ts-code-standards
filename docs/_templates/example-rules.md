---
title: Base rules
stack: base
category: Cat 7 — Testing (shared)
last-reviewed: 2026-05-10
---

<!-- Based on docs/_templates/rules.md -->

# Base — Cat 7 — Testing (shared)

> Fictional, filled example of a `rules.md` section. Demonstrates the anatomy of `docs/_templates/rules.md`. Real Cat 7 content lives at `stacks/base/docs/rules.md` once published.

## Required dependencies

The consumer must install these to apply the rules below. Versions are the **minimum supported**; newer compatible majors should keep working unless noted.

| Package | Min version | Role in this Cat |
|---|---|---|
| `vitest` | `^2.0.0` | Test runner that the rules in this Cat target (file layout, naming, lifecycle). |
| `eslint-plugin-vitest` | `^0.5.0` | Lints test code against the rules below (no focused tests, no skipped tests without a reason). |
| `@vitest/coverage-v8` | `^2.0.0` | Coverage collection used as diagnostic by `pnpm test --coverage`; no threshold enforced. |

## Sub-blocks

### Test layout

Tests live in a dedicated folder tree, never co-located next to source.

#### Rule: Place tests under `tests/<kind>/`

**Why.** Co-located tests blur the boundary between shipped code and test fixtures and force every consumer to configure path filters for builds, bundlers, and coverage. A dedicated tree makes that boundary explicit and lets tooling stay default.

**✓ Example.**

```
src/users/service.ts
tests/unit/users/service.test.ts
tests/integration/users/repository.test.ts
```

**✗ Example.**

```
src/users/service.ts
src/users/service.test.ts
```

**Exceptions.** _None._ If a snippet truly belongs next to the code (e.g., doctest-style examples), put it in JSDoc instead of a test file.

---

### Test isolation

Tests must not share mutable state.

#### Rule: Do not mock the database — use testcontainers

**Why.** Mocks of database clients hide schema drift and query-shape bugs that only fail in production. A real database started per test run keeps the contract honest and surfaces breakage at the cheapest possible time.

**✓ Example.**

```ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  db = createClient(container.getConnectionUri());
});
```

**✗ Example.**

```ts
vi.mock('./db', () => ({
  query: vi.fn().mockResolvedValue([{ id: 1 }]),
}));
```

**Exceptions.** Unit tests that exercise pure logic with no DB dependency obviously do not need a container. Anything touching the data layer does.

## Notes

- This file is an example, not authoritative. The real Cat 7 file lives at `stacks/base/docs/rules.md` once published.
- The line immediately after the frontmatter references the template that drives the structure (`<!-- Based on docs/_templates/rules.md -->`). Future stack rules should keep that reference.

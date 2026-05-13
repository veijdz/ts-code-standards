---
title: Rules — Cat 7 worked example
last-reviewed: 2026-05-12
---

<!-- Based on docs/_templates/rules.md -->

# Rules — Cat 7 worked example

> Worked, fictional example of a single Cat section, populated to show the anatomy of [`docs/_templates/rules.md`](./rules.md). Read this file to see the template filled in; the **authoritative** Cat 7 content lives in [`docs/rules.md`](../rules.md) under `## Cat 7 — Testing`.

## Cat 7 — Testing

This category sets the universal testing conventions every consumer inherits — folder layout, file suffixes, the mock policy (sub-block 7.8 below). These conventions hold regardless of which runner a project picks; the runner choice itself is wired per project.

### Required dependencies

_None at the baseline level._ The runner (`vitest`, `jest`, etc.) and its eslint plugin are wired per project. The conventions in this Cat are runner-agnostic on purpose so they survive a future swap.

### 7.8 — Mock policy: never the database, only external boundaries

Mocking the database is the most common way to ship tests that pass in CI and break in production: the mock returns whatever the test author imagined the SQL would return, the real query disagrees, and the bug only shows up after deploy. Real database tests via testcontainers cost a few hundred milliseconds of startup per file and remove the entire class of mock-vs-prod divergence.

#### Convention: real database via testcontainers; mock only paid or remote-only third-party boundaries

**Why.** A mocked database guarantees the test exercises the _idea_ of the query, not the query itself — schema migrations that nobody ran, JSONB casts that silently fail, indexes missing that the query planner now scans sequentially: none of these surface against a mock. For external services that are remote-only or paid (Stripe, SendGrid, OpenAI), the trade reverses: the round-trip is too expensive and too flaky to run on every PR, so a faithful HTTP-boundary mock is the right tool.

**✓ Example.**

```ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'

let container: StartedPostgreSqlContainer

beforeAll(async () => {
  container = await new PostgreSqlContainer().start()
})

afterAll(async () => {
  await container.stop()
})

it('persists the order', async () => {
  await repo.insert(makeOrder({ id: 'a' }))
  expect(await repo.findById('a')).toMatchObject({ id: 'a' })
})
```

**✗ Example.**

```ts
vi.mock('./db', () => ({
  query: vi.fn().mockResolvedValue([{ id: 'a' }]),
}))

it('persists the order', async () => {
  const result = await repo.insert(makeOrder({ id: 'a' }))
  expect(result.id).toBe('a') // green even if the real query is broken
})
```

**Exceptions.** _None._ When a test genuinely needs to isolate one internal module from another, use dependency injection (pass the dependency in), never `vi.mock()` of a first-party module.

## Notes

- This file is a worked example, not authoritative. The real Cat 7 lives in [`docs/rules.md`](../rules.md) under `## Cat 7 — Testing`.
- The `<!-- Based on docs/_templates/rules.md -->` line right after the frontmatter mirrors the convention used by real docs derived from a template.

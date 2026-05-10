---
title: Testing
last-reviewed: 2026-05-10
---

<!-- Based on docs/_templates/convention.md -->

# Conventions — Testing

> Test taxonomy, layout, naming, and the parts that are non-negotiable (no DB mocks, coverage as diagnostic). Derives from [Principle 7 — Tests cover behavior, not implementation](../principles.md). Stack-specific runner and tooling rules live in the stack's `rules.md` (base lands in VEI-422).

## Scope

Applies to every test file in any project that adopts these standards, regardless of test runner. Covers the three test kinds, where they live on disk, naming, the mock policy, and what coverage signals are used for. Does **not** cover the runner config or assertion library — those belong in the stack's rules.

## Rules

### Test taxonomy

- **Rule.** Three kinds, and only three: **unit**, **integration**, **e2e**.
  - **Why.** A bounded vocabulary lets the suite be reasoned about. Names like "smoke", "functional", "acceptance" overlap so much that they stop signaling anything specific.
  - **How.** The folder structure enforces the choice — a test must live in exactly one of the three trees below.

- **Rule.** Definitions are strict, not aspirational:
  - **unit** — exercises a pure function or a small, self-contained module. No IO. No process boundaries.
  - **integration** — exercises a module or feature in collaboration with at least one real adjacent system (database, queue, file system, in-process HTTP). Slow is acceptable.
  - **e2e** — exercises the deployed system through an external client (HTTP request from outside the process, browser session, CLI invocation). The system under test runs as a black box.
  - **Why.** Without crisp definitions the same test gets re-classified every refactor, and the pyramid loses meaning.

### Adjusted pyramid

- **Rule.** Most tests are integration. Unit tests cover pure logic. E2E tests cover the golden paths only.
  - **Why.** Unit-heavy suites mock the parts that actually break in production (queries, network, schema drift). E2E-heavy suites are slow, flaky, and starve the inner loop. Integration-heavy is the realistic sweet spot for backend and full-stack apps where the interesting behavior lives in collaboration.
  - **How.** Treat this as a default heuristic, not a quota — frontend-only projects and pure-algorithm libraries legitimately deviate.

### Test location

- **Rule.** Tests live under `tests/`, partitioned by kind: `tests/unit/`, `tests/integration/`, `tests/e2e/`. Co-locating tests next to source files is forbidden.
  - **Why.** A dedicated tree keeps the boundary between shipped code and test fixtures explicit; bundlers, coverage, and `tsc` then need zero special path filters. Co-location forces every consumer of these standards to reconfigure their build.
  - **How.** Mirror the source structure inside each kind. Example: `src/users/service.ts` → `tests/unit/users/service.test.ts`.

- **Rule.** Test files use the suffix `.test.ts` for unit and integration, and `.e2e.ts` for end-to-end.
  - **Why.** A single suffix for unit/integration keeps runner configuration trivial; the distinct `.e2e.ts` lets CI pick up e2e separately (different runner, different infra, different time budget).

### Mock policy

- **Rule.** Never mock the database. Use [testcontainers](https://node.testcontainers.org/) (or the equivalent in-process real database) for any test that touches data.
  - **Why.** Mocks of a database client hide schema drift, query-shape errors, and migration bugs — the exact failures DB code is most likely to introduce. A real database started per test run keeps the contract honest at the cheapest possible time.
  - **How.** Standard pattern: `beforeAll` starts the container, `afterAll` stops it, tests run against the real connection URI. Concrete example in [docs/_templates/example-rules.md](../_templates/example-rules.md).

- **Rule.** Mock only external boundaries you do not own: third-party HTTP APIs, costly SDKs (paid-per-call), and clocks when time matters to assertions.
  - **Why.** External boundaries are where determinism breaks; mocking them is the only way to keep tests offline and fast. Mocking your own code is testing the mocks.
  - **How.** Prefer real clients pointed at a recorded or replay layer (`nock`, MSW, VCR-style) over hand-written mock objects — recordings drift loudly when the real API changes; hand-mocks drift silently.

- **Rule.** `vi.mock` of a first-party module is a code smell. Investigate the design before reaching for it.
  - **Why.** If a function needs to be mocked to test its caller, the caller probably owns too many concerns or the seam is at the wrong layer.

### Naming

- **Rule.** Test names describe behavior and condition: `describesExpectedBehavior_whenCondition` or, in `it` blocks, `'<does X> when <condition>'`.
  - **Why.** A failing test name should tell the reader what the system was supposed to do; "test 1" or "should work" force a click into the body.
  - **How.** Examples:
    - `returnsEmptyArray_whenInputIsEmpty`
    - `it('rejects the request when the token has expired', …)`
    - Not `it('works')`, `it('handles edge cases')`, `it('test pagination')`.

### Arrange / Act / Assert

- **Rule.** Each test body is visibly split into Arrange (setup), Act (the single behavior under test), Assert (expectations). Blank lines separate the three.
  - **Why.** A scannable structure makes intent obvious and makes "two acts in one test" easy to catch in review.
  - **How.** When Arrange grows large, factor it into a helper named for the scenario, not for the function: `givenUserWithExpiredToken()`, not `setupTest1()`.

### Coverage

- **Rule.** Coverage is a diagnostic, never a gate. Do not configure a coverage threshold in CI.
  - **Why.** Thresholds turn coverage into a target, and Goodhart's law applies — engineers will write trivial tests to hit the number, and the suite gets worse, not better.
  - **How.** Generate coverage reports for inspection (`pnpm test --coverage`), look at uncovered branches when reviewing PRs, but do not fail the build on a percentage.

- **Rule.** Untested code is allowed; **untestable** code is not.
  - **Why.** Some code (glue, trivial getters) is genuinely not worth a test. Code that resists testing — because the seam is wrong, because state is global — is the actual signal coverage tools point at.

### Determinism

- **Rule.** Tests must pass in any order, including `--shuffle`. Order-dependent tests are bugs.
  - **Why.** Shared mutable state between tests is the second leading cause of flakiness (after time/network); tests that rely on order will fail in CI parallelization at the worst possible moment.
  - **How.** Use per-test database transactions (rolled back) or per-test schemas; never reuse global fixtures across tests.

- **Rule.** Do not mock `Date.now` or `performance.now` globally. Mock the clock _inside_ the specific test that needs it, and restore at the end.
  - **Why.** A globally frozen clock breaks any unrelated test that happens to read the time later.

- **Rule.** Explicit cleanup. `afterEach` / `afterAll` undoes whatever the test created, deterministically.
  - **Why.** Test teardown that depends on garbage collection or process exit is a flake waiting for the right CI scheduler.

## Rationale

- **Why integration-heavy instead of unit-heavy?** The classic unit-test pyramid was developed for codebases dominated by pure logic. Modern backends are dominated by collaboration with databases, queues, and external APIs — the bugs live there. The pyramid inversion follows the bugs.
- **Why ban DB mocks specifically and not all mocks?** Database mocks fail an unusually specific way: they pass while production breaks, because schema or query bugs only surface against the real engine. External-API mocks fail more loudly (recorded fixtures go stale visibly).
- **Why no coverage threshold?** The metric is too easy to game. A 90% threshold and a careful eye on which lines are uncovered in PRs gives the same information without the gaming incentive.

## Out of scope

- The choice of test runner (Vitest, Node test runner, Jest) — that is stack-specific; the `base` choice lands in VEI-422.
- Snapshot testing policy — separate convention, not yet defined.
- Performance / load testing — separate concern, lives outside this convention.

## References

- [Principle 7 — Tests cover behavior, not implementation](../principles.md)
- [Testcontainers for Node.js](https://node.testcontainers.org/)
- [`docs/_templates/example-rules.md`](../_templates/example-rules.md) — the testcontainers example referenced from "Mock policy".

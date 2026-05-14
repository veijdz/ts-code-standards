---
title: Rules
last-reviewed: 2026-05-11
---

<!-- Based on docs/_templates/rules.md -->

# Rules

> Catalog of enforceable rules for the baseline (TypeScript + Node 22 LTS, framework-agnostic). Built progressively, one category per issue. See [`docs/principles.md`](./principles.md) for the why behind every rule and [`config/`](../config) for the tools that enforce them.

## Cat 1 — TypeScript / Type system

### Required dependencies

| Package             | Min version | Role in this Cat                                   |
| ------------------- | ----------- | -------------------------------------------------- |
| `typescript`        | `^6.0.0`    | Compiler that enforces the flags in sub-block 1.1. |
| `typescript-eslint` | `^8.0.0`    | Provides the rules in sub-blocks 1.2 – 1.5.        |

### 1.1 — Compiler flags

The compiler is the first line of defense. Every flag below is non-negotiable: each closes a class of bug that no lint rule can catch as cheaply.

#### Rule: enable the strict-by-default compiler flags

**Why.** TypeScript without `strict: true` is a different language with a different set of guarantees. The flags beyond `strict` close gaps `strict` itself leaves open — index access, optional vs `undefined`, switch fallthrough, dead code. Enabling them later is exponentially more expensive than enabling them now.

The full set, configured in [`config/tsconfig.json`](../config/tsconfig.json):

| Flag                                 | What it adds beyond `strict`                                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `strict`                             | Enables `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `alwaysStrict`.                        |
| `noUncheckedIndexedAccess`           | Treats `arr[i]` and `obj[key]` as `T \| undefined`. Forces narrowing before use.                                                                                  |
| `exactOptionalPropertyTypes`         | Distinguishes "property absent" from "property set to `undefined`". Critical for API contracts.                                                                   |
| `noImplicitOverride`                 | Requires the `override` keyword when subclassing — catches stale overrides after a base-class rename.                                                             |
| `noImplicitReturns`                  | Every code path in a function must return (or none). Catches missing branches.                                                                                    |
| `noFallthroughCasesInSwitch`         | Forces `break` / `return` / `throw` between non-empty cases.                                                                                                      |
| `noUnusedLocals`                     | Errors on unused local bindings.                                                                                                                                  |
| `noUnusedParameters`                 | Errors on unused parameters (prefix with `_` to opt out).                                                                                                         |
| `noPropertyAccessFromIndexSignature` | Requires `obj['unknownKey']` instead of `obj.unknownKey` when the key is not declared on the type. Surfaces typos.                                                |
| `isolatedModules`                    | Each file must be transpilable in isolation — required by `tsc --build`, esbuild, swc, and Vite.                                                                  |
| `verbatimModuleSyntax`               | Imports/exports are emitted exactly as written. Forces `import type` for type-only imports.                                                                       |
| `skipLibCheck`                       | Skips type-checking of declaration files in `node_modules`. Speeds up `tsc` significantly with no real loss — third-party types fail at consumption sites anyway. |

**Exceptions.** _None._ A project that needs to relax any of these flags has a deeper problem (legacy migration, generated code) and should isolate the relaxation in a separate `tsconfig.<scope>.json`, not weaken the baseline.

### 1.2 — Disallow `any`

`any` opts out of every guarantee TypeScript provides at the exact place a bug is most likely to live. We ban `any` in every form — direct annotation, cross-boundary leakage, and silent inference from untyped libraries.

#### Rule: no explicit `any`, anywhere

**Why.** A single `any` poisons every value derived from it: the result is `any`, the result of an operation on the result is `any`, and so on. The fix is `unknown` plus a narrowing step (a type guard, a schema, or `@ts-expect-error` if narrowing is impossible).

**✓ Example.**

```ts
function parseUser(input: unknown): User {
  if (!isUser(input)) throw new Error('invalid user payload')
  return input
}
```

**✗ Example.**

```ts
function parseUser(input: any): User {
  return input
}
```

**Exceptions.** _None_ for first-party code. Third-party types that are demonstrably wrong may be widened or narrowed via a localized `as` plus a comment pointing at the upstream issue (see [Principle 1 — Type safety is non-negotiable](./principles.md)).

#### Rule: no implicit `any` from unsafe operations

**Why.** Even with `no-explicit-any` on, `any` still creeps in: `JSON.parse`, untyped libraries, `Function` parameters, dynamic property access. The `no-unsafe-*` family closes those routes one by one.

| Rule                      | What it catches                                               |
| ------------------------- | ------------------------------------------------------------- |
| `no-unsafe-argument`      | Passing `any` as an argument to a typed function.             |
| `no-unsafe-assignment`    | Assigning `any` to a typed binding.                           |
| `no-unsafe-call`          | Calling a value typed as `any`.                               |
| `no-unsafe-member-access` | Reading a property off `any`.                                 |
| `no-unsafe-return`        | Returning `any` from a function with a non-`any` return type. |

**Exceptions.** _None._ Use `unknown` and narrow.

### 1.3 — Assertions and escape hatches

Type assertions and `@ts-*` comments turn the compiler off. They are sometimes necessary, but these rules force them to leave a written trail.

#### Rule: no non-null assertions (`!`)

**Why.** `value!` silently asserts the compiler is wrong about `null` / `undefined`. When it _is_ wrong, the failure is a runtime crash with no breadcrumb. Replace with a real check (`if (!value) throw …`) or a narrowing helper (`assertDefined`).

**✓ Example.**

```ts
const user = users.find((u) => u.id === id)
if (!user) throw new Error(`user ${id} not found`)
return user.email
```

**✗ Example.**

```ts
return users.find((u) => u.id === id)!.email
```

**Exceptions.** _None._ If the value is "obviously" defined, write the check anyway — the cost is one line.

#### Rule: no `@ts-ignore`, no `@ts-nocheck`; `@ts-expect-error` only with a description

**Why.** `@ts-ignore` silently swallows errors and stays put forever. `@ts-expect-error` does the opposite: if the underlying error ever resolves, the directive itself becomes the error. The required description forces an explanation that survives the next reader.

**✓ Example.**

```ts
// @ts-expect-error upstream typings missing for `Foo.bar`; tracked in upstream/123
foo.bar()
```

**✗ Example.**

```ts
// @ts-ignore
foo.bar()
```

**Exceptions.** _None._ If a description shorter than 10 characters seems sufficient, the directive is wrong.

#### Rule: no unnecessary type assertions

**Why.** `value as T` where `value` is already `T` is dead code that lies — when the type around it changes, the assertion silently masks the new error.

**✓ Example.**

```ts
const id: string = getId()
return id.toUpperCase()
```

**✗ Example.**

```ts
const id: string = getId()
return (id as string).toUpperCase()
```

#### Rule: assertions use `as`, not angle brackets; never on object literals

**Why.** `<T>value` collides with TSX syntax and cannot be used in `.tsx` files; the codebase should not have two assertion forms. Object literal assertions (`{ a: 1 } as User`) are a code smell — they bypass excess-property checking, which is the one safety net for typo'd keys; declare the variable with the type instead.

**✓ Example.**

```ts
const user: User = { id: '1', email: 'a@b.c' }
const value = readJson() as Config
```

**✗ Example.**

```ts
const user = { id: '1', email: 'a@b.c' } as User
const value = <Config>readJson()
```

### 1.4 — Generic type parameters

Generic type parameters always start with `T`. The convention matches TanStack and most modern TypeScript libraries, and makes type parameters visually distinguishable from concrete types at the point of use.

#### Rule: type parameters are PascalCase and prefixed with `T`

**Why.** Without a prefix, `Key extends keyof T` and a top-level `type Key = …` look identical at the use site, and renaming one accidentally captures the other. The `T` prefix makes the binding obvious. Single-letter `T` remains valid for the trivial 1-parameter case where there is no ambiguity.

**✓ Example.**

```ts
function pick<TObject, TKey extends keyof TObject>(obj: TObject, key: TKey): TObject[TKey] {
  return obj[key]
}

function identity<T>(value: T): T {
  return value
}
```

**✗ Example.**

```ts
function pick<O, K extends keyof O>(obj: O, key: K): O[K] {
  return obj[key]
}
```

**Exceptions.** _None._ Even single-letter `T` follows the rule (it _is_ the prefix).

### 1.5 — `type` vs `interface`

The two are nearly equivalent for object shapes — but only one is allowed here, to avoid bikeshedding in review.

#### Rule: define types with `type`, not `interface`

**Why.** `type` covers everything `interface` covers, plus unions, intersections, mapped types, and conditional types. `interface` adds declaration merging, which is a footgun in application code (a re-declaration in another file silently extends the type) and is only genuinely useful for module augmentation in `.d.ts` files. One default eliminates the question entirely.

**✓ Example.**

```ts
type User = {
  id: string
  email: string
}

type Result<TValue> = { ok: true; value: TValue } | { ok: false; error: Error }
```

**✗ Example.**

```ts
interface User {
  id: string
  email: string
}
```

**Exceptions.** Allowed inside `.d.ts` files only — module augmentation (`declare module '…' { interface X { … } }`) requires `interface`.

## Cat 2 — Naming

This category is the concrete enforcement of [Principle 11 — Clarity over brevity](./principles.md): names that read in one second beat names that need a context lookup. Where a rule cannot be expressed in lint (function-as-verb, array-as-plural, "one concept per file"), the convention is documented as reviewer guidance per [Principle 6 — Tools enforce, humans decide](./principles.md).

### Required dependencies

| Package                 | Min version | Role in this Cat                                                                                                         |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `eslint-plugin-unicorn` | `^56.0.0`   | Provides `filename-case` (sub-block 2.4) and `prevent-abbreviations` (applies to identifier shape across the whole Cat). |

The `@typescript-eslint/naming-convention` rule from sub-blocks 2.1–2.3 is provided by `typescript-eslint` (already required by Cat 1).

> **Note on `prevent-abbreviations`.** The configured `allowList` matches **bare identifiers only** — `req: true` allows a binding literally named `req`, but `parseReq`, `httpReq`, `pageProps`, etc., are still flagged because the rule splits compound names on word boundaries. To exempt an abbreviation everywhere it appears (compound or bare), use `replacements: { req: false }` instead — these rules err on the conservative side.

### 2.1 — Case per element

Three cases, applied consistently per element kind. The compiler does not police identifier shape — `naming-convention` does, and the policy is uniform across the codebase so reviews never argue about it.

#### Rule: variables, functions, and parameters are camelCase

**Why.** Mixed casing inside a file makes it hard to scan; a single default for runtime values keeps the eye moving. PascalCase is reserved for compile-time names (types) so the two zones are visually separable at a glance.

**✓ Example.**

```ts
const userCount = 42
function fetchUser(userId: string) {
  /* … */
}
```

**✗ Example.**

```ts
const UserCount = 42
function FetchUser(user_id: string) {
  /* … */
}
```

**Exceptions.** Default and namespace imports keep their source name (the `import` selector allows both `camelCase` and `PascalCase`); named imports (`import { foo } from '…'`) are not constrained by this rule because the library picks the binding shape. A leading underscore is permitted to mark a deliberately unused binding (`_unused`).

#### Rule: types, classes, interfaces, and enums are PascalCase

**Why.** These names exist only at compile time; PascalCase makes that obvious next to camelCase runtime values. Type and class names also tend to map to nouns (`User`, `OrderRepository`), which read better in PascalCase.

**✓ Example.**

```ts
type User = { id: string }
class OrderRepository {
  /* … */
}
enum OrderStatus {
  Pending,
  Shipped,
}
```

**✗ Example.**

```ts
type user = { id: string }
class orderRepository {
  /* … */
}
```

#### Rule: global `const` may be `UPPER_CASE` only when bound to an external, immutable value

**Why.** `UPPER_CASE` is a strong visual signal — it should mean "this value is set outside the program and never changes" (an environment variable, a protocol constant, a magic number from a spec). Using it for ordinary tunables drains the signal: every reader has to ask "is this actually external?"

**✓ Example.**

```ts
const MAX_RETRY_COUNT = 5 // protocol-level cap, written once, read everywhere
const DATABASE_URL = process.env.DATABASE_URL ?? '' // external, immutable

const defaultPageSize = 20 // tunable, app-internal — camelCase
const cacheTtlMs = 30_000 // ditto
```

**✗ Example.**

```ts
const DEFAULT_PAGE_SIZE = 20 // app-level config, not external — should be camelCase
const FETCH_USER_URL = '/api/u' // app-level route, not external
```

**Exceptions.** _The rule itself is reviewer-side; the lint configuration accepts both shapes._ The choice between `camelCase` and `UPPER_CASE` for a global `const` is a code-review judgment that follows the principle above — lint cannot tell whether a value is bound to an external source.

### 2.2 — Semantic identifiers

A name should describe what the value _means_, not how it is implemented. Two patterns are enforced; the rest are guidance the reader will internalize.

#### Rule: boolean variables are prefixed with `is`, `has`, `should`, or `can`

**Why.** `user.active` could be a string, a count, an enum, or a boolean — the reader has to look. `user.isActive` ends the question. The four prefixes cover the natural shapes (state, possession, prescription, capability) without sprawling into synonyms.

**✓ Example.**

```ts
const isAuthenticated = checkSession()
const hasPermission = role === 'admin'
const shouldRetry = attemptCount < maxAttempts
const canEdit = user.role === 'editor'
```

**✗ Example.**

```ts
const authenticated = checkSession() // is it bool, status string, or session object?
const permission = role === 'admin' // same question
```

**Exceptions.** _None._ Other tense prefixes (`will`, `did`, `was`) are not in the allowlist; if the meaning truly is past or future, restructure as a noun (`lastLoginAt`, `nextRunAt`).

#### Rule: functions are imperative verbs; arrays are plural

**Why.** `fetchUser` says what calling the function will do; `userFetcher` says what _kind of thing_ the function is, which is rarely the question at the call site. Plural array names (`users` vs `user`) prevent the off-by-one read where `user[0]` is mistaken for the only user.

**✓ Example.**

```ts
function fetchUser(id: string): Promise<User> {
  /* … */
}
const users: User[] = await fetchAllUsers()
```

**✗ Example.**

```ts
function userFetcher(id: string): Promise<User> {
  /* … */
}
const user: User[] = await fetchAllUsers() // plural collection, singular name
```

**Exceptions.** _Not lint-enforced._ This is reviewer guidance — the false-positive rate of a verb-detector lint rule is too high to be worth running.

### 2.3 — Generic type parameters

The rule lives in [Cat 1.4 — Generic type parameters](#14--generic-type-parameters); this sub-block is preserved for parity with the issue numbering. Type parameters are PascalCase with the `T` prefix (`T`, `TKey`, `TValue`).

### 2.4 — File names

A predictable filename shape matters more than which shape is picked, but a project still has to pick one. We pick kebab-case for portability (no case-sensitivity surprises across macOS / Linux / Windows) and to match the dominant convention in the Node ecosystem.

#### Rule: file names are kebab-case

**Why.** Mixed-case filenames silently break on case-insensitive filesystems (macOS default, Windows): a file `userService.ts` resolves the same as `UserService.ts` locally but not in CI. Kebab-case avoids the class entirely.

**✓ Example.**

```text
src/users/user-service.ts
src/orders/order-repository.ts
src/lib/parse-currency.ts
```

**✗ Example.**

```text
src/users/UserService.ts
src/users/userService.ts
src/users/user_service.ts
```

**Exceptions.** Consumer repos with framework-specific routing may legitimately need different cases (e.g., `app/[id]/page.tsx`, file-router conventions). When that happens, the consumer repo overrides this rule in its own ESLint block; the baseline rule remains kebab-case.

#### Rule: one concept per file

**Why.** A file named `user-service.ts` should export the user service and nothing else (helpers it uses internally are private, not co-exports). Files that bundle unrelated exports force the reader to scan the whole file to find the binding they came for, and they make the import line at the call site lie about its dependency.

**Reviewer guidance.** _Not lint-enforced._ Tightly coupled types alongside the value they describe (`type User` next to `function isUser`) are fine; unrelated utilities crammed together are not.

### 2.5 — No barrel files

A barrel file (`index.ts` that re-exports from siblings) trades a tiny ergonomic gain for two real costs: it defeats tree-shaking (bundlers walk the whole barrel before deciding what to drop) and it creates subtle import cycles that are hard to debug.

#### Rule: `export *` is forbidden

**Why.** `export * from './x'` is the construct that turns `index.ts` into a barrel. Banning the construct is more precise than banning the filename — it allows `index.ts` to exist as a real module (containing actual code) while ruling out the re-export-only pattern. The fix at the call site is one extra path segment: `import { foo } from './module/foo'` instead of `import { foo } from './module'`.

**✓ Example.**

```ts
// in user-service.ts
export function fetchUser(id: string) {
  /* … */
}
export function deleteUser(id: string) {
  /* … */
}

// at the call site
import { fetchUser } from './users/user-service'
```

**✗ Example.**

```ts
// in users/index.ts
export * from './user-service'
export * from './user-repository'

// at the call site
import { fetchUser } from './users' // bundler can't drop the unused exports
```

**Exceptions.** _None._ The lint rule (`no-restricted-syntax` on `ExportAllDeclaration`) bans every `export *` regardless of source — first-party or third-party. To re-export from a library, list the symbols explicitly: `export { foo, bar } from 'some-lib'`.

## Cat 3 — Imports / Exports

This category enforces a single, predictable shape for module boundaries: how a module exposes its API (sub-block 3.1), how a consumer pulls it in (sub-blocks 3.2–3.4), and what it is forbidden from importing (sub-blocks 3.5–3.6). Together with [Cat 2.5 — No barrel files](#25--no-barrel-files), the rules eliminate the recurring import-noise debates from review.

### Required dependencies

| Package                  | Min version | Role in this Cat                                                                                       |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------ |
| `eslint-plugin-import-x` | `^4.0.0`    | Provides `no-default-export` (sub-block 3.1), `order` (sub-block 3.2), and `no-cycle` (sub-block 3.5). |

`@typescript-eslint/consistent-type-imports` (sub-blocks 3.3 and 3.4) is provided by `typescript-eslint` (already required by Cat 1). `no-restricted-imports` (sub-block 3.6) is a core ESLint rule.

> **Note on resolvers.** `import-x/no-cycle` and `import-x/order` resolve module paths via the default Node resolver. Projects that use TypeScript path aliases (`paths` in `tsconfig.json`) must add `eslint-import-resolver-typescript` and wire it into `settings['import-x/resolver-next']` themselves — the baseline config does not assume aliases exist. Minimum wiring:
>
> ```ts
> import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
>
> // in eslint.config.ts, alongside the Cat 3 block:
> { settings: { 'import-x/resolver-next': [createTypeScriptImportResolver({ alwaysTryTypes: true })] } }
> ```

### 3.1 — No default exports

Default exports look ergonomic and cost nothing at first; the price shows up the first time someone renames the symbol or tries to tree-shake the file. Named exports avoid both costs without losing anything.

#### Rule: `export default` is forbidden

**Why.** Three concrete failure modes: (1) **rename does not propagate** — an IDE rename touches the source but not the call sites, because each call site picked its own binding name (`import Foo from './foo'`, `import Bar from './foo'`); (2) **tree-shaking is weaker** — the default becomes the module's namespace value, so bundlers cannot drop adjacent named exports as confidently; (3) **inconsistent naming at call sites is permitted by design**, which makes `git grep` for usages unreliable. Named exports avoid all three.

**✓ Example.**

```ts
// in user-service.ts
export function fetchUser(id: string) {
  /* … */
}

// at the call site
import { fetchUser } from './user-service'
```

**✗ Example.**

```ts
// in user-service.ts
export default function fetchUser(id: string) {
  /* … */
}

// at the call sites — both legal, both different
import fetchUser from './user-service'
import getUser from './user-service'
```

**Exceptions.** Root-level config files (`vite.config.ts`, `next.config.ts`, `playwright.config.ts`, etc.) match the glob `**/*.config.{ts,mts,cts,js,mjs,cjs}` and are exempted in the baseline config — most build tools load the file via `import('./tool.config').then((m) => m.default)` and have no way to consume a named export. Consumer repos with file-based routing (Next.js page/layout files, TanStack Start route files) own their own override on top of the baseline.

### 3.2 — Import order

Diff churn from import-order changes is pure noise — humans should not review or write it. The rule sorts imports into four groups, alphabetizes within each group, and inserts a blank line between groups. ESLint auto-fix does the work.

#### Rule: imports are grouped, alphabetized, and separated by blank lines

**Why.** A single canonical order means (1) the group a module belongs to is visible from its position alone (built-in vs npm vs first-party vs local), (2) review never argues about ordering, and (3) merges inside the import block are conflict-free more often, because both sides converge on the same order. Alphabetization removes the last bit of human judgement from the block.

The four groups, in order:

1. `builtin` — Node built-ins (`node:fs`, `node:path`, `crypto`).
2. `external` — npm packages (`react`, `zod`, `typescript-eslint`).
3. `internal` — first-party modules referenced by alias (`@/lib/users`). The `internal` group is empty unless a path resolver is wired up — see the resolver note above.
4. `parent` + `sibling` + `index` — relative imports (`../config`, `./helpers`, `./`), collapsed into one group.

Type imports are placed inside their physical group (a type import from `'react'` lives in `external`, not in a separate trailing group); the split between value and type imports is enforced by sub-block 3.4, which puts them in their own statement.

**✓ Example.**

```ts
import { readFile } from 'node:fs/promises'

import { z } from 'zod'

import { parseConfig } from '@/lib/config'

import { logger } from '../logger'
import { format } from './format'
```

**✗ Example.**

```ts
import { format } from './format'
import { z } from 'zod'
import { readFile } from 'node:fs/promises'
import { parseConfig } from '@/lib/config'
import { logger } from '../logger'
```

**Exceptions.** _None._ The rule is auto-fixable; running ESLint with `--fix` produces the canonical order.

### 3.3 — Type-only imports use `import type`

The compiler can elide imports that are used only as types — but only if they are written as `import type`. `verbatimModuleSyntax` (Cat 1.1) makes this mandatory at the compiler level; the ESLint rule auto-fixes existing code to match.

#### Rule: type-only imports are written as `import type` (or `import { type X }`)

**Why.** Without `import type`, the compiler keeps the import in the emitted JS even when the symbol is used only in a type position, which (a) breaks tree-shaking around the consumed module and (b) can cause runtime side-effect imports the author did not intend. Marking the intent at the import site lets the compiler elide cleanly.

**On layering with `verbatimModuleSyntax`.** Cat 1.1 already turns `verbatimModuleSyntax` on, which is the compiler-level enforcement of this rule — and the [typescript-eslint docs explicitly recommend not running both `consistent-type-imports` and `verbatimModuleSyntax`](https://typescript-eslint.io/rules/consistent-type-imports/). The baseline runs both anyway, deliberately: the compiler errors but does not auto-fix, and `verbatimModuleSyntax` does not enforce the statement-split from sub-block 3.4 below. The known overlap modes (decorator metadata, `--isolatedDeclarations`) produce duplicate errors but no incorrect behaviour. The auto-fix and the split are the price of keeping the import block clean.

**✓ Example.**

```ts
import type { User } from './user-types'

import { fetchUser } from './user-service'
```

**✗ Example.**

```ts
import { User } from './user-types' // value import, but used only as a type — kept in the emit

import { fetchUser } from './user-service'
```

**Exceptions.** _None._ The compiler-level enforcement (`verbatimModuleSyntax`) leaves no slack here. See [sub-block 3.4](#34--type-imports-stay-in-their-own-statement) for the companion rule that prevents value and type imports from sharing a single statement.

### 3.4 — Type imports stay in their own statement

When a module exposes both runtime values and types, mixing them in one `import` statement (`import { fetchUser, type User } from './user'`) is legal but loses the visual signal that part of the import is type-only. The auto-fix splits them into two statements.

#### Rule: `consistent-type-imports` with `fixStyle: 'separate-type-imports'`

**Why.** Two single-purpose statements scan faster than one mixed statement: the eye sees the `import type` keyword and skips the line if it is looking for runtime usages. The cost is one extra line of imports per mixed module — paid back the first time a reader is hunting for value imports in a long block.

**✓ Example.**

```ts
import type { User } from './user-types'

import { fetchUser } from './user-service'
```

**✗ Example.**

```ts
import { fetchUser, type User } from './user-service'
```

**Exceptions.** _None._ The rule auto-fixes; nothing has to be done by hand.

### 3.5 — No import cycles

Two modules importing each other is almost always an accident. When it is intentional, the design is wrong: the shared piece should be extracted into a third module. Cycles also defeat tree-shaking and produce undefined-at-import-time bugs that only fire on the first call.

#### Rule: `import-x/no-cycle` is enabled (`maxDepth: Infinity`, `ignoreExternal: true`)

**Why.** A cycle through `n` modules turns into a `null` reference for the side that is loaded second — because the other side has not finished initializing when the first reference is taken. The bug is invisible until the import order changes (a new module is added, the bundler re-orders), at which point a previously-fine call site throws `TypeError: x is not a function`. The rule catches the cycle at lint time, before the runtime even loads. `ignoreExternal: true` skips cycles that pass through `node_modules` — those are the library author's problem and produce noisy false positives in apps.

**Fix.** Extract the shared piece. If `a.ts` and `b.ts` both need `Foo`, move `Foo` into `foo.ts` and have both import from there.

**Exceptions.** _None._ Cycles are extracted, not annotated.

### 3.6 — Restricted imports

A short denylist for libraries the platform now obsoletes. The error message points at the modern replacement so the fix is one search away.

#### Rule: `lodash`, `lodash-es`, `moment`, `querystring`, `node:querystring` are forbidden

**Why.** Each entry has a native or modern replacement that is smaller, faster, and already present in the runtime: `lodash` and `lodash-es` are obsoleted by ES2019+ array/object methods, `structuredClone`, and `Object.entries` / `Object.fromEntries`; `moment` is obsoleted by the native `Date` + `Intl` for most needs and `date-fns` or `dayjs` when arithmetic helpers are required (and is itself in maintenance mode); `querystring` is a deprecated Node built-in obsoleted by `URLSearchParams`. Reaching for the legacy library wastes bundle size and ties new code to an aging ecosystem.

**✗ Example.**

```ts
import _ from 'lodash'
import moment from 'moment'
import qs from 'querystring'
```

**✓ Example.**

```ts
const unique = [...new Set(items)]
const now = new Date().toISOString()
const params = new URLSearchParams({ q: 'search' })
```

**Exceptions.** _None for new code._ Migrating away from an existing dependency is a separate, scoped PR — the lint failure is the prompt.

## Cat 4 — Errors & Async

This category enforces a single shape for failure: every thrown value is an `Error` (sub-blocks 4.1–4.2, 4.6), every re-throw preserves its predecessor (sub-block 4.3), and every `Promise` is either awaited or explicitly handled (sub-blocks 4.4–4.5). Together they turn "the call failed" into a debuggable trail rather than a stack with the wrong line numbers.

### Required dependencies

| Package                 | Min version | Role in this Cat                                                                                                                       |
| ----------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `typescript-eslint`     | `^8.0.0`    | Provides `only-throw-error` (4.2), `no-floating-promises` (4.4), `return-await` (4.5). Already required by Cat 1.                      |
| `eslint-plugin-unicorn` | `^56.0.0`   | Provides `error-message`, `throw-new-error`, `prefer-type-error` (4.2) and `custom-error-definition` (4.6). Already required by Cat 2. |

`no-empty` (sub-block 4.1) is a core ESLint rule.

### 4.1 — Empty catch blocks are forbidden

A `catch (e) {}` block silently swallows every failure that flows through it, including the ones the original author never anticipated. The fix is one of: re-throw, log with context, or convert to a typed result — never nothing.

#### Rule: `no-empty` with `allowEmptyCatch: false`

**Why.** A swallowed exception removes the only signal a future debugger has that anything went wrong. The bug shifts from "this line throws" to "this feature silently does nothing for some users", which is orders of magnitude harder to chase. Even a comment-only `catch` is better than an empty one — it at least points at intent.

**✓ Example.**

```ts
try {
  await sendMetric(payload)
} catch (error) {
  logger.warn('metric send failed', { error, payload })
}
```

**✗ Example.**

```ts
try {
  await sendMetric(payload)
} catch {}
```

**Exceptions.** _None._ If a failure is genuinely safe to ignore, the catch body should still log at debug level — silence is never the correct intent.

### 4.2 — Throw `Error` instances, never plain values

A thrown string or object literal loses everything an `Error` carries: a stack trace, a `name`, a uniform `instanceof` check, and the V8 cause chain. Every throw site uses `new Error(...)` or a subclass.

#### Rule: `@typescript-eslint/only-throw-error`, `unicorn/throw-new-error`, `unicorn/error-message`, `unicorn/prefer-type-error`

**Why.** Four failure modes the four rules close, in order: (1) throwing a non-`Error` value (`throw 'oops'`) defeats every `instanceof Error` guard downstream and produces a useless stack trace; (2) `throw Error('msg')` (no `new`) is inconsistent with subclass usage and trips static analyzers that assume constructor calls; (3) `throw new Error()` with no message produces `Error: undefined` in logs; (4) `throw new Error('expected a string')` after a `typeof` check should be `throw new TypeError(...)` — the typed subclass lets callers distinguish "wrong type" from "wrong value".

**✓ Example.**

```ts
if (typeof input !== 'string') {
  throw new TypeError(`expected string, received ${typeof input}`)
}
throw new Error(`unknown user: ${id}`)
```

**✗ Example.**

```ts
throw 'unknown user'
throw { message: 'unknown user' }
throw Error('unknown user')
throw new Error()
if (typeof input !== 'string') {
  throw new Error('expected string')
}
```

**Exceptions.** _None._ Library code that needs callers to `instanceof`-check a custom class should subclass `Error` (see [sub-block 4.6](#46--custom-error-classes-carry-semantic-names)), not throw a bare value.

### 4.3 — Re-throws preserve the original via `cause`

When wrapping an error to add context, the original error is passed through the `cause` option of the `Error` constructor. Modern runtimes walk the cause chain in stack traces and structured logs.

#### Convention: `new Error('context', { cause: original })`

**Why.** Without `cause`, the wrap discards the original stack trace and replaces the trail at the wrap site. The downstream debugger sees "wrap failed" with no clue what the inner failure was. With `cause`, Node's default error formatter prints both — `Error: wrap failed → caused by: Error: inner failure` — and structured loggers (`pino`, `winston`) traverse the chain automatically.

**✓ Example.**

```ts
try {
  return await fetchUser(id)
} catch (error) {
  throw new Error(`failed to load user ${id}`, { cause: error })
}
```

**✗ Example.**

```ts
try {
  return await fetchUser(id)
} catch (error) {
  throw new Error(`failed to load user ${id}: ${(error as Error).message}`)
}
```

**Exceptions.** _None._ String-interpolating the inner message into the outer message hides the inner stack; `cause` keeps both. This sub-block is convention only — no mainstream lint rule enforces it, and ad-hoc `no-restricted-syntax` matchers catch shape but miss intent.

### 4.4 — No floating promises

A `Promise` that is created but never awaited or chained leaks two ways: rejections become unhandled (crashing modern Node by default), and the surrounding function returns before the promise settles. Every promise either has an `await`, a `.then(...).catch(...)`, or a deliberate `void` to signal fire-and-forget.

#### Rule: `@typescript-eslint/no-floating-promises` with default options

**Why.** Floating promises are the single most common cause of "the test passed but the assertion never ran" and of silent data-loss bugs ("we wrote the audit log… or did we?"). The rule reads from type information, so it flags any `Promise<T>` value that is dropped — including ones from third-party libraries the author may not have realized were async. Defaults are kept (`ignoreVoid: true`): a leading `void` is the documented escape hatch for code that genuinely wants fire-and-forget, and removing the hatch tends to push teams toward worse workarounds (top-level `.catch(noop)` etc).

**✓ Example.**

```ts
await sendMetric(payload)

// fire-and-forget, intentional, with explicit handler
void sendMetric(payload).catch((error) => logger.warn('metric failed', { error }))
```

**✗ Example.**

```ts
sendMetric(payload)
```

**Exceptions.** _None._ `void` is the escape hatch. If `void` feels too easy, the call probably should be awaited.

### 4.5 — `return await` inside `try`/`catch`

`return promise` and `return await promise` behave differently when the surrounding function has a `catch`. Without the `await`, the promise leaves the `try` block before settling, so a rejection is never caught.

#### Rule: `@typescript-eslint/return-await` set to `'in-try-catch'`

**Why.** Outside of a `try`/`catch`, `return await` and `return` are equivalent at runtime — the extra microtask is wasteful. Inside a `try`/`catch`, the difference is silent and load-bearing: `return promise` lets the rejection escape past the `catch`, so the wrap-and-rethrow pattern in [sub-block 4.3](#43--re-throws-preserve-the-original-via-cause) never fires. `'in-try-catch'` requires the `await` only where it matters and forbids it where it does not.

**✓ Example.**

```ts
async function loadUser(id: string) {
  try {
    return await fetchUser(id)
  } catch (error) {
    throw new Error(`failed to load user ${id}`, { cause: error })
  }
}

async function listUsers() {
  return fetchUsers() // no try/catch — bare return is fine
}
```

**✗ Example.**

```ts
async function loadUser(id: string) {
  try {
    return fetchUser(id) // rejection escapes the try; catch never fires
  } catch (error) {
    throw new Error(`failed to load user ${id}`, { cause: error })
  }
}
```

**Exceptions.** _None._ The rule's auto-fix inserts the `await` where required.

### 4.6 — Custom error classes carry semantic names

When a domain has more than one failure mode, distinguishing them by class is cheaper for callers than parsing message strings. The convention: subclass `Error`, set `this.name` to the class name in the constructor, and use names that describe the failure category — `ValidationError`, `NotFoundError`, `ConflictError`, `AuthorizationError` — not the symptom.

#### Rule: `unicorn/custom-error-definition`

**Why.** A `catch (error)` that needs to branch on category should branch on `instanceof NotFoundError`, not on `error.message.includes('not found')` — string parsing is fragile to translation, log redaction, and copy edits. The class name also surfaces in structured logs (`error.name`), which is what dashboards group on. The lint rule enforces the structural pieces (correct `super` call, `name` set in the constructor) so subclasses behave like real `Error`s.

**✓ Example.**

```ts
class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} ${id} not found`)
    this.name = 'NotFoundError'
  }
}

if (!user) {
  throw new NotFoundError('user', id)
}
```

**✗ Example.**

```ts
class NotFoundError extends Error {
  // missing super(message), missing this.name — instanceof works, log shape does not
}

throw new Error('user not found') // forces callers to string-match
```

**Exceptions.** Names are convention, not lint-enforced — the rule only checks structure. A project that needs different categories (`RateLimitedError`, `OutOfStockError`) is free to add them; the constraint is "names describe the category, not the symptom".

## Cat 5 — Functions & Structure

This category turns "how big a unit can be" into a hard ceiling. Functions stay short (sub-block 5.1), take few parameters (5.2), branch shallowly (5.3) and nest shallowly (5.4); files stay under a working-set ceiling (5.5). Module-level functions are named declarations so they hoist and surface in stack traces (5.6); arrow functions stay where they read best — inline at the call site (5.7).

### Required dependencies

All rules in this Cat are core ESLint — no additional packages required.

### 5.1 — Functions stay under 30 effective lines

Long functions accumulate responsibilities by accretion: each new branch lands in the same body because there is no friction to splitting. Capping the function at 30 lines of executable code (blank lines and comments do not count) makes the cost of "one more thing" visible — extracting a helper becomes cheaper than growing the body.

#### Rule: `max-lines-per-function` set to `30` with `skipBlankLines` and `skipComments`

**Why.** 30 is aggressive but still the median window a reader can hold on one screen without scrolling. Beyond that, the function stops being a unit and becomes a script: callers cannot predict its scope, edits cannot be reasoned about locally, and stack traces lose their narrative. The skip options are load-bearing — counting JSDoc and blank lines would punish the very habits (documentation, breathing room) that make a 30-line function readable.

**✓ Example.**

```ts
function applyDiscount(order: Order, code: string): Order {
  const rule = lookupRule(code)
  if (!rule) return order
  if (!isEligible(order, rule)) return order
  return { ...order, total: order.total * (1 - rule.percent) }
}
```

**✗ Example.**

```ts
function applyDiscount(order: Order, code: string): Order {
  const rule = lookupRule(code)
  if (!rule) {
    log.warn('unknown discount code', { code })
    return order
  }
  if (rule.expiresAt < Date.now()) {
    log.info('discount code expired', { code, expiresAt: rule.expiresAt })
    return order
  }
  if (rule.minimumTotal > order.total) {
    log.info('order below minimum', {
      code,
      total: order.total,
      minimum: rule.minimumTotal,
    })
    return order
  }
  // …another 18 lines of stacked conditions
}
```

**Exceptions.** Test files (`**/*.{test,spec}.{ts,tsx,cts,mts}`) raise the cap to 100. The `describe(name, () => { ... })` callback aggregates cohesive scenarios that read better as one suite than as fragmented sibling files; the 100-line ceiling still flags suites that should split into nested describes.

### 5.2 — Functions take three parameters or fewer

Beyond three positional arguments, call sites stop being self-documenting. `createUser(name, email, role, true, null)` is unreadable; `createUser({ name, email, role, isAdmin: true, parent: null })` reads itself. The fourth parameter is the trigger to convert to an options object.

#### Rule: `max-params` set to `3`

**Why.** Positional arguments rely on the reader knowing the parameter order, and that knowledge degrades as functions evolve. Three is the empirical threshold where the call site still parses (`fetch(url, options, signal)`); at four it requires opening the signature. An options object also gives every argument a name at the call site, makes optional arguments truly optional, and absorbs new parameters without breaking existing callers.

**✓ Example.**

```ts
type CreateOrderInput = {
  customerId: string
  items: Item[]
  coupon?: string
  metadata?: Record<string, unknown>
}

function createOrder(input: CreateOrderInput): Order {
  // …
}

createOrder({ customerId, items, coupon: 'SUMMER25' })
```

**✗ Example.**

```ts
function createOrder(
  customerId: string,
  items: Item[],
  coupon: string | undefined,
  metadata: Record<string, unknown>,
): Order {
  // …
}

createOrder(customerId, items, undefined, {}) // what is each arg again?
```

**Exceptions.** _None._ Class constructors, route handlers, and library callbacks all respect the three-arg ceiling — when a DI container or framework signature needs more, the destructured options object replaces them.

### 5.3 — Cyclomatic complexity stays at or below 10

Complexity counts independent paths through a function — every `if`, `case`, `&&`, `||`, ternary, and loop adds one. A function with complexity above 10 has more execution paths than a reader can track while editing. The fix is the same as 5.1: extract.

#### Rule: `complexity` set to `10`

**Why.** 10 is the McCabe number — empirically the threshold above which functions become testing liabilities (you need more than ten test cases to cover every branch) and review liabilities (reviewers can no longer reason about what an edit broke). Below 10, branches still parse linearly; above, the function is a state machine that should either be split or reified as a typed state object. The rule catches the case where path count grows incrementally — each new branch looks small, but the cumulative complexity is what matters.

**✓ Example.**

```ts
function classify(score: number): Tier {
  if (score >= 90) return 'gold'
  if (score >= 70) return 'silver'
  if (score >= 50) return 'bronze'
  return 'none'
}
```

**✗ Example.**

```ts
function classify(input: Input): Tier {
  if (input.kind === 'paid' && input.score >= 90 && !input.flagged) return 'gold'
  else if (input.kind === 'paid' && input.score >= 70) return 'silver'
  else if (input.kind === 'free' && input.score >= 50 && input.referrals > 0) return 'silver'
  else if (input.kind === 'paid' && input.score >= 50) return 'bronze'
  else if (input.score >= 30 || input.referrals > 5) return 'bronze'
  // …each new branch silently raises the count
  return 'none'
}
```

**Exceptions.** _None._ Reducers and parsers that genuinely have many cases belong in a lookup table or a typed state machine, not a stacked conditional.

### 5.4 — Block nesting stays at or below three

Three levels of `if`/`for`/`try` nesting is the practical maximum for a reader to track "where am I, and how did I get here". Beyond that, the indentation alone obscures what is executing.

#### Rule: `max-depth` set to `3`

**Why.** Nested blocks compound: at depth 4, a reader has to hold four simultaneous predicates to interpret the inner code. Early returns, guard clauses, and extracted helpers flatten the same logic to depth 1–2. Most depth-4 nests indicate one of: (a) a guard that was not extracted, (b) a loop body that should be its own function, or (c) a ternary chain disguised as nested ifs. Catching the violation while writing is cheap; refactoring a depth-5 monstrosity later is not.

**✓ Example.**

```ts
function process(items: Item[]): Result[] {
  if (items.length === 0) return []
  return items.filter(isActive).map(toResult)
}
```

**✗ Example.**

```ts
function process(items: Item[]): Result[] {
  const out: Result[] = []
  if (items.length > 0) {
    for (const item of items) {
      if (item.active) {
        if (item.score > 0) {
          out.push(toResult(item)) // depth 4 — reader has lost the predicates
        }
      }
    }
  }
  return out
}
```

**Exceptions.** _None._

### 5.5 — Files stay under 300 lines

A file is a working-set boundary: everything in it loads into the reader's head at once. 300 lines is the threshold beyond which navigation (open file → find symbol → understand context) starts costing more than splitting.

#### Rule: `max-lines` set to `300`

**Why.** 300 is not about file load time — it is about cognitive load. Beyond 300 lines, IDE "jump to symbol" becomes faster than scrolling, which means the file has stopped being a unit. The rule fires during writing, not after the 800-line monolith already exists; that is when the split decision is cheap. Paired with sub-block 5.1, a healthy file holds roughly 5–10 functions plus their types and a small amount of module-scope setup — the natural density of one cohesive concept.

**Exceptions.** Test files (`**/*.{test,spec}.{ts,tsx,cts,mts}`) raise the cap to 500. Integration suites benefit from grouping many scenarios in one file (shared fixtures, shared setup, shared narrative); the 500 ceiling still flags suites that should split by feature or scenario family.

### 5.6 — Module-level functions are declarations

Functions exported or used at module scope are declared with `function`, not assigned from arrow expressions. The two have meaningful runtime differences: declarations hoist (so the order of definitions in the file becomes editorial, not load-bearing), and they carry a name at runtime (so the stack trace says `at applyDiscount` instead of `at <anonymous>`).

#### Rule: `func-style` set to `'declaration'`

**Why.** Hoisting lets the file read top-down (public surface first, helpers below) without forcing every helper to be defined before its first caller. The named-function-trace property is what makes errors actionable — every minute spent debugging an `<anonymous>` frame is a minute lost to a style choice. The rule's strict mode (no `allowArrowFunctions`) is intentional: an exported `const handleClick = () => { ... }` defeats both properties at once.

**✓ Example.**

```ts
export function applyDiscount(order: Order, code: string): Order {
  return computeNewTotal(order, lookupRule(code))
}

function lookupRule(code: string): Rule | undefined {
  // declared below the public function — hoisting makes the order editorial
}

function computeNewTotal(order: Order, rule: Rule | undefined): Order {
  // …
}
```

**✗ Example.**

```ts
// arrow assigned to const at module top — fails on hoisting and on stack-trace name
export const applyDiscount = (order: Order, code: string): Order => {
  // …
}
```

**Exceptions.** Inline arrows passed as arguments are not affected by this rule — they are not assigned to a variable. See [sub-block 5.7](#57--arrow-functions-stay-inline-at-the-call-site).

### 5.7 — Arrow functions stay inline at the call site

`func-style: 'declaration'` only flags arrows assigned to variables; arrows passed inline as arguments are unaffected. That asymmetry is intentional — inline arrows are how callbacks and JSX handlers should look, and a named function would add ceremony with no readability gain.

#### Convention: arrows for inline callbacks and JSX handlers; declarations for everything else

**Why.** Naming costs context. A 5-character `x => x.id` body, when promoted to a named helper, becomes a three-line declaration that adds no information; the reader of `arr.map(extractId)` then has to jump to the definition to learn what `extractId` does — a worse outcome than the inline lambda. The convention works because the boundary is sharp: if the function has a second caller it earns a name (and a `function` declaration); if it has one caller the inline expression _is_ the call-site documentation.

**✓ Example.**

```ts
const ids = users.map(user => user.id)
const active = users.filter(user => user.status === 'active')

return <Button onClick={() => handleSubmit(form)}>Submit</Button>
```

**✗ Example.**

```ts
const extractId = (user: User) => user.id // module-top arrow assignment — flagged by 5.6
const ids = users.map(extractId)
```

**Exceptions.** _None._ A named single-use helper indicates either (a) the call site needs explanation, in which case prefer a comment at the call site, or (b) the helper has multiple callers, in which case it earns a `function` declaration per [sub-block 5.6](#56--module-level-functions-are-declarations).

## Cat 6 — Comments & Documentation

This category sets the boundary for _when to write a comment at all_. Default is silence (sub-block 6.1); the only legitimate target is the non-obvious **why** (6.2); JSDoc is reserved for published surfaces (6.3); dev markers like `TODO`/`FIXME`/`XXX`/`HACK` are forbidden in committed code (6.4); and any lint suppression must justify itself in-line (6.5).

### Required dependencies

| Package                                           | Min version | Role in this Cat                      |
| ------------------------------------------------- | ----------- | ------------------------------------- |
| `@eslint-community/eslint-plugin-eslint-comments` | `^4.0.0`    | Provides `require-description` (6.5). |

`no-warning-comments` (sub-block 6.4) is a core ESLint rule. Sub-blocks 6.1, 6.2 and 6.3 are convention only — no mainstream lint rule encodes "comment density" or "JSDoc-on-public-API-only", and ad-hoc matchers would catch shape but miss intent.

### 6.1 — Default: zero comments

Well-named identifiers carry the meaning that a comment would otherwise restate. A function named `applyDiscount` already says "this applies a discount"; the comment `// applies the discount` adds nothing and rots when the function changes. Default state is silence — comments are an exception that needs a reason.

#### Convention: write no comment unless the _why_ is non-obvious

**Why.** Comments degrade in two ways: they stop matching the code (because edits do not update them), and they crowd the screen (each line of unnecessary comment is one line of code the reader cannot see at the same time). The "explanation" a redundant comment provides is already in the identifiers; the only comments that survive a year of edits are the ones that record information the code itself cannot express. See [sub-block 6.2](#62--comment-only-the-non-obvious-why).

**✓ Example.**

```ts
function applyDiscount(order: Order, code: string): Order {
  const rule = lookupRule(code)
  if (!rule) return order
  return { ...order, total: order.total * (1 - rule.percent) }
}
```

**✗ Example.**

```ts
// Apply the discount to the order
function applyDiscount(order: Order, code: string): Order {
  // Look up the discount rule by code
  const rule = lookupRule(code)
  // If no rule, return the order unchanged
  if (!rule) return order
  // Compute the new total with the discount
  return { ...order, total: order.total * (1 - rule.percent) }
}
```

**Exceptions.** _None._ When the _why_ is non-obvious, write the comment per [sub-block 6.2](#62--comment-only-the-non-obvious-why). When the surface is published, use JSDoc per [sub-block 6.3](#63--jsdoc-only-on-published-apis).

### 6.2 — Comment only the non-obvious _why_

The single legitimate use of a comment is to record information the code _cannot_ express: a workaround for an upstream bug, an external business rule, a platform gotcha, a constraint that was discovered the hard way. If removing the comment would leave a future reader confused about _why_ the code is the way it is, it earns a comment.

#### Convention: comment the _why_, never the _what_

**Why.** The _what_ is already in the code — restating it is overhead that drifts out of date. The _why_ — workarounds, external constraints, non-obvious invariants — is the part that disappears from the codebase the moment the original author leaves. Pinning that information at the call site is the cheapest way to keep it alive: the next reader sees it without context-switching to a tracker, and the comment moves with the code if the file is split.

**✓ Example.**

```ts
// Stripe rounds amounts down at 2 decimals; we apply the same flooring here so
// our reconciliation totals match the dashboard. The discrepancy that surfaced
// this is documented in the team's payments runbook.
const settled = Math.floor(amount * 100) / 100
```

**✗ Example.**

```ts
// Floor the amount to 2 decimals
const settled = Math.floor(amount * 100) / 100
```

**Exceptions.** _None._ A comment that reads like a sentence the reader could have inferred from the next two lines is the same problem as the redundant comments banned by [sub-block 6.1](#61--default-zero-comments).

### 6.3 — JSDoc only on published APIs

JSDoc is overhead that pays back only when there is an external consumer who cannot read the source — a library publishing a typed API, a cross-team contract, a public CLI surface. Internal modules do not need JSDoc; the type signature plus a well-named identifier already document the contract for in-repo callers.

#### Convention: one-line JSDoc on published surfaces; no JSDoc anywhere else

**Why.** Inside a single repo, the type signature, the identifier name, and a quick jump-to-definition give a reader more accurate information than any JSDoc — and the JSDoc requires a separate edit when the signature changes. JSDoc only earns its keep at the publication boundary, where consumers see the editor tooltip but not the source. Even there, one sentence is enough — multi-paragraph examples belong in the README, not above the function.

**✓ Example.**

```ts
/** Validate an email per RFC 5322 lite — accepts the same shape as the HTML5 input. */
export function isValidEmail(input: string): boolean {
  // …
}
```

**✗ Example.**

```ts
/**
 * Validates the given email string.
 *
 * @param input - the string to validate
 * @returns true if the input is a valid email, false otherwise
 * @example
 *   isValidEmail('foo@bar.com') // true
 *   isValidEmail('not-an-email') // false
 */
function isValidEmail(input: string): boolean {
  // …
}
```

**Exceptions.** _None._ A library project may layer JSDoc validity rules (`check-tag-names`, `valid-types`) on top of this convention — that is out of scope here; the baseline applies equally to apps and libraries.

### 6.4 — Dev markers are forbidden in committed code

Markers like `TODO`, `FIXME`, `XXX`, and `HACK` are scratch-paper artifacts. They mark "deal with this later" without a deadline, an owner, or a way to find them — and they accumulate. A code base with 200 `TODO` comments has 200 silent debts that nobody is tracking. The fix is to track the work in the issue tracker and let the source stay clean.

#### Rule: `no-warning-comments` with `terms: ['todo', 'fixme', 'xxx', 'hack']`

**Why.** Tracking work in the source instead of in an issue tracker has three failure modes: (a) `TODO`s never get a date or an owner, so they outlive the original context that motivated them; (b) reviewers cannot tell which `TODO`s block the merge and which were copied in from a year ago; (c) external observers (PMs, oncall, future hires) have no surface to discover them. Lint-failing on the four markers forces the work into the tracker, where it gets a number, an owner, and a status. The terms are matched at the start of the comment (the rule's default `location: 'start'`), so a reference to the word `todo` mid-sentence in a _legitimate_ comment is unaffected.

**✓ Example.**

```ts
// Reconciliation skips refunds older than 90 days because Stripe expires their
// metadata after that window. Tracked in the payments backlog if we need to revisit.
function reconcile(payments: Payment[]): Reconciled[] {
  // …
}
```

**✗ Example.**

```ts
// TODO: handle refunds older than 90 days
// FIXME: this breaks on negative amounts
// HACK: bypass validation for now
function reconcile(payments: Payment[]): Reconciled[] {
  // …
}
```

**Exceptions.** _None._ When work needs to be deferred, the issue tracker is the deferral mechanism. A reference to a tracker ticket inside a [sub-block 6.2](#62--comment-only-the-non-obvious-why) _why_ comment is fine — it is the marker word at the start of a comment that the rule rejects, not the act of cross-referencing.

### 6.5 — Every `eslint-disable*` directive carries a description

A bare `// eslint-disable-next-line foo` hides a violation without explaining why the violation is acceptable here. The trailing `-- reason` is the difference between a justified suppression and a covered-up bug.

#### Rule: `@eslint-community/eslint-comments/require-description` with narrow `ignore`

**Why.** Lint suppressions are the only mechanism that legitimately prevents the linter from doing its job, so the burden of proof sits on the person disabling the rule. Forcing a `-- reason` next to every `disable*` directive turns the suppression into a documented exception rather than an invisible escape hatch — reviewers can audit each one in isolation, and `git blame` always points to a justification, not a guess. The narrow `ignore` (`eslint-enable`, `eslint`, `global`, `globals`, `exported`) limits the requirement to the directives that actually carry bug-hiding risk: re-enables just invert an already-justified disable, and config or global directives are intentional file-level setup that the surrounding context already explains.

**✓ Example.**

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- third-party callback typed as `any` upstream; widening here only to satisfy the contract.
processWebhook((event: any) => handle(event))
```

**✗ Example.**

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
processWebhook((event: any) => handle(event))
```

**Exceptions.** _None._ When a suppression genuinely has no justification, the right move is to fix the underlying violation rather than disable the rule. The `-- reason` text is the artifact that proves the suppression was a deliberate trade-off.

## Cat 7 — Testing

This category sets the universal testing conventions every consumer inherits — folder layout (sub-block 7.1), file suffixes (7.2), how to lay out a single test (7.3–7.4), where shared data lives (7.5), test independence (7.6), the role coverage plays (7.7), and the mock policy (7.8). These conventions hold regardless of which runner a project picks. The runner choice itself (`vitest`, `jest`, etc.) — and any runner-specific lint plugin a project pulls in to enforce them — is wired per project.

### Required dependencies

_None at the baseline level._ The runner (`vitest`, `jest`, etc.) and its eslint plugin are wired per project. The conventions in this Cat are runner-agnostic on purpose so they survive a future swap.

### 7.1 — Test files live under `tests/`, never co-located with source

A separate `tests/` tree keeps the production bundle clean — the runner globs `tests/**`, the build globs `src/**`, and there is no edge case where a test sneaks into a published artifact. Inside `tests/`, the suite type is encoded in the folder so a reviewer sees "this is integration" in the path, not in a tag inside the file.

#### Convention: `tests/unit/`, `tests/integration/`, `tests/e2e/` — never alongside source

**Why.** Three benefits compound: (a) the published bundle is provably free of test code without a per-file `exclude`; (b) the folder name itself classifies the test, so a stack trace on CI tells the reviewer the suite type before they open the file; (c) shared fixtures and factories ([sub-block 7.5](#75--shared-test-data-lives-in-testsfixtures-and-testsfactories)) sit one level up from the three suites, so they can be reused without circular reach across `src/` ↔ `tests/`.

**✓ Example structure.**

```
src/
  order.ts
  payment.ts
tests/
  unit/
    order.test.ts
    payment.test.ts
  integration/
    checkout.test.ts
  e2e/
    purchase-flow.e2e.ts
```

**✗ Example structure.**

```
src/
  order.ts
  order.test.ts
  payment.ts
  payment.test.ts
```

**Exceptions.** _None._ Co-location is a 2010s React-era reflex; every modern runner discovers tests by glob, so the cost of separating them is zero.

### 7.2 — Suffixes: `.test.ts` for unit/integration, `.e2e.ts` for end-to-end

Two suffixes are enough: the folder distinguishes unit from integration (so they can share `.test.ts`), but end-to-end deserves its own suffix because it often runs through a different runner entirely (Playwright, smoke harness, browser driver) and the unit runner must not pick it up.

#### Convention: `*.test.ts` everywhere except e2e, which uses `*.e2e.ts`

**Why.** A single `.test.ts` suffix for unit and integration matches the runner's `include` glob without forcing a third pattern; the folder ([sub-block 7.1](#71--test-files-live-under-tests-never-co-located-with-source)) already disambiguates them. `.e2e.ts` is intentionally distinct so a separate command (`pnpm test:e2e`) can target it without listing folders, and so the unit runner does not accidentally pick up a Playwright spec and try to execute it as a vitest test.

**✓ Example.**

```
tests/unit/order.test.ts            // unit
tests/integration/checkout.test.ts  // integration
tests/e2e/purchase-flow.e2e.ts      // e2e
```

**✗ Example.**

```
tests/unit/order.spec.ts            // mixed suffix
tests/integration/checkout.test.ts
tests/e2e/purchase-flow.test.ts     // e2e indistinguishable from unit
```

**Exceptions.** _None._ Consumer repos that need a third suffix (e.g., `.bench.ts` for benchmark suites) add it on top of the baseline without repurposing these two.

### 7.3 — Make AAA visible only when it helps reading

AAA (arrange / act / assert) is a model for writing a test, not a comment template. A 4-line test with one obvious setup line, one call, and one expectation does not need three labels — they are more visual noise than the test itself. A 30-line test with multi-step setup and layered assertions does benefit from labels, because the reader otherwise loses track of which line is which phase.

#### Convention: comment `// arrange` / `// act` / `// assert` only when the boundaries are not obvious from the structure

**Why.** Labels that restate what the next line obviously is fall under the same problem as [sub-block 6.1](#61--default-zero-comments) — they pad the test without adding signal, and they desensitize the reader to labels that _would_ have meant something. Reserving the labels for tests where the phases genuinely blur (long arrange, multi-step act, layered assertions) keeps them informative.

**✓ Example (small test — no labels needed).**

```ts
it('rejects orders with no items', () => {
  const order = makeOrder({ items: [] })
  expect(() => checkout(order)).toThrow(EmptyOrderError)
})
```

**✓ Example (large test — labels earn their place).**

```ts
it('refunds shipping when the order is cancelled within the window', async () => {
  // arrange
  const order = await orderFactory.create({
    shippingFee: 12,
    paidAt: hoursAgo(2),
  })
  const refundClient = mockRefundClient({
    shippingPolicy: 'refundable-within-24h',
  })

  // act
  const result = await cancelOrder({ orderId: order.id, refundClient })

  // assert
  expect(result.refundedAmount).toBe(order.total)
  expect(refundClient.refunds).toHaveLength(1)
  expect(refundClient.refunds[0]?.includesShipping).toBe(true)
})
```

**✗ Example.**

```ts
it('returns false for empty input', () => {
  // arrange
  const input = ''
  // act
  const result = isValidEmail(input)
  // assert
  expect(result).toBe(false)
})
```

**Exceptions.** _None._ When in doubt, omit the labels — the cost of a missing label is one extra second of reading; the cost of an unnecessary label is the desensitization that makes a future reader skip past a label that _would_ have been useful.

### 7.4 — Test names read like a sentence

A test name is the message the runner prints when it fails. If the name says `test1` or `works correctly`, the failure tells the reader nothing about what broke; if it says `rejects orders with no items`, the failure pinpoints the contract that just regressed.

#### Convention: `describe` names the unit under test; `it`/`test` names a single behavior

**Why.** The pair `describe('OrderService') > it('rejects orders with no items')` reads as a complete English sentence at the failure site, which is the only context a CI log offers. A flat, opaque name forces the reader to open the file to discover what failed. Making the sentence the primary artifact also discourages tests that assert two unrelated behaviors at once — the moment the name needs an "and", the test needs to split.

**✓ Example.**

```ts
describe('OrderService', () => {
  it('rejects orders with no items', () => {
    /* … */
  })
  it('applies the discount before tax', () => {
    /* … */
  })
  it('preserves the original total when no discount applies', () => {
    /* … */
  })
})
```

**✗ Example.**

```ts
describe('order tests', () => {
  it('test1', () => {
    /* … */
  })
  it('works', () => {
    /* … */
  })
  it('checkout and refund', () => {
    /* … */
  }) // two behaviors in one test
})
```

**Exceptions.** _None._ Snake-case names (`it('rejects_orders_with_no_items')`) are equivalent — the requirement is that the name be a readable sentence, not a particular casing.

### 7.5 — Shared test data lives in `tests/fixtures/` and `tests/factories/`

Inline test data duplicates across files and drifts apart silently — five tests build "a customer with two orders" five different ways, and a sixth reader cannot tell which version is canonical. Centralizing them once turns the "what does a valid X look like" question into a single source of truth.

#### Convention: static fixtures under `tests/fixtures/`, programmatic builders under `tests/factories/`

**Why.** The two folders distinguish the two flavors of shared data: a _fixture_ is a frozen artifact (a sample webhook payload, a recorded API response, a known-good JSON document) that needs to stay byte-stable; a _factory_ is a function that builds an object with sensible defaults and per-test overrides (`orderFactory.build({ total: 99 })`). Mixing them — putting a function inside `fixtures/` or a JSON blob inside `factories/` — loses the affordance: a reader reaching for `fixtures/stripe-webhook-payment.json` expects a frozen sample, and a reader reaching for `factories/order.ts` expects a builder.

**✓ Example structure.**

```
tests/
  fixtures/
    stripe-webhook-payment.json
    sample-pdf.bin
  factories/
    order.ts
    customer.ts
  unit/
    order.test.ts          // imports orderFactory from '../factories/order'
```

**✗ Example structure.**

```
tests/
  unit/
    order.test.ts          // inlines a 40-line `makeOrder` helper at the top of the file
    payment.test.ts        // copies most of `makeOrder` and renames it `buildOrder`
```

**Exceptions.** _None._ A helper used by exactly one test file can stay inline; the moment a second file needs the same shape, it moves into `factories/`.

### 7.6 — Tests are independent — no implicit ordering

Order-dependent tests are a class of bug that surfaces only when the test list is shuffled, sharded across CI workers, or run in isolation by a developer narrowing down a failure. A suite that passes only in declaration order is a suite that lies about which test broke.

#### Convention: every test sets up its own state and tears it down; no `it` reads from another `it`

**Why.** Test isolation is the property that makes failures bisectable. When test 5 fails, the reader needs to be able to re-run test 5 alone and reproduce the failure — which is impossible if test 5 secretly depends on test 3 having mutated a shared global. Runners like vitest and jest provide `beforeEach`/`afterEach` hooks for the cleanup; the convention is to _use_ them, not to chain state through module-level `let` bindings.

**✓ Example.**

```ts
describe('OrderRepo', () => {
  beforeEach(async () => {
    await db.truncate('orders')
  })

  it('inserts an order', async () => {
    await repo.insert(makeOrder({ id: 'a' }))
    expect(await repo.count()).toBe(1)
  })

  it('counts zero on an empty table', async () => {
    expect(await repo.count()).toBe(0)
  })
})
```

**✗ Example.**

```ts
describe('OrderRepo', () => {
  it('inserts an order', async () => {
    await repo.insert(makeOrder({ id: 'a' }))
    expect(await repo.count()).toBe(1)
  })

  it('counts the previous insert', async () => {
    // depends on the test above having run first and not having torn down
    expect(await repo.count()).toBe(1)
  })
})
```

**Exceptions.** _None._ Consumer repos may add runner-specific lint rules on top of the baseline (e.g., `vitest/no-focused-tests`, `vitest/no-disabled-tests`) to keep `.only` and `.skip` out of the suite, since those are the most common ways isolation gets accidentally violated in CI.

### 7.7 — Coverage is a diagnostic, never a CI gate

Coverage tells you which lines the suite touched. It does not tell you whether the touch was meaningful — a getter can be 100% covered by a single import without a single assertion against it. Wiring a coverage threshold into CI rewards adding tests for whichever line the report singles out, which is rarely the line that needed a test.

#### Convention: generate coverage locally to find blind spots; do not set a threshold in CI

**Why.** Coverage gates create the wrong incentive: a developer chasing the threshold writes whichever tests are easiest to add (constructor exercises, getter calls, dead-code probes) instead of the tests that matter (branching error paths, race conditions, integration boundaries). The real gate is review of test _quality_ — a reviewer asks "does this test express the contract?" rather than "does this test bump the percentage?". Coverage as a local report still earns its keep: it surfaces files the suite never touches at all, which is a different signal than "this file is 70% covered".

**✓ Example (vitest config snippet).**

```ts
test: {
  coverage: {
    enabled: true,
    reporter: ['text', 'html'],
    // no `thresholds` field on purpose — see sub-block 7.7
  },
}
```

**✗ Example.**

```ts
test: {
  coverage: {
    enabled: true,
    thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
  },
}
```

**Exceptions.** _None._ Projects with a regulatory coverage requirement (rare) document the threshold in their own runner config with the regulation cited; otherwise the no-threshold default holds.

### 7.8 — Mock policy: never the database, only external boundaries

Mocking the database is the most common way to ship tests that pass in CI and break in production: the mock returns whatever the test author imagined the SQL would return, the real query disagrees, and the bug only shows up after deploy. The same logic applies inverted at external boundaries: a paid third-party API is too costly to call in CI, so a faithful mock is the right trade.

#### Convention: real database (consumer repos wire the runner — e.g., testcontainers in a Node API); mock only paid or remote-only third-party boundaries

**Why.** A mocked database guarantees the test exercises the _idea_ of the query, not the query itself — the schema migration that nobody ran, the JSONB cast that silently fails, the index missing that the query planner now scans sequentially: none of these surface against a mock. Real database tests cost a few hundred milliseconds of startup per file and remove the entire class of mock-vs-prod divergence. For external services that are remote-only or paid (Stripe API, SendGrid, OpenAI), the trade reverses: the round-trip is too expensive and too flaky to run on every PR, so a faithful mock at the HTTP boundary is the right tool. Internal modules are never mocked — if a module is hard to test without mocks, the answer is to refactor the module, not to mock around it.

**✓ Example (real DB, mocked external).**

```ts
it('charges the customer and persists the order', async () => {
  const stripe = mockStripeClient({ chargeId: 'ch_123' })
  const result = await checkout({ orderId: order.id, stripe }) // uses the real db
  expect(result.chargeId).toBe('ch_123')
  expect(await repo.findById(order.id)).toMatchObject({ status: 'paid' })
})
```

**✗ Example (mocked DB).**

```ts
it('persists the order', async () => {
  const fakeRepo = { findById: vi.fn().mockResolvedValue({ status: 'paid' }) }
  const result = await checkout({ orderId: order.id, repo: fakeRepo })
  expect(fakeRepo.findById).toHaveBeenCalled() // green even if the real query is broken
})
```

**Exceptions.** _None._ When a test genuinely needs to isolate one module under test from another internal module, the answer is dependency injection (pass the dependency in) rather than `vi.mock()` — the test then exercises the real module at the boundary that matters.

## Notes

- Cross-references to specific principles use the form [Principle N — title](./principles.md).
- The ESLint config that enforces these Cats lives in [`config/eslint.config.ts`](../config/eslint.config.ts); the compiler flags live in [`config/tsconfig.json`](../config/tsconfig.json).

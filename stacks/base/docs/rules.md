---
title: Base — rules
stack: base
last-reviewed: 2026-05-11
---

<!-- Based on docs/_templates/rules.md -->

# Base stack — rules

> Catalog of enforceable rules for the `base` stack. Built progressively, one category per issue. See [`docs/principles.md`](../../../docs/principles.md) for the why behind every rule and [`stacks/base/config/`](../config) for the tools that enforce them.

## Cat 1 — TypeScript / Type system

### Required dependencies

| Package | Min version | Role in this Cat |
|---|---|---|
| `typescript` | `^5.0.0` | Compiler that enforces the flags in sub-block 1.1. |
| `typescript-eslint` | `^8.0.0` | Provides the rules in sub-blocks 1.2 – 1.5. |

### 1.1 — Compiler flags

The compiler is the first line of defense. Every flag below is non-negotiable: each closes a class of bug that no lint rule can catch as cheaply.

#### Rule: enable the strict-by-default compiler flags

**Why.** TypeScript without `strict: true` is a different language with a different set of guarantees. The flags beyond `strict` close gaps `strict` itself leaves open — index access, optional vs `undefined`, switch fallthrough, dead code. Enabling them later is exponentially more expensive than enabling them now.

The full set, configured in [`stacks/base/config/tsconfig.json`](../config/tsconfig.json):

| Flag | What it adds beyond `strict` |
|---|---|
| `strict` | Enables `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `alwaysStrict`. |
| `noUncheckedIndexedAccess` | Treats `arr[i]` and `obj[key]` as `T \| undefined`. Forces narrowing before use. |
| `exactOptionalPropertyTypes` | Distinguishes "property absent" from "property set to `undefined`". Critical for API contracts. |
| `noImplicitOverride` | Requires the `override` keyword when subclassing — catches stale overrides after a base-class rename. |
| `noImplicitReturns` | Every code path in a function must return (or none). Catches missing branches. |
| `noFallthroughCasesInSwitch` | Forces `break` / `return` / `throw` between non-empty cases. |
| `noUnusedLocals` | Errors on unused local bindings. |
| `noUnusedParameters` | Errors on unused parameters (prefix with `_` to opt out). |
| `noPropertyAccessFromIndexSignature` | Requires `obj['unknownKey']` instead of `obj.unknownKey` when the key is not declared on the type. Surfaces typos. |
| `isolatedModules` | Each file must be transpilable in isolation — required by `tsc --build`, esbuild, swc, and Vite. |
| `verbatimModuleSyntax` | Imports/exports are emitted exactly as written. Forces `import type` for type-only imports. |
| `skipLibCheck` | Skips type-checking of declaration files in `node_modules`. Speeds up `tsc` significantly with no real loss — third-party types fail at consumption sites anyway. |

**Exceptions.** _None._ A project that needs to relax any of these flags has a deeper problem (legacy migration, generated code) and should isolate the relaxation in a separate `tsconfig.<scope>.json`, not weaken the base.

### 1.2 — Disallow `any`

`any` opts out of every guarantee TypeScript provides at the exact place a bug is most likely to live. The base stack bans `any` in every form — direct annotation, cross-boundary leakage, and silent inference from untyped libraries.

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

**Exceptions.** _None_ for first-party code. Third-party types that are demonstrably wrong may be widened or narrowed via a localized `as` plus a comment pointing at the upstream issue (see [Principle 1 — Type safety is non-negotiable](../../../docs/principles.md)).

#### Rule: no implicit `any` from unsafe operations

**Why.** Even with `no-explicit-any` on, `any` still creeps in: `JSON.parse`, untyped libraries, `Function` parameters, dynamic property access. The `no-unsafe-*` family closes those routes one by one.

| Rule | What it catches |
|---|---|
| `no-unsafe-argument` | Passing `any` as an argument to a typed function. |
| `no-unsafe-assignment` | Assigning `any` to a typed binding. |
| `no-unsafe-call` | Calling a value typed as `any`. |
| `no-unsafe-member-access` | Reading a property off `any`. |
| `no-unsafe-return` | Returning `any` from a function with a non-`any` return type. |

**Exceptions.** _None._ Use `unknown` and narrow.

### 1.3 — Assertions and escape hatches

Type assertions and `@ts-*` comments turn the compiler off. They are sometimes necessary, but the base stack forces them to leave a written trail.

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

Generic type parameters in this stack always start with `T`. The convention matches TanStack and most modern TypeScript libraries, and makes type parameters visually distinguishable from concrete types at the point of use.

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

The two are nearly equivalent for object shapes — but only one is allowed per stack to avoid bikeshedding in review.

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

### Required dependencies

| Package | Min version | Role in this Cat |
|---|---|---|
| `eslint-plugin-unicorn` | `^56.0.0` | Provides `filename-case` (sub-block 2.4) and `prevent-abbreviations` (sub-block 2.1). |

The `@typescript-eslint/naming-convention` rule from sub-blocks 2.1–2.3 is provided by `typescript-eslint` (already required by Cat 1).

### 2.1 — Case per element

Three cases, applied consistently per element kind. The compiler does not police identifier shape — `naming-convention` does, and the policy is uniform across the stack so reviews never argue about it.

#### Rule: variables, functions, and parameters are camelCase

**Why.** Mixed casing inside a file makes it hard to scan; a single default for runtime values keeps the eye moving. PascalCase is reserved for compile-time names (types) so the two zones are visually separable at a glance.

**✓ Example.**

```ts
const userCount = 42
function fetchUser(userId: string) { /* … */ }
```

**✗ Example.**

```ts
const UserCount = 42
function FetchUser(user_id: string) { /* … */ }
```

**Exceptions.** Imported bindings keep their source name (e.g., `import React from 'react'` is allowed). A leading underscore is permitted to mark a deliberately unused binding (`_unused`).

#### Rule: types, classes, interfaces, and enums are PascalCase

**Why.** These names exist only at compile time; PascalCase makes that obvious next to camelCase runtime values. Type and class names also tend to map to nouns (`User`, `OrderRepository`), which read better in PascalCase.

**✓ Example.**

```ts
type User = { id: string }
class OrderRepository { /* … */ }
enum OrderStatus { Pending, Shipped }
```

**✗ Example.**

```ts
type user = { id: string }
class orderRepository { /* … */ }
```

#### Rule: global `const` may be `UPPER_CASE` only when bound to an external, immutable value

**Why.** `UPPER_CASE` is a strong visual signal — it should mean "this value is set outside the program and never changes" (an environment variable, a protocol constant, a magic number from a spec). Using it for ordinary tunables drains the signal: every reader has to ask "is this actually external?"

**✓ Example.**

```ts
const MAX_RETRY_COUNT = 5         // protocol-level cap, written once, read everywhere
const DATABASE_URL = process.env.DATABASE_URL ?? ''   // external, immutable

const defaultPageSize = 20        // tunable, app-internal — camelCase
const cacheTtlMs = 30_000         // ditto
```

**✗ Example.**

```ts
const DEFAULT_PAGE_SIZE = 20      // app-level config, not external — should be camelCase
const FETCH_USER_URL = '/api/u'   // app-level route, not external
```

**Exceptions.** _None enforceable by lint._ The lint rule accepts both `camelCase` and `UPPER_CASE` for global `const`; the choice between them is a code-review judgment that follows the principle above.

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
const authenticated = checkSession()  // is it bool, status string, or session object?
const permission = role === 'admin'   // same question
```

**Exceptions.** _None._ Other tense prefixes (`will`, `did`, `was`) are not in the allowlist; if the meaning truly is past or future, restructure as a noun (`lastLoginAt`, `nextRunAt`).

#### Rule: functions are imperative verbs; arrays are plural

**Why.** `fetchUser` says what calling the function will do; `userFetcher` says what _kind of thing_ the function is, which is rarely the question at the call site. Plural array names (`users` vs `user`) prevent the off-by-one read where `user[0]` is mistaken for the only user.

**✓ Example.**

```ts
function fetchUser(id: string): Promise<User> { /* … */ }
const users: User[] = await fetchAllUsers()
```

**✗ Example.**

```ts
function userFetcher(id: string): Promise<User> { /* … */ }
const user: User[] = await fetchAllUsers()  // plural collection, singular name
```

**Exceptions.** _Not lint-enforced._ This is reviewer guidance — the false-positive rate of a verb-detector lint rule is too high to be worth running.

### 2.3 — Generic type parameters

The rule lives in [Cat 1.4 — Generic type parameters](#14--generic-type-parameters); this sub-block is preserved for parity with the issue numbering. Type parameters are PascalCase with the `T` prefix (`T`, `TKey`, `TValue`).

### 2.4 — File names

A predictable filename shape matters more than which shape is picked, but a stack still has to pick one. The base stack picks kebab-case for portability (no case-sensitivity surprises across macOS / Linux / Windows) and matches the dominant convention in the Node ecosystem.

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

**Exceptions.** Stacks built on top of `base` may legitimately need different cases for framework reasons (e.g., `app/[id]/page.tsx`, file-router conventions). When that happens, the downstream stack overrides this rule in its own ESLint block; the base rule remains kebab-case.

#### Rule: one concept per file

**Why.** A file named `user-service.ts` should export the user service and nothing else (helpers it uses internally are private, not co-exports). Files that bundle unrelated exports force the reader to scan the whole file to find the binding they came for, and they make the import line at the call site lie about its dependency.

**Exceptions.** _Not lint-enforced._ The judgment is reviewer-side: tightly coupled types alongside the value they describe (`type User` next to `function isUser`) are fine; unrelated utilities crammed together are not.

### 2.5 — No barrel files

A barrel file (`index.ts` that re-exports from siblings) trades a tiny ergonomic gain for two real costs: it defeats tree-shaking (bundlers walk the whole barrel before deciding what to drop) and it creates subtle import cycles that are hard to debug.

#### Rule: `export *` is forbidden

**Why.** `export * from './x'` is the construct that turns `index.ts` into a barrel. Banning the construct is more precise than banning the filename — it allows `index.ts` to exist as a real module (containing actual code) while ruling out the re-export-only pattern. The fix at the call site is one extra path segment: `import { foo } from './module/foo'` instead of `import { foo } from './module'`.

**✓ Example.**

```ts
// in user-service.ts
export function fetchUser(id: string) { /* … */ }
export function deleteUser(id: string) { /* … */ }

// at the call site
import { fetchUser } from './users/user-service'
```

**✗ Example.**

```ts
// in users/index.ts
export * from './user-service'
export * from './user-repository'

// at the call site
import { fetchUser } from './users'   // bundler can't drop the unused exports
```

**Exceptions.** _None_ for first-party code. Re-exporting from a third-party namespace package (`export * from 'some-lib'`) is also banned — list the symbols explicitly.

## Notes

- Cross-references to specific principles use the form [Principle N — title](../../../docs/principles.md).
- The ESLint config that enforces these Cats lives in [`stacks/base/config/eslint.config.ts`](../config/eslint.config.ts); the compiler flags live in [`stacks/base/config/tsconfig.json`](../config/tsconfig.json).
- Future Cats (3 — Imports/Exports, 4 — Errors & Async, 5 — Functions, 6 — Comments, 7 — Testing) will append sections below this one.

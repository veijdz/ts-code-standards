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

**Exceptions.** _None_ for first-party code. Third-party types that are demonstrably wrong may be widened or narrowed via a localized `as` plus a comment pointing at the upstream issue (see Principle 1).

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

## Notes

- Cross-references to specific principles use the form [Principle N — title](../../../docs/principles.md).
- The ESLint config that enforces this Cat lives in [`stacks/base/config/eslint.config.ts`](../config/eslint.config.ts); the compiler flags live in [`stacks/base/config/tsconfig.json`](../config/tsconfig.json).
- Future Cats (2 — Naming, 3 — Imports/Exports, 4 — Errors & Async, 5 — Functions, 6 — Comments, 7 — Testing) will append sections below this one.

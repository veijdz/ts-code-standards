---
title: <Doc title — e.g., "Rules">
last-reviewed: YYYY-MM-DD
---

<!-- Based on docs/_templates/rules.md -->

# <Doc title — e.g., "Rules">

> Use this template for `docs/rules.md`. The file is single — one `docs/rules.md` per repo — built progressively with one `## Cat N — <Topic>` section per category. Numbering is stable; do not renumber when adding.

## Cat <N> — <Topic>

<One paragraph framing what the category covers and how its sub-blocks relate. Reference adjacent Cats inline when relevant.>

### Required dependencies

The consumer must install these to apply the rules below. Versions are the **minimum supported**; newer compatible majors should keep working unless noted.

| Package               | Min version | Role in this Cat                                                                                     |
| --------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `<plugin-or-runtime>` | `^X.Y.Z`    | <what it provides — e.g., "ESLint plugin enforcing rule X", "Test runner used by rules in this Cat"> |
| `<another-package>`   | `^X.Y.Z`    | <role>                                                                                               |

> If a Cat has no extra deps beyond the baseline, write: `_None at the baseline level._` and explain where the relevant tooling is wired (per project, etc.).

### <N.M> — <Sub-block title>

<One paragraph framing the sub-block. Prose, not bullets.>

#### Rule: <short imperative phrase — e.g., "Disallow `any`">

**Why.** <One paragraph. State the underlying principle or risk this guards against. Avoid restating the rule.>

**✓ Example.**

```ts
// good
function parse(input: unknown): User {
  if (!isUser(input)) throw new Error('invalid user')
  return input
}
```

**✗ Example.**

```ts
// bad
function parse(input: any): User {
  return input
}
```

**Exceptions.** <When (if ever) the rule may be relaxed, and what to use instead. Write `_None._` if there are no legitimate exceptions.>

---

#### Rule: <next rule, same anatomy>

…

### <N.M+1> — <Next sub-block title>

…

## Notes

- Cross-references to principles use the form [Principle N — title](./principles.md) (path is relative to `docs/rules.md`, where this template gets cloned to).
- Cross-references to sub-blocks within the same file use the heading anchor (e.g., `[sub-block 7.1](#71--test-files-live-under-tests-never-co-located-with-source)`).
- `Rule:` and `Convention:` are interchangeable headings depending on whether the item is tool-enforceable; the inner anatomy (**Why** / **✓ Example** / **✗ Example** / **Exceptions**) is identical.
- A worked example of one populated Cat section lives in [`docs/_templates/example-rules.md`](./example-rules.md).

---
title: <Stack> rules
stack: <base | node | nestjs | expo | tanstack-start>
category: <Cat N — Topic>
last-reviewed: YYYY-MM-DD
---

# <Stack> — <Cat N — Topic>

> Use this template for every `stacks/<stack>/docs/rules.md` section. One file per stack, with N sections (one per Cat).

## Required dependencies

The consumer must install these to apply the rules below. Versions are the **minimum supported**; newer compatible majors should keep working unless noted.

| Package               | Min version | Role in this Cat                                                                                     |
| --------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `<plugin-or-runtime>` | `^X.Y.Z`    | <what it provides — e.g., "ESLint plugin enforcing rule X", "Test runner used by rules in this Cat"> |
| `<another-package>`   | `^X.Y.Z`    | <role>                                                                                               |

> If a Cat has no extra deps beyond the stack baseline, write: `_No additional dependencies beyond the stack baseline._`

## Sub-blocks

Group rules into sub-blocks that share a theme. Each sub-block has a short intro and a list of rules. Each **rule** follows the 5-block anatomy below.

### <Sub-block name — e.g., "Type system">

<One sentence framing the sub-block.>

#### Rule: <short imperative phrase, e.g., "Disallow `any`">

**Why.** <One paragraph. State the underlying principle or risk this guards against. Avoid restating the rule.>

**✓ Example.**

```ts
// good
function parse(input: unknown): User {
  // narrow with a type guard
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

**Exceptions.** <When (if ever) the rule may be relaxed, and what to use instead — e.g., `@ts-expect-error` with a description, narrowed `unknown`, etc. Write `_None._` if there are no legitimate exceptions.>

---

#### Rule: <next rule, same anatomy>

…

## Notes

- Reference the canonical template at `docs/_templates/rules.md` immediately after the frontmatter (HTML comment is fine).
- Keep the section order stable across stacks so consumers can diff easily.

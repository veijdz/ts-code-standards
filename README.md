# ts-code-standards

Documentation and copyable templates to standardize Node/TypeScript projects.

This is **not** an npm package — consumers copy the templates via `npx degit` and own their own dependencies.

## How to use

Copy the desired stack's config straight into your project:

```bash
# base stack (plain TypeScript)
npx degit veijdz/ts-code-standards/stacks/base/config .standards
```

Then install the dev dependencies listed in each stack's `README.md` and point your project's configs at `.standards/*` (or copy them to the root — your call).

## Stacks

| Stack | Extends | Status |
|---|---|---|
| [`base`](stacks/base/) | — | under construction (M1) |
| `node` | `base` | M2 |
| `nestjs` | `node` | M3 |
| `expo` | `base` | M4 |
| `tanstack-start` | `base` | M5 |

## Documentation

- [Foundational principles](docs/principles.md) — lands in VEI-411
- [Conventions](docs/conventions/) — dependencies, git, testing, GitHub
- [ADRs](docs/adr/) — architectural decision records
- [Documentation templates](docs/_templates/) — canonical anatomy for each doc

> Several links above point to files that do not exist yet. See [the Linear roadmap](https://linear.app/veijdz/project/ts-code-standards-65dfe8d58d48) for progress.

## For AI agents

Read [`CLAUDE.md`](CLAUDE.md) before contributing.

## License

[MIT](LICENSE).

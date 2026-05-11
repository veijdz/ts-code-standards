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

## Staying up to date

Templates are not versioned — once copied, they belong to your repo. To find out when something changes:

- **Watch this repo** with "Releases only" — notable and breaking changes are cut as [GitHub Releases](https://github.com/veijdz/ts-code-standards/releases).
- Or subscribe to the [Atom feed](https://github.com/veijdz/ts-code-standards/releases.atom).
- Or audit explicitly: `git log -- stacks/<stack>/` against your last `degit` date.

Breaking changes use a `YYYY-MM-DD-BREAKING-<stack>` tag and list the migration steps in the release body. See [ADR 0002 — Release policy](docs/adr/0002-release-policy.md) for the full rationale.

## Stacks

| Stack                  | Extends | Status                  |
| ---------------------- | ------- | ----------------------- |
| [`base`](stacks/base/) | —       | under construction (M1) |
| `node`                 | `base`  | M2                      |
| `nestjs`               | `node`  | M3                      |
| `expo`                 | `base`  | M4                      |
| `tanstack-start`       | `base`  | M5                      |

## Documentation

- [Foundational principles](docs/principles.md) — the eleven foundations every rule, convention, and ADR derives from
- Conventions — [dependencies](docs/conventions/dependencies.md), [git](docs/conventions/git.md), [testing](docs/conventions/testing.md), GitHub
- [ADRs](docs/adr/) — architectural decision records
- [Documentation templates](docs/_templates/) — canonical anatomy for [rules](docs/_templates/rules.md), [ADRs](docs/_templates/adr.md), [conventions](docs/_templates/convention.md), and [principles](docs/_templates/principles.md), plus a [filled rules example](docs/_templates/example-rules.md)

Every doc under `docs/` and `stacks/*/docs/` is built from one of those templates. New docs must reference the template they extend immediately after the frontmatter.

> The `base` stack's `rules.md` and the GitHub-settings convention are still landing; stacks beyond `base` have not started. See the [Stacks table](#stacks) above for per-stack status.

## For AI agents

Read [`CLAUDE.md`](CLAUDE.md) before contributing.

## License

[MIT](LICENSE).

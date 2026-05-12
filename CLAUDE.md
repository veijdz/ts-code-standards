# CLAUDE.md

Guidance for AI agents working on this repository.

## What this repo is

`ts-code-standards` is a repository of **documentation + copyable templates** to standardize Node/TypeScript projects. It is **not** an npm package. Consumers copy the templates via `npx degit` and own their own dependencies.

## Layout

```
.
├── docs/
│   ├── _templates/        # canonical anatomy for each doc in the repo
│   ├── adr/               # numbered architectural decision records
│   ├── conventions/       # deps, git, testing, github
│   └── principles.md      # foundational principles
└── stacks/
    └── base/
        ├── config/        # tsconfig, eslint, prettier, lefthook, commitlint, knip
        └── docs/
            └── rules.md   # base stack rules (built progressively, one file per category)
```

Future stacks: `node` (extends `base`), `nestjs` (extends `node`), `expo` and `tanstack-start` (both extend `base`).

## Decisions already made

- **Package manager:** `pnpm` (see `packageManager` in `package.json`)
- **Node:** 22 LTS, ESM-first
- **Conventional Commits 1.0** required
- **Squash merge** as the GitHub default
- **No `Co-Authored-By`** in commits or PRs (including any AI attribution)
- **No "Generated with Claude Code"** footer (or similar) anywhere

## Execution rules for agents

- **Before starting any issue:** read the description and acceptance criteria of the issue in full — they are the contract.
- **One issue = one PR.** Do not mix scope.
- **Branch:** `<type>/<short-slug>`, where `<type>` matches the Conventional Commits type enum and `<short-slug>` is kebab-case (e.g., `docs/typescript-rules`, `chore/ci-min`, `feat/auth-magic-link`). Do not embed ticket IDs in the branch name.
- **Branch base:** `staging` (not `main`). PRs also target `staging`.
- **Commits:** Conventional Commits, lowercase subject, header ≤72 chars. No ticket references in commit subjects.
- **PR body:** `## Summary` + `## Test plan`. No AI attribution footer.
- **Respect dependencies:** do not start an issue while its prerequisites are still open.
- **Repo language:** all committed content (docs, code, comments, commit messages, PRs) is written in English.

## Where to find things

- **Foundational principles:** `docs/principles.md`
- **Conventions:** `docs/conventions/{deps,git,testing,github-settings}.md`
- **ADRs:** `docs/adr/NNNN-<slug>.md`
- **Base stack rules:** `stacks/base/docs/rules.md` (built progressively, one file per category)
- **Base stack copyable configs:** `stacks/base/config/`
- **Documentation templates:** `docs/_templates/`

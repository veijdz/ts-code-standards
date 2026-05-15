# CLAUDE.md

Guidance for AI agents working on this repository.

## What this repo is

`ts-code-standards` is a repository of **documentation + copyable templates** to standardize Node/TypeScript projects. It is **not** an npm package. Consumers copy the templates via `npx degit` and own their own dependencies.

## Terminology

Use these terms consistently in docs, ADRs, commit messages, and PR descriptions:

- **the baseline** — the product: the rules, conventions, principles, and configs this repo defines. Use this when referring to the abstract set of standards (e.g., "the baseline targets Node 22 LTS"). Do not use "the standards" or "these standards" as a synonym in prose; `ts-code-standards` is the repository name, not a count noun.
- **this repo** — the physical artifact at `github.com/veijdz/ts-code-standards`. Use only when literally referring to the repository as an entity (e.g., "this repo does not vendor framework rules").
- **templates** — the copyable anatomies under `docs/_templates/` (rules, ADR, convention, principles).
- **configs** — the copyable tooling under `config/` (tsconfig, eslint, prettier, lefthook, commitlint, knip).
- **consumer repo** — a project that adopts the baseline. Use this exact term; avoid "downstream", "adopting project", or "consumer of this baseline".

## Layout

```
.
├── config/                # tsconfig, eslint, prettier, lefthook, commitlint, knip
└── docs/
    ├── _templates/        # canonical anatomy for each doc in the repo
    ├── adr/               # numbered architectural decision records
    ├── conventions/       # dependencies, git, testing, github-settings
    ├── principles.md      # foundational principles
    └── rules.md           # rule categories enforced by the baseline (built progressively, one Cat per issue)
```

This repo ships a single, framework-agnostic baseline (TypeScript + Node 22 LTS). Consumers that need framework-specific opinions derive their own repo from this baseline and overlay rules on top — see [ADR 0004](docs/adr/0004-single-baseline.md).

## Decisions already made

- **Single-baseline scope** (TS + Node 22 LTS, framework-agnostic) — see [ADR 0004](docs/adr/0004-single-baseline.md)
- **Package manager:** `pnpm` (see `packageManager` in `package.json`)
- **Node:** 22 LTS, ESM-first
- **Conventional Commits 1.0** required
- **Merge commit** as the GitHub default (no squash, no rebase)

## Execution rules for agents

- **Before starting any issue:** read the description and acceptance criteria of the issue in full — they are the contract.
- **One issue = one PR.** Do not mix scope.
- **Branch:** `<type>/<short-slug>`, where `<type>` matches the Conventional Commits type enum and `<short-slug>` is kebab-case (e.g., `docs/typescript-rules`, `chore/ci-min`, `feat/auth-magic-link`). Do not embed ticket IDs in the branch name.
- **Branch base:** `staging` (not `main`). PRs also target `staging`.
- **Commits:** Conventional Commits, lowercase subject, header ≤72 chars. No ticket references in commit subjects.
- **PR body:** `## Summary` + `## Test plan`.
- **Respect dependencies:** do not start an issue while its prerequisites are still open.
- **Repo language:** all committed content (docs, code, comments, commit messages, PRs) is written in English.

## Where to find things

- **Foundational principles:** `docs/principles.md`
- **Conventions:** `docs/conventions/{dependencies,git,testing,github-settings}.md`
- **ADRs:** `docs/adr/NNNN-<slug>.md`
- **Rules:** `docs/rules.md` (built progressively, one Cat per issue)
- **Copyable configs:** `config/`
- **Documentation templates:** `docs/_templates/`

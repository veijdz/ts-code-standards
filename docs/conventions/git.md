---
title: Git
last-reviewed: 2026-05-10
---

<!-- Based on docs/_templates/convention.md -->

# Conventions — Git

> Commit format, branch naming, PR shape, and merge strategy. Derives from [Principle 10 — Git history is enforced, not aspirational](../principles.md). Tooling that enforces this convention (`commitlint.config.ts`, `lefthook.yml`) lives in `stacks/base/config/`.

## Scope

Applies to every commit, branch, and PR in this repo and in any project that adopts the `base` stack. Covers Conventional Commits format, the type enum, branch naming, and the merge strategy. Does **not** cover release tagging or changelog generation — those are handled in [ADR 0002 — Release policy](../adr/0002-release-policy.md).

## Rules

### Commit message format

- **Rule.** Every commit follows Conventional Commits 1.0: `<type>(<scope>): <subject>`.
  - **Why.** A parseable history feeds changelog automation and lets reviewers triage by intent at a glance. Free-form messages defeat both.
  - **How.** Enforced at the `commit-msg` hook via `commitlint`. A message that does not match is rejected before the commit is created.

- **Rule.** The `type` must be one of: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
  - **Why.** A closed list keeps the signal high. Anything outside this list is either a `chore` or a missing distinction worth proposing in a separate PR.
  - **How.** Configured in `commitlint.config.ts` (`type-enum` rule).

- **Rule.** The `scope` is optional, lowercase, and refers to a feature area or module — not a file path or ticket ID.
  - **Why.** Scopes are read alongside the subject in `git log`; long file paths are noise. Ticket IDs already live in the PR description.
  - **How.** Example: `feat(auth): support magic-link login`. Not `feat(src/auth/handler.ts):` and not `feat(<TICKET>-123):`.

### Subject line

- **Rule.** Imperative mood, lowercase first character, no trailing period, max 72 characters total header length.
  - **Why.** Imperative reads consistently in tools that prepend the message ("This commit will…"). 72 chars fits standard terminals and the GitHub UI without truncation.
  - **How.** Enforced via `commitlint` rules `subject-case`, `subject-empty`, `subject-full-stop`, and `header-max-length`.

- **Rule.** Describe the change, not the file. "fix off-by-one in pagination" is good; "update handler.ts" is not.
  - **Why.** The diff already shows the file; the subject explains the change.

### Commit body and footer

- **Rule.** The body is optional. When present, it explains _why_, never _what_; lines are hard-wrapped at 100 characters.
  - **Why.** Code shows the _what_; commit messages are one of the few places left to capture the reason behind a change.
  - **How.** Most commits in this repo have no body — the subject is enough. Reach for a body when the diff alone would not survive a six-month-later read.

- **Rule.** Breaking changes use the `BREAKING CHANGE:` footer (with the colon and uppercase exactly).
  - **Why.** Tooling looks for that literal token to drive major-version bumps and changelog flags.
  - **How.** Footer comes after a blank line. Example: `BREAKING CHANGE: removes the deprecated v1 endpoint`.

- **Rule.** Do not reference issue-tracker IDs from commit messages. References belong in the PR title or description.
  - **Why.** Commits are atomic and may be reorganized; issues are PR-level metadata. Mixing the two leaks one layer of context into another.

### Forbidden patterns

- **No** `Co-Authored-By` lines, ever.
- **No** AI attribution footers ("🤖 Generated with Claude Code", "Co-Authored-By: Claude…", or any variant).
- **No** WIP commits on a long-lived branch. WIP only on a private feature branch; clean up before opening the PR (interactive rebase, fixup commits) so the merge commit absorbs a coherent set.

### Branch naming

- **Rule.** Branches use the shape `<type>/<short-slug>`, where `<type>` matches one of the Conventional Commits types and `<short-slug>` is a lowercase, kebab-case description of the work.
  - **Why.** Aligning the branch name with the commit type makes intent visible from `git branch` alone, and keeping it tracker-agnostic means the convention works regardless of which issue tracker (or none) the project uses.
  - **How.** Examples: `docs/typescript-rules`, `chore/ci-min`, `feat/auth-magic-link`, `fix/pagination-off-by-one`. Do not embed ticket IDs in branch names — those belong in the PR.

- **Rule.** Branches are cut from `staging`, not `main`. PRs target `staging`.
  - **Why.** This repo uses a two-tier base — `staging` is the integration target, `main` is the release line. Cutting from `main` skips the integration step and breaks the release rhythm.

### PR conventions

- **Rule.** The PR title follows Conventional Commits and becomes the subject of the merge commit that lands the PR.
  - **Why.** The merge commit subject is the parseable record of "what this PR did" in `git log`. It must satisfy the same Conventional Commits format as a regular commit so changelog tooling and `--grep` can scan it.
  - **How.** Title example: `docs: add foundational principles`. If the project uses an issue tracker, an optional reference may be appended in parentheses (e.g., `docs: add foundational principles (#42)` or `(<TICKET>-123)`); the choice of where to place tracker references — title, body, or both — is the project's call. Tracker references must never appear in standalone commit subjects.

- **Rule.** The PR body has two sections: `## Summary` (bullets of what changed and why) and `## Test plan` (checklist of how the reviewer can verify).
  - **Why.** A reviewer should not have to read the diff to know what they are checking. The two sections answer "what" and "how do I trust it".
  - **How.** No AI attribution footer, no "Generated with…" lines.

### Merge strategy

- **Rule.** Merge commit is the default and only enabled option on GitHub. Squash and rebase merge are disabled.
  - **Why.** Preserves every PR's individual commits on both `staging` and `main`, so `git log` answers any audit window with full granularity. The merge commit itself is the explicit "this PR landed here" marker — `git log --first-parent` collapses to PR-and-release granularity when that's what you want. Cost: intra-PR noise (review-fix commits, lint adjustments) reaches `main`. Accepted because the merge-commit boundary makes them filterable and because `staging` and `main` stay history-identical, which removes a class of synchronization friction.
  - **How.** Repo settings disable squash and rebase merge. Merge commit subject = PR title; body = PR description. See [GitHub settings convention](github-settings.md).

- **Rule.** Auto-delete head branch is enabled.
  - **Why.** Stale merged branches accumulate noise in lists and tab completion.

## Rationale

- **Why 72 characters and not 50?** Fifty is the older Git convention from a 80-column terminal era. Modern terminals and the GitHub UI both display 72 cleanly; tighter limits force unnatural abbreviation in subject lines.
- **Why ban AI attribution footers?** The footer adds no information a reviewer can act on (you cannot ask the AI to fix a regression three months later), and it bloats every `git log` line in a way that is impossible to grep around.
- **Why merge commit and not squash?** Squash collapses every PR into a single commit on the target branch, which keeps `git log --oneline` clean but loses per-PR detail — and in a two-tier setup (`staging` → `main`), means `main` and `staging` diverge in history (with identical tree) after every release, requiring an explicit reset to reconcile. Merge commit preserves the PR's individual commits and keeps both branches history-identical; intra-PR noise is the price.
- **Why merge commit and not rebase?** Rebase replays each commit with a new SHA, breaking external references to commits inside the PR (PR comments, links). Merge commit preserves original SHAs and adds an explicit boundary commit where the PR landed, which `git log --first-parent` uses to collapse history to PR-level granularity on demand.

## Out of scope

- Tagging and release process — covered in [ADR 0002 — Release policy](../adr/0002-release-policy.md).
- GitHub repository-level settings (branch protection, required checks) — covered in [GitHub settings convention](github-settings.md).
- Stack-specific commit policy (e.g., monorepo scope rules) — would live in the stack's `rules.md`.

## References

- [Conventional Commits 1.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [`commitlint`](https://commitlint.js.org/)
- [Principle 10 — Git history is enforced, not aspirational](../principles.md)

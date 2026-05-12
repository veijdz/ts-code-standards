---
title: GitHub settings
last-reviewed: 2026-05-12
---

<!-- Based on docs/_templates/convention.md -->

# Conventions — GitHub settings

> GitHub-side enforcement of decisions made elsewhere: the merge policy from [Git conventions](git.md), the release flow from [ADR 0002 — Release policy](../adr/0002-release-policy.md). Derives from [Principle 10 — Git history is enforced, not aspirational](../principles.md). Documentation alone is aspirational; this convention turns it into a gate the platform refuses to bypass.

## Scope

Applies to this repo and to any project that adopts the `base` stack and hosts on GitHub. Covers: repository merge settings, branch protection on the release branch, and the security baseline (Dependabot, CODEOWNERS, SECURITY.md). Does **not** cover branch naming, commit format, or PR shape — those live in [Git conventions](git.md).

Each rule below ships a `gh api` snippet that consumers run after cloning. Clicking through the GitHub UI is documented as a fallback, but the CLI snippet is the source of truth — the UI changes, REST endpoints do not.

The snippets use `:owner/:repo` as a placeholder. The `gh` CLI auto-resolves this against the current working directory's git remote, so the snippets run as-is from inside any clone of the target repo. When applying to a different repo (e.g., right after `gh repo create` and before the first clone), replace `:owner/:repo` literally — e.g., `repos/veijdz/my-new-project`.

## Rules

### Merge settings

- **Rule.** Squash merge is the only allowed merge method. Merge commits and rebase merges are disabled. The squash commit subject is the PR title; the body is the PR description.
  - **Why.** Long-lived branches stay linear; each PR is exactly one auditable commit on `staging` and on `main`. See [Git conventions — Merge strategy](git.md). Pinning the commit title format to `PR_TITLE` is what makes the PR-title-is-Conventional-Commits rule in `git.md` actually take effect — without it, GitHub defaults to a generated `Merge #NN` subject and the parseable history is lost.
  - **How.** Apply via `gh api`:

    ```bash
    gh api repos/:owner/:repo \
      --method PATCH \
      -F allow_squash_merge=true \
      -F allow_merge_commit=false \
      -F allow_rebase_merge=false \
      -F squash_merge_commit_title=PR_TITLE \
      -F squash_merge_commit_message=PR_BODY
    ```

- **Rule.** Branches are automatically deleted after their PR merges.
  - **Why.** Merged branches are dead weight in `git branch -r` and in tab-completion. The convention removes a recurring janitorial step.
  - **How.**

    ```bash
    gh api repos/:owner/:repo --method PATCH -F delete_branch_on_merge=true
    ```

- **Rule.** PR branches may be updated from the base branch via the "Update branch" button.
  - **Why.** Lets the author resolve a stale base without leaving the GitHub UI. The alternative — local rebase plus force-push — is more error-prone for a one-line conflict.
  - **How.**

    ```bash
    gh api repos/:owner/:repo --method PATCH -F allow_update_branch=true
    ```

### Branch protection on `main`

`main` is the release branch consumed by `npx degit`. Every change reaches it through a PR from `staging`; nothing else is allowed.

- **Rule.** Direct pushes to `main` are blocked; all changes go through a PR.
  - **Why.** The PR is the unit of review, the unit of release-note context, and the unit the squash-merge rule can attach to. Direct pushes skip every one of those.

- **Rule.** Zero approvals are required (this repo is currently maintained by one person), but the PR requirement still holds.
  - **Why.** GitHub forbids a user from approving their own PR. Setting required approvals ≥ 1 on a solo project blocks the maintainer from ever merging. The PR requirement alone is enough to enforce the workflow; the approval count rises when a second human gains merge rights.

- **Rule.** Linear history is required — no merge commits on `main`. Applies prospectively: pre-existing merge commits on `main` (the bootstrap and early releases) are not retroactively rejected and are preserved as-is. From the moment the protection is in place, new merges into `main` must be fast-forward or squash.
  - **Why.** Aligns with the squash-only merge policy. `git bisect` and `git log --oneline` stay readable. Granularity per release lives in the corresponding GitHub Release body (see [ADR 0002](../adr/0002-release-policy.md)) and in `staging`'s per-PR history.

- **Rule.** Force pushes and branch deletion are blocked, even for admins.
  - **Why.** Force push to `main` rewrites consumers' history. Deletion strands every consumer that points `degit` at the default branch.

- **Rule.** Admin enforcement is on — the maintainer is subject to the same rules.
  - **Why.** Self-discipline is unreliable. A rule that can be bypassed by the person most likely to bypass it is not a rule.

- **How.** Apply all of the above with one call:

  ```bash
  gh api repos/:owner/:repo/branches/main/protection \
    --method PUT \
    --input - <<'JSON'
  {
    "required_status_checks": null,
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "required_approving_review_count": 0,
      "dismiss_stale_reviews": false,
      "require_code_owner_reviews": false
    },
    "restrictions": null,
    "required_linear_history": true,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "block_creations": false,
    "required_conversation_resolution": false
  }
  JSON
  ```

  `required_status_checks: null` is intentional — CI is added separately (see [Out of scope](#out-of-scope)). When the CI workflow lands, this field becomes:

  ```json
  "required_status_checks": { "strict": true, "contexts": ["<workflow job name>"] }
  ```

- **Rule.** `staging` is not protected.
  - **Why.** `staging` is the working branch. Forcing PRs at this layer too would double the ceremony per change for no additional safety, since `main` (the actually-published artifact) is gated.

- **Rule.** Emergency overrides (break-glass) are explicit and short-lived: disable `enforce_admins`, perform the override, re-enable in the same session.
  - **Why.** `enforce_admins: true` is deliberately designed to trap the maintainer when convention conflicts with reality (a flaky CI step that blocks a release; a malformed protection state that needs a direct push to recover). The escape hatch must exist, must be obvious, and must not be left open. Documenting it inline avoids the failure mode where the rule gets silently violated under pressure and the violation persists.
  - **How.**

    ```bash
    # break glass
    gh api repos/:owner/:repo/branches/main/protection/enforce_admins --method DELETE
    # ... perform the override (push, force-merge, etc.) ...
    gh api repos/:owner/:repo/branches/main/protection/enforce_admins --method POST
    ```

    Every break-glass use should leave a trail: a commit message explaining the override, a PR comment, or a short note on the release that follows. Future tooling (audit log query, scheduled check) is welcome but not required by this convention.

- **Rule.** Audit consumers running `git log -- stacks/<stack>/` (per [ADR 0002](../adr/0002-release-policy.md)) target `staging`, not `main`.
  - **Why.** Squash-only at the release boundary collapses every feature PR between two release tags into a single commit on `main`. The per-PR granularity ADR 0002's audit recommendation depends on lives on `staging`, which preserves one commit per merged PR. `main` remains the canonical answer to "what's the latest release"; `staging` is the canonical answer to "what changed and when". The two roles are complementary, but they are not interchangeable for `git log` purposes.

### Security baseline

- **Rule.** Dependabot is not enabled.
  - **Why.** This repo ships templates, not packages. The pinned versions in `stacks/base/README.md` are tested as a set; bumping one without re-running the dogfood risks breaking consumers silently. Consumers who copy templates take ownership of their own dependency hygiene.
  - **Revisit when.** The repo starts publishing a runtime artifact (npm package, Docker image, etc.).

- **Rule.** `CODEOWNERS` is not used.
  - **Why.** The mechanism exists to fan reviews out to specific people. With one maintainer there is nothing to fan out.
  - **Revisit when.** A second human gains merge rights.

- **Rule.** `SECURITY.md` is not provided. No formal disclosure channel beyond GitHub's default issue tracker is configured.
  - **Why.** This repo distributes documentation and copyable templates; it has no runtime, no live endpoint, and no credential surface. A security report would, in practice, be a bug report against a documented dependency version, which the public issue tracker handles fine.
  - **For consumer repos.** Projects that adopt the `base` stack and host code with a runtime should enable GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository) via `gh api repos/:owner/:repo/private-vulnerability-reporting --method PUT` and add a `SECURITY.md` pointing reports there. This convention does not enable it on the templates repo because there is nothing to disclose against.
  - **Revisit when.** The repo starts shipping executable code that runs in consumers' projects beyond what they explicitly import.

## Rationale

- **Why `gh api` over the UI?** Settings drift silently. A consumer who clicks through screenshots in a README cannot diff the current state against the documented one. A CLI snippet is both the spec and the apply step; running it is also the verification.

- **Why enforce admins?** A repo's owner is the single person most likely to think "just this once" and push to `main` to fix something. Every time that happens, every consumer's `git log` learns to distrust the branch. `enforce_admins: true` removes the temptation.

- **Why no required approvals on a solo repo?** Setting the count to 1 produces a working-as-intended deadlock: the maintainer cannot approve their own PR, so nothing ever merges. The right number is 0 today and ≥ 1 the moment a second reviewer exists. The PR requirement itself — distinct from the approval count — still applies at 0.

- **Why `restrictions: null` and `block_creations: false`?** Restrictions limit _who_ can push or create on the branch; with `enforce_admins: true` and PRs required, no human pushes happen anyway. Setting these adds noise without changing behavior.

## Out of scope

- **CI workflow.** The `required_status_checks` field above is intentionally `null` and is wired up separately when the GitHub Actions workflow lands.
- **PR body enforcement.** `.github/pull_request_template.md` is a default body, not a hard requirement. `gh pr create --body "anything"` bypasses it. Mechanical enforcement (e.g., a check that fails on PRs without `## Summary` and `## Test plan` sections) belongs with the CI workflow.
- **Branch naming, commit format, PR title format.** Covered in [Git conventions](git.md).
- **Release tagging and the date-tag scheme.** Covered in [ADR 0002 — Release policy](../adr/0002-release-policy.md).
- **Per-stack rules (`base`, `node`, `nestjs`, …).** Live in each stack's own `rules.md`.

## References

- [GitHub REST — Update a repository](https://docs.github.com/en/rest/repos/repos#update-a-repository)
- [GitHub REST — Update branch protection](https://docs.github.com/en/rest/branches/branch-protection#update-branch-protection)
- [GitHub REST — Configuring private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository)
- [Principle 10 — Git history is enforced, not aspirational](../principles.md)
- [Git conventions](git.md)
- [ADR 0002 — Release policy](../adr/0002-release-policy.md)

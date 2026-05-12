---
title: GitHub settings
last-reviewed: 2026-05-12
---

<!-- Based on docs/_templates/convention.md -->

# Conventions — GitHub settings

> GitHub-side enforcement of decisions made elsewhere: the merge policy from [Git conventions](git.md), the release flow from [ADR 0002 — Release policy](../adr/0002-release-policy.md). Documentation alone is aspirational; this convention turns it into a gate the platform refuses to bypass.

## Scope

Applies to this repo and to any project that adopts the `base` stack and hosts on GitHub. Covers: repository merge settings, branch protection on the release branch, and the security baseline (Dependabot, CODEOWNERS, SECURITY.md). Does **not** cover branch naming, commit format, or PR shape — those live in [Git conventions](git.md).

Each rule below ships a `gh api` snippet that consumers run after cloning. Clicking through the GitHub UI is documented as a fallback, but the CLI snippet is the source of truth — the UI changes, REST endpoints do not.

## Rules

### Merge settings

- **Rule.** Squash merge is the only allowed merge method. Merge commits and rebase merges are disabled.
  - **Why.** Long-lived branches stay linear; each PR is exactly one auditable commit on `staging` and on `main`. See [Git conventions — Merge strategy](git.md).
  - **How.** Apply via `gh api`:

    ```bash
    gh api repos/:owner/:repo \
      --method PATCH \
      -F allow_squash_merge=true \
      -F allow_merge_commit=false \
      -F allow_rebase_merge=false
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

- **Rule.** Linear history is required — no merge commits on `main`.
  - **Why.** Aligns with the squash-only merge policy. `git bisect` and `git log --oneline` stay readable. Granularity per release lives in the corresponding GitHub Release body (see [ADR 0002](../adr/0002-release-policy.md)).

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

### Security baseline

- **Rule.** Dependabot is not enabled.
  - **Why.** This repo ships templates, not packages. The pinned versions in `stacks/base/README.md` are tested as a set; bumping one without re-running the dogfood risks breaking consumers silently. Consumers who copy templates take ownership of their own dependency hygiene.
  - **Revisit when.** The repo starts publishing a runtime artifact (npm package, Docker image, etc.).

- **Rule.** `CODEOWNERS` is not used.
  - **Why.** The mechanism exists to fan reviews out to specific people. With one maintainer there is nothing to fan out.
  - **Revisit when.** A second human gains merge rights.

- **Rule.** `SECURITY.md` is not provided.
  - **Why.** This repo distributes documentation and copyable templates; it has no runtime, no live endpoint, and no credential surface. A security report would, in practice, be a bug report against a documented dependency version. GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository) is left enabled in repo settings as the disclosure channel.
  - **Revisit when.** The repo starts shipping executable code that runs in consumers' projects beyond what they explicitly import.

## Rationale

- **Why `gh api` over the UI?** Settings drift silently. A consumer who clicks through screenshots in a README cannot diff the current state against the documented one. A CLI snippet is both the spec and the apply step; running it is also the verification.

- **Why enforce admins?** A repo's owner is the single person most likely to think "just this once" and push to `main` to fix something. Every time that happens, every consumer's `git log` learns to distrust the branch. `enforce_admins: true` removes the temptation.

- **Why no required approvals on a solo repo?** Setting the count to 1 produces a working-as-intended deadlock: the maintainer cannot approve their own PR, so nothing ever merges. The right number is 0 today and ≥ 1 the moment a second reviewer exists. The PR requirement itself — distinct from the approval count — still applies at 0.

- **Why `restrictions: null` and `block_creations: false`?** Restrictions limit _who_ can push or create on the branch; with `enforce_admins: true` and PRs required, no human pushes happen anyway. Setting these adds noise without changing behavior.

## Out of scope

- **CI workflow.** The `required_status_checks` field above is intentionally `null` and is wired up separately when the GitHub Actions workflow lands.
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

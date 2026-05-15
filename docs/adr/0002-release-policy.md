---
title: Release policy
status: accepted
date: 2026-05-10
supersedes:
superseded-by:
---

<!-- Based on docs/_templates/adr.md -->

# ADR 0002 — Release policy

## Context

The templates in this repo are consumed via `npx degit`, which performs a stateless copy. A consumer therefore has no on-disk version of "the template" — once copied, the files belong to the consumer's repo. Any future change in this repo cannot reach existing consumers automatically.

That raises a question every documentation, lint-rule, or config change forces us to answer:

- How does an existing consumer know a change happened?
- How do they distinguish a routine cleanup from a change they should re-apply?
- How is a breaking change in a template communicated, given that "the template" is no longer a single artifact on the consumer side?

A natural reflex is to add semver tags per stack (`base-v1.0.0`, `node-v0.3.0`). But version numbers are a contract between a publisher and a consumer of a package — and the deliberate stance of this repo is that there is no package. Adding versions brings back the coupling the stateless-copy model was designed to remove.

The opposite extreme — communicating nothing — is also a position, but it leaves the consumer with no way to discover that, say, the test convention now bans a pattern they rely on.

This ADR picks a middle ground that matches the stateless-copy stance.

## Decision

The repo does **not** version its templates. Instead, it uses GitHub Releases as a signaling channel, with three tiers:

1. **No release.** The default. Routine doc cleanups, typo fixes, internal refactors, and additions that are purely opt-in (a new section the consumer can choose to import) ship via merged PRs and are visible only through `git log`.

2. **Notable release.** When a change is worth a consumer's attention but does not break existing copies, the maintainer cuts a GitHub Release. The tag name uses the date in `YYYY-MM-DD` form (`2026-05-10`); the release body lists a one-line description per change. Notable changes include: a new convention being added, the baseline gaining a new rule chapter (e.g., the Node runtime categories), a rule being clarified in a way that changes interpretation.

3. **Breaking release.** When a change invalidates an existing consumer's copy (a config option removed, a banned package change, a rule reversal), the maintainer cuts a GitHub Release tagged `YYYY-MM-DD-BREAKING`. The body lists the migration steps explicitly. The corresponding commit uses Conventional Commits with `!:` and a `BREAKING CHANGE:` footer.

When more than one release is cut on the same calendar day, the second and subsequent tags append `.N` to the date: `YYYY-MM-DD.2`, `YYYY-MM-DD.3`, …. The first release of the day omits the suffix (`.1` is never used) — this keeps the common case clean and only spends naming bytes when a day actually needs them. The same rule applies to breaking releases: `YYYY-MM-DD.2-BREAKING`. Lexical sort across same-day tags then matches the cut order (`2026-05-12` < `2026-05-12.2` < `2026-05-12.3`).

Consumers stay current through one of three mechanisms, all surfaced in the root `README.md`:

- **Watch the repo** with "Releases only" — GitHub notifications then cover both notable and breaking tiers.
- **Subscribe to the RSS feed** (`/releases.atom`) for the same coverage without GitHub notifications.
- **Run `git log -- config/ docs/rules.md`** in this repo against the consumer's last `degit` date — appropriate when the consumer wants to audit explicitly rather than be pinged.

There is no machine-readable version on the consumer side. The "version" is the commit SHA the consumer copied from, which the consumer is free to record (e.g., in a top-of-file comment) but is not required to.

## Consequences

### Positive

- The stateless-copy stance is preserved end-to-end. Nothing on the consumer's disk depends on a version this repo controls.
- The release stream stays meaningful: a notification means something worth reading, not a patch-bump for an internal rename.
- Breaking changes are loud (a dedicated tag with `-BREAKING-` in the name) and discoverable both through GitHub Releases and through `git log --grep='BREAKING CHANGE'`.

### Negative

- The consumer has no automated "I am out of date" signal. Drift is detectable only by checking the repo.
- Notable vs. routine is a maintainer judgment call. Two reasonable people may disagree, and there is no rule to fall back on.
- No machine-readable changelog. Tooling in consumer repos that wants to diff template changes has to parse `git log`, which is feasible but not zero-cost.

### Neutral

- The decision can be revisited cheaply: switching to semver tags is additive (the existing date tags can stay), and switching to "no signal at all" just means stopping cutting releases. Neither move is destructive to existing consumers.

## Alternatives considered

1. **Per-stack semver (`base-v1.0.0`).** Rejected: forces the maintainer to decide what a "breaking change for documentation" even means, encourages numerical inflation (every doc tweak becomes `v1.0.1`), and reintroduces the coupling the no-package stance was designed to drop.

2. **Single repo semver.** Same problem as per-stack semver: there is no installable package, so no public API surface a version number could meaningfully track. Rejected.

3. **CHANGELOG file in this repo.** A file-based changelog requires every PR to remember to update it — a chore that decays the moment review attention slips. GitHub Releases give the same information with maintainer intent rather than per-PR ritual. Rejected as the primary channel; not forbidden as a future supplement.

4. **No signaling at all (consumer monitors `git log`).** Rejected as the sole mechanism: the friction is high enough that real consumers will simply never check, and a breaking change will then propagate as a surprise debug session. The "consumer-monitors-`git log`" path is preserved as one of three options, just not the only one.

## References

- [Conventional Commits 1.0 — Breaking changes](https://www.conventionalcommits.org/en/v1.0.0/#commit-message-with--to-draw-attention-to-breaking-change)
- [GitHub Releases — Atom feed](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- [Principle 5 — Simplicity over flexibility](../principles.md)
- [Conventions — Git](../conventions/git.md) — defines the `BREAKING CHANGE:` commit footer this policy relies on.

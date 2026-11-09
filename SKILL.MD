---
name: github-release-manager
description: Prepare release notes, handle semantic version bumps, and automate GitHub releases based on merged changes. Use when asked to manage releases, bump package versions, or generate release changelogs.
---

# GitHub Release Manager

A skill for orchestrating software releases, summarizing merged pull requests, determining semantic version bumps, and generating structured release notes.

## When to Use

Use this skill when the user asks to:
- Prepare a new release or version bump.
- Summarize changes since the last Git tag.
- Generate release notes or changelogs for GitHub repositories.

## Workflow

<Steps>
  <Step title="Review Release Policy" subtitle="Prerequisite">
    Read `references/release-policy.md` to verify versioning conventions, branch rules, and pre-release criteria.
    *Verification:* Release policy guidelines and version constraints are loaded into context.
  </Step>
  <Step title="Audit Changes" subtitle="Git History">
    Summarize all merged commits, pull requests, and PR labels since the previous Git tag.
    *Verification:* A chronological list of feature, fix, and breaking changes is compiled.
  </Step>
  <Step title="Propose Version Bump" subtitle="Semantic Versioning">
    Analyze the change severity (`feat` vs `fix` vs `BREAKING CHANGE`) and propose the next semantic version number (MAJOR.MINOR.PATCH) for user approval.
    *Verification:* User explicitly approves the proposed version bump before any files are modified.
  </Step>
  <Step title="Execute Changelog Generation" subtitle="Automation Script">
    Run `scripts/changelog.ts` to update documentation, append changelog entries, and tag the release only after receiving user confirmation.
    *Verification:* Changelog files and version stamps are updated successfully without local git errors.
  </Step>
</Steps>

## Gotchas

- **Never modify files** or run version-writing scripts before receiving explicit user approval on the proposed version bump.
- Ensure all breaking changes are prominently highlighted in the release notes summary.

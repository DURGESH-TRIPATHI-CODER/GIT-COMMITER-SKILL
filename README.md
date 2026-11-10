# GitHub Release Manager

A small, safety-first TypeScript CLI and AI-agent skill for preparing GitHub releases.

## Requirements

- Node.js 20+
- Git
- GitHub CLI (`gh`) for PR and release operations
- A Git repository; GitHub remote recommended

## Install

```bash
npm install
gh auth status
```

## Quick start

```bash
npm run release -- plan
```

Review the proposed version and release notes. The planning command is read-only.

After explicitly approving the exact version:

```bash
npm run release -- apply --approved-version 1.2.3
```

Review and commit the generated changes using your normal Git workflow. Then separately approve each remote operation:

```bash
npm run release -- tag --approved-version 1.2.3 --confirm-tag
npm run release -- push-tag --approved-version 1.2.3 --confirm-push
npm run release -- draft --approved-version 1.2.3
npm run release -- publish --approved-version 1.2.3 --confirm-publish
```

`draft` creates a draft only. `publish` publishes an existing draft. No command force-pushes or overwrites an existing tag/release.

## Configuration

Create `release.config.json` if needed:

```json
{
  "versionFile": "package.json",
  "changelogFile": "CHANGELOG.md",
  "tagPrefix": "v",
  "defaultBranch": "main",
  "includePrerelease": false
}
```

The CLI supports root `package.json` version updates by default. Set `versionFile` to `null` to manage changelog/tag/releases without changing a package version.

## Notes

- Commit classification uses Conventional Commits when possible; non-standard commits are categorized as `Other` and require human review.
- GitHub PR metadata is fetched with `gh`. If authentication or network access is unavailable, the command reports the issue rather than fabricating data.
- The initial release (no prior tag) uses all reachable commits from the repository's root.
- This tool intentionally does not create a release commit. Review and commit the generated files yourself before tagging.

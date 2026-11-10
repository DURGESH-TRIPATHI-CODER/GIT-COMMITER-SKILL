# Release Policy

## Defaults

- Follow Semantic Versioning (SemVer).
- Use annotated Git tags prefixed with `v` (for example, `v1.4.0`).
- Use the repository's existing default branch; do not assume `main` if Git can determine it.
- Require a clean working tree before planning a release that will be applied.
- Do not overwrite tags or GitHub releases.
- Keep release preparation separate from committing, tagging, pushing, and publishing.

## Version selection

- MAJOR: incompatible public API or behavior change.
- MINOR: backward-compatible functionality.
- PATCH: backward-compatible bug fix.
- `0.y.z`: treat `0.x` as initial development; breaking changes normally increment MINOR unless maintainers specify otherwise.
- If evidence is ambiguous, state uncertainty and ask the user rather than guessing.

## Required gates

1. Plan and show evidence.
2. Obtain exact-version approval before writing files.
3. Validate and review the resulting diff.
4. Commit changes using the project's normal process.
5. Obtain separate approval before local tag creation.
6. Obtain separate approval before pushing a tag.
7. Obtain separate approval before publishing a GitHub Release.

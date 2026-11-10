# GitHub Release Operations

Use GitHub CLI (`gh`) for authenticated GitHub operations.

- Check authentication with `gh auth status`.
- Query merged PRs with `gh pr list`.
- Create drafts with `gh release create --draft`.
- Publish an existing draft with `gh release edit --draft=false`.
- Verify release state with `gh release view`.

Do not pass tokens on command lines. Do not echo environment variables. Do not force-push or overwrite tags/releases. Verify every remote operation after it completes.

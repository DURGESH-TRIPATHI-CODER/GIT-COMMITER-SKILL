# Conventional Commits

Recognized commit headers:

- `feat:` -> feature (normally MINOR)
- `fix:` -> bug fix (normally PATCH)
- `perf:` -> performance improvement (normally PATCH)
- `docs:`, `style:`, `refactor:`, `test:`, `build:`, `ci:`, `chore:` -> maintenance unless repository policy says otherwise
- `!` after type/scope or a `BREAKING CHANGE:` footer -> potential breaking change (MAJOR)

A breaking declaration is a signal, not proof. Inspect the associated change and public API impact. Non-conventional commits must not be silently classified as features or fixes.

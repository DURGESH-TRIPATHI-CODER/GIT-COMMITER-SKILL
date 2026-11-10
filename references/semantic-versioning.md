# Semantic Versioning

A version has `MAJOR.MINOR.PATCH` components.

- MAJOR changes for incompatible public API changes.
- MINOR changes for backward-compatible functionality.
- PATCH changes for backward-compatible bug fixes.

Pre-release versions use identifiers such as `1.2.0-rc.1`. Build metadata follows `+` and does not affect precedence. This initial CLI deliberately rejects malformed versions and does not automatically infer complex prerelease transitions; review those manually.

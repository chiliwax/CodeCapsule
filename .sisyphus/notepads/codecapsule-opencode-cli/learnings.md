## Final fixes verification - 2026-05-12

- `init` import selection should flow through `processImportOptions()` so `profile.json` import flags and `local.json` host source paths stay consistent.
- `.codecapsule/.gitignore` should be generated via `generateGitignore()`; it includes both `local.json` and `imports/`.
- OpenCode host config paths remain shell-home paths, but container config paths must be absolute `/home/codecapsule/...` Docker paths.

## Docker runtime fix - 2026-05-13

- `node:22-bookworm-slim` can already contain UID/GID 1000, so generated OpenCode Dockerfiles should default the CodeCapsule user/group to a high, less collision-prone ID (`10001`).
- Do not run the container with the host numeric UID/GID for TUI agents; that user has no passwd/home entry, causing Bun/OpenCode to fall back to `/.local` and fail with `EACCES`. Run as the named `codecapsule` user instead.
- Set `HOME` and XDG env vars to `/home/codecapsule/...` at runtime, and pre-create/chown OpenCode config/data/cache directories so named volumes inherit writable ownership.
- Pass-through launch args should append after the adapter command (`opencode --help`), not replace the command with a bare `--help`.

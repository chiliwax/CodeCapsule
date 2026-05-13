## Final fixes verification - 2026-05-12

- `init` import selection should flow through `processImportOptions()` so `profile.json` import flags and `local.json` host source paths stay consistent.
- `.codecapsule/.gitignore` should be generated via `generateGitignore()`; it includes both `local.json` and `imports/`.
- OpenCode host config paths remain shell-home paths, but container config paths must be absolute `/home/codecapsule/...` Docker paths.

## Docker runtime fix - 2026-05-13

- `node:22-bookworm-slim` can already contain UID/GID 1000, so generated OpenCode Dockerfiles should default the CodeCapsule user/group to a high, less collision-prone ID (`10001`).
- Do not run the container with the host numeric UID/GID for TUI agents; that user has no passwd/home entry, causing Bun/OpenCode to fall back to `/.local` and fail with `EACCES`. Run as the named `codecapsule` user instead.
- Set `HOME` and XDG env vars to `/home/codecapsule/...` at runtime, and pre-create/chown OpenCode config/data/cache directories so named volumes inherit writable ownership.
- Pass-through launch args should append after the adapter command (`opencode --help`), not replace the command with a bare `--help`.

## Docker UID/GID collision-safe user - 2026-05-13

- Generated OpenCode Dockerfiles should resolve host UID/GID collisions with getent/id logic before creating or renaming the codecapsule group/user.
- Keep npm global OpenCode installation before USER codecapsule so npm install runs with root permissions.
- Place HOME and XDG env vars after USER codecapsule and pre-create /home/codecapsule/.config/opencode, .local/share/opencode, and .cache/opencode before chowning.

## Profile state/cache path migration - 2026-05-13

- Profiles now use project-local `statePath` and `cachePath` defaults under `.codecapsule/state/opencode` and `.codecapsule/cache/opencode`; old `stateVolume`/`cacheVolume` fields should produce a clear migration error instead of being silently defaulted over.
- Docker launch bind-mounts the project-local state/cache paths into OpenCode XDG data/cache directories, so runtime consumers must use paths rather than Docker named volumes.
- Clean now removes local state/cache paths plus the image; tests should create those directories when asserting path cleanup.

## Task 6 E2E QA - 2026-05-13

- Build dry-run is the right CLI smoke for UID/GID build args; plain `launch --dry-run` only prints `docker run`, while `launch --dry-run --build` prints both `docker build` and `docker run`.
- Real Docker smoke on macOS/OrbStack exposed Linux GID 20 as an existing `dialout` group; the generated Dockerfile collision logic renamed it to `codecapsule` and completed successfully.
- OpenCode `--help` performs a one-time database migration in the mounted project-local state/cache paths but does not require auth or networked LLM calls.

## Task 3 init local dirs - 2026-05-13
- runInit creates .codecapsule/state/<tool> and .codecapsule/cache/<tool> immediately after ensuring .codecapsule exists, before writing generated files.
- generateGitignore owns runtime ignores for imports/, state/, cache/, tmp/, and logs/.
- Tests that call runInit solely to create a profile may need to remove state/cache fixtures when asserting absent clean resources.

## Task 4 runner local mounts - 2026-05-13

- Runner image tags should be derived from the project basename and host UID/GID (`codecapsule/<tool>:<slug>-uid<uid>-gid<gid>`) so host-UID-built images do not collide across projects or users.
- Docker run should keep `--user codecapsule` and XDG envs, while bind-mounting project-local `.codecapsule/state/opencode` and `.codecapsule/cache/opencode` paths into the OpenCode data/cache directories.
- Launch dry-run, image existence checks, auto-build, explicit build, and pass-through command tests all need to use the same runner-owned scoped image tag.

## 2026-05-13 Final manual CLI QA

- APPROVE: Manual QA passed for built CLI. `--help`, `init --tool opencode --yes --force`, `doctor`, both launch dry-runs, `clean --yes`, and `clean --yes --include-state` all exited 0.
- `init` created `.codecapsule/state/opencode` and `.codecapsule/cache/opencode`; plain clean removed cache while preserving state; include-state clean removed state.
- Launch dry-run used project-local bind mounts, scoped image tag `codecapsule/opencode:safe-code-uid501-gid20`, and `--build` dry-run included `USER_ID=501` / `GROUP_ID=20`.
- Final verification: LSP diagnostics on `src` = 0 errors; `npm test` = 12 files / 65 tests passed; `npm run build` exited 0.

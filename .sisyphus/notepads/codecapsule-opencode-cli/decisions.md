## Final fixes verification - 2026-05-12

- Dockerfile generation rejects unsafe `opencodeVersion` values before interpolation, accepting only `latest` or strict `x.y.z` semver.
- CLI top-level parsing now uses `exitOverride()` plus a catch boundary to print concise `Error: ...` messages instead of stack traces.

## Task 4 runner local mounts - 2026-05-13

- `getProjectImageTag(profile, cwd)` lives in `src/docker/runner.ts` and is reused by launch so build, inspect, and run commands cannot drift to different image tags.
- UID/GID build args are emitted only on Docker build commands; runtime continues to use the named `codecapsule` user for a valid container home/passwd entry.

## Task 6 E2E QA - 2026-05-13

- Added E2E assertions at the workflow layer rather than duplicating lower-level runner unit tests, because the regression requirement is about the user-visible dry-run command emitted by `runLaunch`.

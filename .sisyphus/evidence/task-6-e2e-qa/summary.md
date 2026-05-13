# Task 6 E2E QA Evidence

- `npm run typecheck`: pass (`typecheck.log`).
- `npm test -- --run`: pass, 12 files / 65 tests (`test.log`). Vitest emitted existing nested `vi.unmock` hoist warnings.
- `npm run build`: pass (`build.log`).
- Built CLI dry-run: pass (`dry-run.log`, `dry-run-build.log`). Output includes project-local `.codecapsule/state/opencode` and `.codecapsule/cache/opencode` mounts, `--user codecapsule`, `HOME=/home/codecapsule`, `--build-arg USER_ID=501`, `--build-arg GROUP_ID=20`, and scoped image tag `codecapsule/opencode:codecapsule-dry-run-ftbvoy-uid501-gid20`.
- Global named volume regression check: pass; no `codecapsule-opencode-state` or `codecapsule-opencode-cache` in dry-run evidence.
- Real Docker smoke: pass (`docker-smoke.log`). `node dist/cli.js launch --build -- --help` built successfully, handled existing Linux GID 20 by renaming `dialout` to `codecapsule`, printed OpenCode help, and exited `0`. No `EACCES` failure observed.

Code change made: `test/e2e/workflow.test.ts` now covers project-scoped state/cache paths, named runtime user/home, UID/GID build args, scoped image tag, forwarded launch args, and absence of old global named volumes.

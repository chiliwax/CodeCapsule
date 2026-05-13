# AGENTS.md — CodeCapsule

> Safe isolated Docker launcher for OpenCode.

## Quick Commands

```bash
# Build and verify
npm run build        # Compiles src/ → dist/ via tsc
npm run typecheck    # tsc --noEmit
npm test             # vitest run (all tests)
npm test -- --run    # Same, explicit flag
npm run test:watch   # vitest watch mode

# Run the CLI locally (direct execution)
node dist/cli.js init --tool opencode --yes
node dist/cli.js doctor
node dist/cli.js launch --dry-run
node dist/cli.js clean --yes

# Run via installed binary
capsule init --tool opencode --yes
capsule doctor
capsule launch --dry-run
capsule clean --yes
```

> `codecapsule` remains available as a backwards-compatible alias.

## Architecture

- **Entry**: `src/cli.ts` wires Commander.js subcommands (`init`, `doctor`, `launch`, `clean`).
- **Commands**: `src/commands/*.ts` — each exports a `Command` and a `run*` function.
- **Core**: `src/core/types.ts` + `src/core/schemas.ts` — Zod-validated `Profile` and `LocalConfig`.
- **Docker**: `src/docker/runner.ts` builds `docker run` args; `src/docker/dockerfile.ts` generates the Dockerfile.
- **Adapters**: `src/adapters/opencode.ts` defines import categories and path mappings for OpenCode.
- **Config**: `.codecapsule/profile.json` (committed) + `.codecapsule/local.json` (gitignored, machine-specific).

## Key Design Facts

- **ESM only**: `"type": "module"` in package.json. All imports use `.js` extension.
- **Project-local state**: `statePath`, `cachePath`, `configPath` under `.codecapsule/` (not Docker named volumes).
- **Host UID/GID**: Dockerfile builds with `--build-arg USER_ID/GROUP_ID` for Linux write compatibility.
- **Image tags**: Scoped by project slug + UID/GID (e.g. `codecapsule/opencode:safe-code-uid501-gid20`).
- **Security defaults**: No privileged, no docker socket, no host home mount, no SSH agent.
- **Import model**: Opt-in via `--import <category>`; auth requires `--confirm-auth-import`.
- **Clean safety**: `clean --yes` removes cache+image only; state requires `--include-state`.

## Testing

- **Framework**: Vitest (no special config needed).
- **Pattern**: `test/**/*.test.ts`.
- **Docker tests**: E2E tests check `docker --version`; skip if unavailable.
- **Mocking**: `vi.doMock('node:child_process')` for launch/doctor/clean tests.
- **Fixtures**: JSON profiles in `test/fixtures/`.

## File Conventions

- All source under `src/`, compiled to `dist/`.
- `tsconfig.json`: strict, NodeNext module resolution, `noEmitOnError: true`.
- `vitest.config.ts`: minimal — just `environment: 'node'`.
- `.codecapsule/` directory (created by `init`) contains:
  - `profile.json` — committed, shareable
  - `local.json` — gitignored, machine-specific paths
  - `Dockerfile.opencode` — committed, generated
  - `.gitignore` — generated, ignores `local.json`, `state/`, `cache/`, `config/`

## Docker Behavior Notes

- Containers run as non-root `codecapsule` user with `HOME=/home/codecapsule`.
- Bind mounts: workspace, state, cache, config (all project-local paths).
- Import mounts (read-only): Only when `--import` flags are passed.
- `--rm` flag: Container is removed after exit (disposable by design).

## Common Gotchas

- **Tilde expansion**: `resolveHostPath()` in `src/core/import.ts` expands `~/` to `homedir()` for Docker volume mounts. Never pass raw `~` to Docker.
- **Missing build**: `launch` without `--build` expects image to exist; run `launch --build` first or after `clean`.
- **State persistence**: OpenCode writes auth/sessions to `.codecapsule/state/`, config to `.codecapsule/config/`, cache to `.codecapsule/cache/`. All are bind-mounted into the container.

## Dependencies

- `commander` — CLI framework
- `zod` — Schema validation (Profile, LocalConfig)
- `vitest` — Testing

Node ≥22 required.
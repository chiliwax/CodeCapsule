# Draft: CodeCapsule Project State/Cache + Linux UID Strategy

## Requirements (confirmed)
- Store OpenCode sessions/state per workspace instead of sharing the global `codecapsule-opencode-state` named volume.
- Prefer project `.codecapsule/` storage for stronger isolation.
- Add generated local state/cache paths to `.codecapsule/.gitignore`.
- Address Linux bind-mount write compatibility where a fixed container UID like `10001` may not be able to edit host-owned workspace files.
- Keep `HOME`/XDG directories valid so Bun/OpenCode does not try to write `/.local`.

## Technical Decisions
- Default state location should be project-scoped: `.codecapsule/state/opencode` mounted to `/home/codecapsule/.local/share/opencode`.
- Default cache location should be project-scoped for maximum isolation: `.codecapsule/cache/opencode` mounted to `/home/codecapsule/.cache/opencode`.
- `.codecapsule/.gitignore` should ignore `local.json`, `imports/`, `state/`, `cache/`, `tmp/`, and `logs/`.
- Linux-friendly build should pass host UID/GID as Docker build args and continue running as named user `codecapsule`, not a bare numeric user.
- Dockerfile must defensively handle UID/GID collisions in the base image.

## Research Findings
- Current profile stores `stateVolume` and `cacheVolume` as global named volumes (`codecapsule-opencode-state`, `codecapsule-opencode-cache`).
- Current runner mounts those global volumes into `/home/codecapsule/.local/share/opencode` and `/home/codecapsule/.cache/opencode`, so all workspaces share state/cache.
- Current Dockerfile defaults to high UID/GID and creates `/home/codecapsule`, but Linux workspace bind mounts require host UID/GID ownership compatibility for editing.
- Current runner uses `--user codecapsule`, which requires the image’s `codecapsule` user to be built with the host UID/GID for native Linux write compatibility.

## Open Questions
- None blocking. Default to maximum isolation: project-scoped state and cache, with shared cache deferred as a future opt-in.

## Scope Boundaries
- INCLUDE: profile/schema changes, init generation, Docker build args, runner mounts, gitignore, tests, docs, generated current `.codecapsule` update.
- EXCLUDE: multi-agent support, external auth redesign, shared cache flags, devcontainer support.

# CodeCapsule

Safe isolated Docker launcher for OpenCode.

## Features

- Initialize Docker dev containers for OpenCode
- Safe defaults: workspace-only mount, no host access
- Opt-in config/auth/skills import
- Disposable containers (removed after exit)

## Install

```bash
npm install
npm run build
```

## Usage

```bash
# Initialize OpenCode Docker setup
npx codecapsule init --tool opencode --yes

# Validate setup
npx codecapsule doctor

# Preview launch command
npx codecapsule launch --dry-run

# Launch OpenCode in Docker
npx codecapsule launch --build

# Clean up Docker resources (cache and image only; state is preserved)
npx codecapsule clean --yes

# Clean up everything including state (sessions, auth, etc.)
npx codecapsule clean --yes --include-state
```

## Generated Files

After running `init`, the `.codecapsule/` directory contains:

| File | Commit? | Description |
|------|---------|-------------|
| `profile.json` | Yes | Shareable config: tool, image, volumes, security policy, import selections |
| `Dockerfile.opencode` | Yes | Docker image definition for the selected tool |
| `local.json` | No | Machine-specific host source paths for imported configs |
| `.gitignore` | Yes | Excludes `local.json` and local `imports/` material |

## Project-Local State and Cache

CodeCapsule keeps state and cache inside your project directory, under `.codecapsule/`. This means each project has its own isolated environment.

| Path | Contents | Preserved by `clean --yes`? |
|------|----------|----------------------------|
| `.codecapsule/state/<tool>/` | Sessions, auth, history | Yes (requires `--include-state`) |
| `.codecapsule/cache/<tool>/` | Image build cache | No |
| Docker image | Built container image | No |

Use `clean --yes` when you want to free disk space from build artifacts without losing your working sessions. Only add `--include-state` when you intend to fully reset the project.

## Linux UID/GID Build Behavior

On Linux, the Dockerfile is generated with your host user ID and group ID. This ensures file ownership inside the container matches your host user, avoiding permission issues on mounted workspace files.

## Cleanup Safety

- `clean --yes` removes cache and image, but never removes state unless you pass `--include-state`
- State contains sessions, authentication tokens, and tool history. Do not delete it unless you intend to start fresh
- Cache is safe to delete at any time. It will be rebuilt on the next `launch --build`

## Security

- Containers run as non-root user
- Only workspace directory is mounted by default
- No Docker socket access
- No privileged mode
- Config/auth import is opt-in only

### Import Categories

When initializing with `--import <category>`, the following categories are available:

- `settings` - Application settings and preferences
- `auth` - Authentication tokens and credentials (requires `--confirm-auth-import`)
- `skills` - Custom skills and capabilities
- `plugins` - Editor/IDE plugins
- `agents` - Agent configurations
- `commands` - Custom commands and shortcuts
- `tools` - External tool integrations
- `themes` - UI themes and color schemes

**Warning:** Importing `auth` carries a security risk because authentication files may contain sensitive tokens. Only use `--import auth --confirm-auth-import` when you understand the implications.

## Scope

- ✅ OpenCode support (v1)
- ⏳ Claude Code, Codex, Cursor CLI, Pi Agent, OpenClaw (planned future adapters; out of scope for v1)

## Development

```bash
npm install
npm run build
npm run test
```

## Commands

- `init` - Create a CodeCapsule profile and local configuration
- `doctor` - Validate the local CodeCapsule environment
- `launch` - Launch the configured coding agent in Docker
- `clean` - Remove CodeCapsule cache and Docker image (preserves state by default)

# CodeCapsule

Safe isolated Docker launcher for OpenCode and other coding agents.

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

# Clean up Docker resources
npx codecapsule clean --yes
```

## Generated Files

After running `init`, the `.codecapsule/` directory contains:

| File | Commit? | Description |
|------|---------|-------------|
| `profile.json` | Yes | Shareable config: tool, image, volumes, security policy, import selections |
| `Dockerfile.opencode` | Yes | Docker image definition for the selected tool |
| `local.json` | No | Machine-specific host source paths for imported configs |
| `.gitignore` | Yes | Excludes `local.json` and local `imports/` material |

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
- ⏳ Claude Code, Codex, Cursor CLI, Pi Agent, OpenClaw (future adapters)

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
- `clean` - Remove CodeCapsule Docker volumes and images

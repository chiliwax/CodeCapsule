# CodeCapsule OpenCode Docker CLI

## TL;DR
> **Summary**: Build CodeCapsule, a greenfield TypeScript/Node CLI that safely initializes and launches an isolated Docker container for OpenCode. The design is OpenCode-first but uses a declarative adapter boundary so Claude Code, Codex, Cursor CLI, Pi Agent, and OpenClaw can be added later without rewriting the core.
> **Deliverables**:
> - TypeScript CLI package with `codecapsule init`, `codecapsule launch`, `codecapsule doctor`, and `codecapsule clean`.
> - Generated `.codecapsule/profile.json`, `.codecapsule/Dockerfile.opencode`, `.codecapsule/local.json`, and `.codecapsule/.gitignore`.
> - OpenCode adapter metadata, Docker runner, security policy, config import policy, and Vitest coverage.
> - Agent-executed Docker/TTY QA evidence.
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 7 → Final Verification Wave

## Context

### Original Request
User wants a CLI program that sets up Docker dev containers for TUI coding-agent apps such as Pi Agent, Cursor CLI, OpenCode, Claude Code, Codex, and OpenClaw. Desired flow: `program init` selects the tool and prepares Dockerfile/tools; `program launch` runs the coding agent. User specifically asked to think about app name, app functionality/constraints, and how to handle MCP/skills/configs.

### Interview Summary
- App name: **CodeCapsule**.
- Product positioning: **safe isolated launcher**.
- Runtime: **TypeScript + Node.js**.
- First release: **OpenCode only**; future tools are adapter targets.
- `init` output: **project profile + Dockerfile**.
- Config model: **clean by default, opt-in import only**.
- Host access: **workspace bind mount only by default**.
- Container lifecycle: **remove container after launch exits**; preserve only explicit volumes.
- Tests: **set up Vitest** plus executable CLI/Docker QA scenarios.

### Metis Review (gaps addressed)
- Distribution defaulted to npm package `codecapsule`, Node 22+, ESM, binary `codecapsule` from `dist/cli.js`.
- Docker defaults decided: Docker CLI required, v1 supports macOS/Linux/WSL2, generated image uses Debian-based `node:22-bookworm-slim`, OpenCode installs with `npm install -g opencode-ai@${OPENCODE_VERSION}`, and `opencodeVersion` defaults to `latest` with a warning to pin before team rollout.
- Security defaults decided: non-root container user, default Docker bridge network allowed, no host network, no privileged mode, no Docker socket, no broad env passthrough, no host home mount.
- Generated files decided: `.codecapsule/profile.json`, `.codecapsule/local.json`, `.codecapsule/Dockerfile.opencode`, `.codecapsule/.gitignore`; `local.json` and imports are gitignored.
- Overwrite policy decided: `init` fails on existing generated files unless `--force` is passed.

## Work Objectives

### Core Objective
Create a working CodeCapsule CLI that can initialize a safe OpenCode Docker profile for the current project, build/validate its image, and launch OpenCode in an interactive TTY container with conservative host access.

### Deliverables
- Greenfield Node/TypeScript project scaffold.
- CLI commands: `init`, `launch`, `doctor`, `clean`.
- Declarative OpenCode adapter and core adapter interface.
- Dockerfile generator and Docker runner with centralized security policy.
- Config/profile persistence with explicit opt-in import categories.
- Vitest unit tests and CLI smoke tests.
- Evidence files under `.sisyphus/evidence/`.

### Definition of Done (verifiable conditions with commands)
- `npm install` completes successfully.
- `npm run typecheck` passes.
- `npm test -- --run` passes.
- `npm run build` emits `dist/cli.js` with executable CLI bin wiring.
- `node dist/cli.js init --tool opencode --yes` creates `.codecapsule/profile.json`, `.codecapsule/local.json`, `.codecapsule/Dockerfile.opencode`, and `.codecapsule/.gitignore`.
- `node dist/cli.js doctor` reports Docker availability and profile validity.
- `node dist/cli.js launch --dry-run` prints a `docker run` command with `-it`, workspace mount, non-root user, no Docker socket, no privileged flag, and no host home mount.

### Must Have
- OpenCode-first implementation.
- Core/adapters split.
- Safe defaults: workspace-only mount, opt-in imports, non-root container, no Docker socket, no privileged mode, no host home mount, no broad env passthrough.
- TTY-preserving launch path and signal/exit-code propagation.
- Machine-local config separated from shareable profile.
- Generated Dockerfile is user-readable and project-local.

### Must NOT Have
- Do not implement adapters for Claude Code, Codex, Cursor CLI, Pi Agent, or OpenClaw in v1.
- Do not mount `~`, host Docker socket, SSH agent, git credentials, or host config directories by default.
- Do not copy secrets into committed project files.
- Do not run containers as privileged or root by default.
- Do not hide Docker behavior behind opaque magic; `launch --dry-run` must reveal the exact Docker command.
- Do not write implementation code outside this plan during planning.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: Vitest + tests-after within each implementation task.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 project scaffold, Task 2 domain/profile contracts, Task 3 OpenCode adapter, Task 4 Dockerfile generator.
Wave 2: Task 5 CLI init/doctor, Task 6 Docker runner/launch dry-run, Task 7 import/local config policy.
Wave 3: Task 8 real launch/TTY behavior, Task 9 docs/UX polish, Task 10 end-to-end QA hardening.

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2-10.
- Task 2 blocks Tasks 3, 5, 6, 7, 10.
- Task 3 blocks Tasks 4, 5, 6, 7, 8, 10.
- Task 4 blocks Tasks 5, 8, 10.
- Task 5 blocks Tasks 8, 9, 10.
- Task 6 blocks Tasks 8, 10.
- Task 7 blocks Tasks 8, 9, 10.
- Task 8 blocks Task 10.
- Task 9 can run after Tasks 5-7.
- Task 10 blocks Final Verification Wave.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 4 tasks → quick / unspecified-high.
- Wave 2 → 3 tasks → unspecified-high.
- Wave 3 → 3 tasks → unspecified-high / writing.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Scaffold TypeScript CLI Project

  **What to do**: Create a Node 22+ ESM TypeScript project from the empty workspace. Use npm. Add `package.json` with package name `codecapsule`, binary `codecapsule` pointing to `dist/cli.js`, scripts `build`, `typecheck`, `test`, `test:watch`, and `start`. Add TypeScript config, Vitest config, source/test directories, `.gitignore`, and minimal CLI entry that prints help.
  **Must NOT do**: Do not add Docker behavior yet. Do not choose pnpm/bun. Do not create source outside standard project paths and `.codecapsule` generation code.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: greenfield scaffold with clear package choices.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`frontend-ui-ux`] - No UI work.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2,3,4,5,6,7,8,9,10] | Blocked By: []

  **References**:
  - Requirements: `.sisyphus/drafts/docker-agent-cli.md:13` - TypeScript + Node decision.
  - Requirements: `.sisyphus/drafts/docker-agent-cli.md:21` - Vitest decision.
  - External: `https://nodejs.org/api/esm.html` - ESM runtime behavior if needed.

  **Acceptance Criteria**:
  - [ ] `npm install` succeeds.
  - [ ] `npm run build` succeeds and emits `dist/cli.js`.
  - [ ] `node dist/cli.js --help` exits 0 and contains `codecapsule`.
  - [ ] `npm test -- --run` exits 0 with at least one scaffold test.

  **QA Scenarios**:
  ```
  Scenario: CLI help works
    Tool: Bash
    Steps: Run `npm install && npm run build && node dist/cli.js --help`.
    Expected: Exit code 0; output contains `codecapsule` and the implemented command list.
    Evidence: .sisyphus/evidence/task-1-scaffold-help.txt

  Scenario: TypeScript catches invalid source
    Tool: Bash
    Steps: Run `npm run typecheck` on clean scaffold.
    Expected: Exit code 0 with no TypeScript errors.
    Evidence: .sisyphus/evidence/task-1-typecheck.txt
  ```

  **Commit**: NO | Message: `chore: scaffold codecapsule cli` | Files: [package.json, package-lock.json, tsconfig.json, vitest.config.ts, src/, test/]

- [x] 2. Define Profile, Adapter, and Security Contracts

  **What to do**: Add typed contracts and Zod schemas for shareable profile, machine-local config, tool adapter metadata, import categories, Docker security policy, and launch options. Use exact generated paths: `.codecapsule/profile.json` for shareable config, `.codecapsule/local.json` for machine-local non-secret paths/preferences, `.codecapsule/Dockerfile.opencode`, `.codecapsule/.gitignore`. Profile fields must include `schemaVersion`, `tool: "opencode"`, `imageName`, `containerWorkdir: "/workspace"`, `opencodeVersion`, `stateVolume`, `cacheVolume`, `network: "bridge"`, and `imports` booleans defaulting false.
  **Must NOT do**: Do not store auth token contents in JSON. Do not include future non-OpenCode adapters in the v1 union except as comments/docs.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: central contracts drive every later task.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`frontend-ui-ux`] - No visual work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [3,5,6,7,10] | Blocked By: [1]

  **References**:
  - Requirements: `.sisyphus/drafts/docker-agent-cli.md:17` - opt-in import model.
  - Requirements: `.sisyphus/drafts/docker-agent-cli.md:23` - workspace-only default host access.
  - Oracle finding: `.sisyphus/drafts/docker-agent-cli.md:35` - core/adapters architecture.

  **Acceptance Criteria**:
  - [ ] Unit tests validate default profile parses successfully.
  - [ ] Unit tests reject profile with unsupported `tool`.
  - [ ] Unit tests reject local config containing inline secret/token fields.
  - [ ] `npm run typecheck` passes.

  **QA Scenarios**:
  ```
  Scenario: Default profile is valid and safe
    Tool: Bash
    Steps: Run `npm test -- --run profile`.
    Expected: Tests confirm imports false, network bridge, no host home/docker socket fields.
    Evidence: .sisyphus/evidence/task-2-profile-tests.txt

  Scenario: Unsafe profile is rejected
    Tool: Bash
    Steps: Run tests with fixture containing dockerSocket=true or privileged=true.
    Expected: Fixture validation fails with explicit error.
    Evidence: .sisyphus/evidence/task-2-unsafe-profile.txt
  ```

  **Commit**: NO | Message: `feat(core): define profile and adapter contracts` | Files: [src/core/, test/]

- [x] 3. Implement Declarative OpenCode Adapter

  **What to do**: Add `opencode` adapter metadata only. It must declare tool id/name, default launch command `opencode`, known container paths, import categories, config paths, auth caveats, cache/state paths, and validation messages. Declare host import sources: settings from `~/.config/opencode/opencode.json`, project settings from `opencode.json` and `.opencode/`, auth from `~/.local/share/opencode/auth.json`, cache from `~/.cache/opencode`, and extension categories `agents`, `commands`, `skills`, `plugins`, `tools`, `themes`. Adapter must not execute Docker or read host files directly.
  **Must NOT do**: Do not implement Claude/Codex/Cursor/Pi/OpenClaw adapters. Do not auto-import auth.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: adapter metadata affects security and import behavior.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`playwright`] - No browser work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [4,5,6,7,8,10] | Blocked By: [1,2]

  **References**:
  - OpenCode research: `.sisyphus/drafts/docker-agent-cli.md:27` - config/auth/plugin paths.
  - External: `https://opencode.ai/docs/` - official OpenCode documentation entry point.

  **Acceptance Criteria**:
  - [ ] Unit tests snapshot adapter metadata.
  - [ ] Tests assert every import category defaults disabled.
  - [ ] Tests assert adapter exposes auth warning text for containers.
  - [ ] No adapter method shells out or touches filesystem.

  **QA Scenarios**:
  ```
  Scenario: OpenCode metadata is complete
    Tool: Bash
    Steps: Run `npm test -- --run opencode-adapter`.
    Expected: Tests verify command, paths, imports, and warnings.
    Evidence: .sisyphus/evidence/task-3-opencode-adapter.txt

  Scenario: No accidental host reads
    Tool: Bash
    Steps: Search test coverage or run adapter in temp HOME with no files.
    Expected: Adapter construction succeeds without filesystem access.
    Evidence: .sisyphus/evidence/task-3-no-host-read.txt
  ```

  **Commit**: NO | Message: `feat(adapter): add opencode metadata` | Files: [src/adapters/, test/]

- [x] 4. Build Generated Dockerfile Template

  **What to do**: Implement generator for `.codecapsule/Dockerfile.opencode`. Use `node:22-bookworm-slim`, install minimal packages needed for TUI/dev workflows (`ca-certificates`, `curl`, `git`, `bash`, `tini`), create non-root user `codecapsule` with UID/GID build args defaulting 1000, set `WORKDIR /workspace`, install OpenCode with `ARG OPENCODE_VERSION=latest` and `RUN npm install -g opencode-ai@${OPENCODE_VERSION}`, set `ENTRYPOINT ["tini", "--"]`, and default `CMD ["opencode"]`. Include comments explaining generated file and why teams should pin `OPENCODE_VERSION` instead of using `latest`.
  **Must NOT do**: Do not use Alpine. Do not install multiple coding agents. Do not bake user auth/config into the image.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Docker/security details are easy to get wrong.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`git-master`] - No git operations requested.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [5,8,10] | Blocked By: [1,3]

  **References**:
  - Security decision: `.sisyphus/drafts/docker-agent-cli.md:22` - disposable container lifecycle.
  - Security decision: `.sisyphus/drafts/docker-agent-cli.md:23` - no implicit host access.
  - External: `https://opencode.ai/docs/` - official install docs for `npm install -g opencode-ai`.
  - External: `https://github.com/krallin/tini` - tini entrypoint behavior if needed.

  **Acceptance Criteria**:
  - [ ] Unit test verifies generated Dockerfile contains `FROM node:22-bookworm-slim`.
  - [ ] Unit test verifies generated Dockerfile creates non-root `codecapsule` user.
  - [ ] Unit test verifies generated Dockerfile contains no auth/config copy instructions.
  - [ ] `docker build -f .codecapsule/Dockerfile.opencode .` succeeds after init on a machine with Docker.

  **QA Scenarios**:
  ```
  Scenario: Dockerfile is generated safely
    Tool: Bash
    Steps: Run init in temp project, then inspect `.codecapsule/Dockerfile.opencode`.
    Expected: File uses Debian Node base, non-root user, tini, no secret COPY.
    Evidence: .sisyphus/evidence/task-4-dockerfile.txt

  Scenario: Docker build validates base image
    Tool: Bash
    Steps: Run `docker build -f .codecapsule/Dockerfile.opencode -t codecapsule-opencode:test .`.
    Expected: Exit code 0 or, if Docker unavailable, `doctor` reports Docker unavailable and test records skip reason.
    Evidence: .sisyphus/evidence/task-4-docker-build.txt
  ```

  **Commit**: NO | Message: `feat(docker): generate opencode dockerfile` | Files: [src/docker/, test/]

- [x] 5. Implement `init` and `doctor` Commands

  **What to do**: Implement CLI with Commander or equivalent. `codecapsule init --tool opencode --yes` must create `.codecapsule/`, profile, local config, Dockerfile, and `.codecapsule/.gitignore`. Interactive `init` should default to OpenCode and ask import categories only when not `--yes`; all imports default false. Existing generated files cause a clear failure unless `--force` is passed. `doctor` validates Node version, Docker CLI availability, profile schema, generated Dockerfile existence, and security policy.
  **Must NOT do**: Do not build or launch containers inside `init` unless a future explicit `--build` flag is added; v1 init only generates files.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: CLI UX and validation affect user safety.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`frontend-ui-ux`] - Terminal CLI only.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [8,9,10] | Blocked By: [1,2,3,4]

  **References**:
  - Requirements: `.sisyphus/drafts/docker-agent-cli.md:9` - OpenCode only v1.
  - Requirements: `.sisyphus/drafts/docker-agent-cli.md:10` - profile plus Dockerfile output.
  - Metis decision in plan: generated paths under `.codecapsule/`.

  **Acceptance Criteria**:
  - [ ] `node dist/cli.js init --tool opencode --yes` creates all four generated files.
  - [ ] Running init twice without `--force` exits non-zero and does not overwrite files.
  - [ ] `node dist/cli.js doctor` exits 0 for valid generated profile when Docker is available; otherwise exits non-zero with actionable Docker message.
  - [ ] Tests cover init success, overwrite refusal, force overwrite, and doctor profile validation.

  **QA Scenarios**:
  ```
  Scenario: Non-interactive init creates project files
    Tool: Bash
    Steps: In a temp directory, run `node dist/cli.js init --tool opencode --yes`.
    Expected: `.codecapsule/profile.json`, `.codecapsule/local.json`, `.codecapsule/Dockerfile.opencode`, `.codecapsule/.gitignore` exist.
    Evidence: .sisyphus/evidence/task-5-init-files.txt

  Scenario: Init refuses overwrite
    Tool: Bash
    Steps: Run init twice without `--force`.
    Expected: Second command exits non-zero and output includes `--force`.
    Evidence: .sisyphus/evidence/task-5-init-overwrite.txt
  ```

  **Commit**: NO | Message: `feat(cli): add init and doctor commands` | Files: [src/cli/, src/core/, test/]

- [x] 6. Implement Docker Runner and `launch --dry-run`

  **What to do**: Implement Docker command construction and dry-run launch. `codecapsule launch --dry-run` must read profile/local config and print exact `docker run` command without executing it. Command must include `--rm`, `-it`, workspace bind mount from current working directory to `/workspace`, named state/cache volumes only if profile enables them, `--workdir /workspace`, default bridge network, non-root user mapping, env allowlist only, and image name. It must exclude `--privileged`, `/var/run/docker.sock`, host home mounts, SSH agent mounts, and broad env passthrough.
  **Must NOT do**: Do not execute Docker in dry-run. Do not silently pass host env vars except explicit allowlist needed for terminal behavior such as `TERM`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: command construction is core security boundary.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`playwright`] - No browser work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [8,10] | Blocked By: [1,2,3]

  **References**:
  - Security decision: `.sisyphus/drafts/docker-agent-cli.md:23` - workspace-only default.
  - Oracle finding: `.sisyphus/drafts/docker-agent-cli.md:36` - centralized policy, no Docker socket/privileged/home.
  - External: `https://docs.docker.com/reference/cli/docker/container/run/` - Docker run flags.

  **Acceptance Criteria**:
  - [ ] Unit tests assert dry-run command contains `--rm`, `-it`, workspace mount, and workdir.
  - [ ] Unit tests assert dry-run command omits privileged, Docker socket, home mount, SSH agent, and broad env.
  - [ ] `node dist/cli.js launch --dry-run` works after init.
  - [ ] Exit code from dry-run is 0 for valid profile and non-zero for missing profile.

  **QA Scenarios**:
  ```
  Scenario: Dry-run prints safe Docker command
    Tool: Bash
    Steps: Run init, then `node dist/cli.js launch --dry-run`.
    Expected: Output includes `docker run`, `--rm`, `-it`, `/workspace`; excludes `--privileged` and docker.sock.
    Evidence: .sisyphus/evidence/task-6-dry-run-safe.txt

  Scenario: Missing profile fails clearly
    Tool: Bash
    Steps: Run `node dist/cli.js launch --dry-run` in a directory without `.codecapsule/profile.json`.
    Expected: Non-zero exit and message instructing to run `codecapsule init`.
    Evidence: .sisyphus/evidence/task-6-missing-profile.txt
  ```

  **Commit**: NO | Message: `feat(docker): add safe launch dry-run` | Files: [src/docker/, src/cli/, test/]

- [x] 7. Implement Opt-In OpenCode Import Policy

  **What to do**: Implement import configuration without copying secrets into repo. `init` interactive may set import booleans in profile, but non-interactive `--yes` sets all false. Add `codecapsule init --import settings --import skills` support for explicit categories; auth import requires exact `--import auth --confirm-auth-import` to prevent accidental token exposure. Store machine-specific host source paths in `.codecapsule/local.json`, which `.codecapsule/.gitignore` ignores. Launch should mount non-auth import sources read-only into matching container paths. Auth import must never be committed or read-write mounted from host; instead, launch creates/uses the CodeCapsule state volume and performs a one-time copy of the selected auth file into the volume path before starting OpenCode, then emits a warning that future host auth changes require re-running init with auth import or a future refresh command.
  **Must NOT do**: Do not auto-detect and import host OpenCode config. Do not write auth file contents into project files. Do not import entire `~/.config` or `~/.local/share`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: secrets and config persistence are high-risk.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`git-master`] - No commits requested.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [8,9,10] | Blocked By: [1,2,3]

  **References**:
  - Requirements: `.sisyphus/drafts/docker-agent-cli.md:17` - opt-in imports.
  - OpenCode research: `.sisyphus/drafts/docker-agent-cli.md:27` - OpenCode paths.

  **Acceptance Criteria**:
  - [ ] `init --yes` produces all import flags false.
  - [ ] `init --import auth` without `--confirm-auth-import` fails with warning.
  - [ ] Tests assert `.codecapsule/.gitignore` ignores `local.json` and any `imports/` directory.
  - [ ] Dry-run with imports shows only explicitly selected read-only mounts.

  **QA Scenarios**:
  ```
  Scenario: Clean default imports nothing
    Tool: Bash
    Steps: Run `node dist/cli.js init --tool opencode --yes` then inspect profile/local files.
    Expected: All imports false; no host OpenCode paths mounted in dry-run.
    Evidence: .sisyphus/evidence/task-7-clean-imports.txt

  Scenario: Auth import requires explicit confirmation
    Tool: Bash
    Steps: Run `node dist/cli.js init --tool opencode --import auth --yes`.
    Expected: Non-zero exit with message requiring `--confirm-auth-import`.
    Evidence: .sisyphus/evidence/task-7-auth-confirmation.txt
  ```

  **Commit**: NO | Message: `feat(security): add opt-in opencode imports` | Files: [src/core/, src/cli/, test/]

- [x] 8. Implement Real Build and Launch Execution

  **What to do**: Extend `launch` to build the image if missing or when `--build` is passed, then execute Docker interactively. Use child process spawn with stdio inherited, signal forwarding, and exit-code propagation. Ensure terminal flags work with TUI: `-it`, `TERM` pass-through only, working directory `/workspace`, container removed with `--rm`. Add `--no-build` to fail if image is missing. Add clear messages for Docker unavailable, build failure, and OpenCode command missing inside image.
  **Must NOT do**: Do not swallow exit codes. Do not run without TTY unless `--dry-run`. Do not add privileged flags to make TUI work.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: process/TTY behavior needs careful QA.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`playwright`] - CLI/TUI, not browser.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [10] | Blocked By: [4,5,6,7]

  **References**:
  - Requirements: `.sisyphus/drafts/docker-agent-cli.md:7` - launch runs coding agent.
  - Cross-cutting research: `.sisyphus/drafts/docker-agent-cli.md:33` - real TTY required.
  - External: `https://docs.docker.com/reference/cli/docker/container/run/` - Docker run interactive flags.

  **Acceptance Criteria**:
  - [ ] `node dist/cli.js launch --dry-run` remains non-mutating.
  - [ ] `node dist/cli.js launch --build --dry-run` reports build/run plan without executing Docker.
  - [ ] With Docker available, `node dist/cli.js launch --build -- --help` or equivalent safe OpenCode help command exits 0.
  - [ ] Tests verify child exit code is propagated.

  **QA Scenarios**:
  ```
  Scenario: Build and execute safe OpenCode command
    Tool: interactive_bash
    Steps: Run init, then run launch with an OpenCode help/version argument if supported by installed CLI.
    Expected: Docker builds image, command exits 0, container is removed afterwards.
    Evidence: .sisyphus/evidence/task-8-launch-help.txt

  Scenario: Docker unavailable error is actionable
    Tool: Bash
    Steps: Simulate missing Docker binary via PATH override and run `node dist/cli.js launch`.
    Expected: Non-zero exit and message explains Docker CLI is required.
    Evidence: .sisyphus/evidence/task-8-docker-missing.txt
  ```

  **Commit**: NO | Message: `feat(cli): execute safe opencode launch` | Files: [src/docker/, src/cli/, test/]

- [x] 9. Add User-Facing Documentation and UX Polish

  **What to do**: Add README with product framing, supported scope, install/dev commands, `init`, `launch`, `doctor`, `clean`, generated files, security defaults, import model, and explicit out-of-scope future adapters. Add CLI help text and error messages that explain safe defaults. Add `clean` command to remove CodeCapsule-created Docker volumes/images only after confirmation or with `--yes`.
  **Must NOT do**: Do not claim support for tools beyond OpenCode. Do not present auth import as safe by default.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: docs and UX copy.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`frontend-ui-ux`] - No web UI.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [10] | Blocked By: [5,7]

  **References**:
  - Original user concerns: `.sisyphus/drafts/docker-agent-cli.md:8` - name/functionality/MCP/skills/configs.
  - Scope: `.sisyphus/drafts/docker-agent-cli.md:19` - OpenCode first, future adapters later.

  **Acceptance Criteria**:
  - [ ] README explains exactly what CodeCapsule does and does not do.
  - [ ] README documents generated files and whether each should be committed.
  - [ ] README documents import categories and auth warning.
  - [ ] `node dist/cli.js --help`, `init --help`, `launch --help`, `doctor --help`, and `clean --help` are coherent.

  **QA Scenarios**:
  ```
  Scenario: Help text guides first use
    Tool: Bash
    Steps: Run all command help variants and save output.
    Expected: Help includes init/launch/doctor/clean and mentions OpenCode-only v1.
    Evidence: .sisyphus/evidence/task-9-help.txt

  Scenario: README security claims match behavior
    Tool: Bash
    Steps: Compare README security defaults to dry-run command from Task 6.
    Expected: README claims align with actual Docker flags.
    Evidence: .sisyphus/evidence/task-9-docs-security.txt
  ```

  **Commit**: NO | Message: `docs: document codecapsule safe defaults` | Files: [README.md, src/cli/, test/]

- [x] 10. End-to-End QA Hardening

  **What to do**: Add an end-to-end test harness that creates temp directories, runs built CLI commands, verifies generated files, validates dry-run security, and conditionally runs Docker build/launch tests when Docker is available. Add fixtures for invalid profile, missing Dockerfile, unsafe import config, and existing file overwrite. Ensure all evidence commands are reproducible.
  **Must NOT do**: Do not make tests depend on real user OpenCode auth. Do not require networked LLM calls. Do not require browser login.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: integration QA across CLI, filesystem, and Docker.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`playwright`] - No browser UI.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [Final Verification Wave] | Blocked By: [1,2,3,4,5,6,7,8,9]

  **References**:
  - Definition of Done in this plan.
  - Verification Strategy in this plan.

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` passes.
  - [ ] `npm test -- --run` passes.
  - [ ] `npm run build` passes.
  - [ ] E2E harness verifies init → doctor → launch dry-run.
  - [ ] Docker-dependent tests skip with explicit reason when Docker is unavailable.

  **QA Scenarios**:
  ```
  Scenario: Full local smoke test without real auth
    Tool: Bash
    Steps: Run `npm install && npm run build && npm test -- --run`.
    Expected: All tests pass; Docker-dependent tests either pass or skip with reason.
    Evidence: .sisyphus/evidence/task-10-full-test.txt

  Scenario: Security regression test
    Tool: Bash
    Steps: Run E2E dry-run and inspect produced Docker command.
    Expected: Command never contains `--privileged`, docker.sock, host home, SSH agent, or broad env passthrough.
    Evidence: .sisyphus/evidence/task-10-security-regression.txt
  ```

  **Commit**: NO | Message: `test: add codecapsule end-to-end coverage` | Files: [test/, src/]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Do not commit unless the user explicitly asks for a commit.
- If the user later requests commits, create one cohesive commit after all tests and verification pass.
- Suggested future commit message: `feat: add codecapsule opencode docker launcher`.

## Success Criteria
- CodeCapsule can be installed locally from source and run as `codecapsule`.
- `codecapsule init --tool opencode --yes` generates a safe, understandable OpenCode Docker setup.
- `codecapsule launch --dry-run` exposes a safe Docker command with no hidden host access.
- Real launch works in environments with Docker and does not require browser auth or host OpenCode credentials.
- Config/auth/skills/MCP import is explicit, narrow, documented, and disabled by default.
- Tests and QA prove the security defaults are enforced.

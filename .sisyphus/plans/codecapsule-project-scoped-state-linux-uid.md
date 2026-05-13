# CodeCapsule Project-Scoped State/Cache + Linux UID Strategy

## TL;DR
> **Summary**: Update CodeCapsule so each workspace owns its OpenCode state/cache under `.codecapsule/`, while Docker images are built with the host UID/GID and still run as the named `codecapsule` user. This preserves isolation and fixes native Linux bind-mount write permissions without reintroducing the `HOME=/.local` failure.
> **Deliverables**:
> - Project-local state/cache bind mounts: `.codecapsule/state/opencode` and `.codecapsule/cache/opencode`.
> - Host UID/GID Docker build args with robust Dockerfile user/group collision handling.
> - Project/UID-scoped image naming to avoid Docker daemon collisions.
> - Updated init/profile/schema/runner/clean/docs/tests/generated files.
> **Effort**: Short
> **Parallel**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 4 → Task 6

## Context

### Original Request
The user noticed two design problems: state/cache named volumes are global across projects, and the fixed `codecapsule` UID/GID strategy can fail to write host-owned workspace files on native Linux.

### Interview Summary
- Store OpenCode sessions/state per workspace for stronger isolation.
- Prefer `.codecapsule/` local state/cache paths and gitignore them.
- Keep cache project-local by default; shared cache can be a future opt-in.
- Build the container user with host UID/GID so Linux bind mounts are writable.
- Run as named user `codecapsule` so `HOME` and XDG dirs remain valid.

### Metis Review (gaps addressed)
- Image tags must include project and UID/GID scoping so different projects/users do not overwrite `codecapsule/opencode:latest` with incompatible UID builds.
- Dockerfile must handle UID/GID collisions in the base image, especially `node` user/group at 1000.
- `clean` must distinguish state from cache: state may contain sessions/auth and should require explicit `--include-state`; cache can be cleaned with normal confirmation.
- Backward compatibility should either migrate old profiles or fail with an actionable message; default plan will migrate old named-volume profile fields during `init --force`/doctor guidance, not silently at launch.

## Work Objectives

### Core Objective
Make CodeCapsule's Docker runtime isolated per project and writable on native Linux while preserving a real named container user with a writable home directory.

### Deliverables
- Profile model updated from global `stateVolume`/`cacheVolume` semantics to project-local state/cache paths.
- Docker image naming scoped by project slug + UID/GID.
- Docker build passes host UID/GID build args.
- Dockerfile creates/reuses a named `codecapsule` user with host UID/GID and valid `/home/codecapsule`.
- Runner mounts `.codecapsule/state/opencode` and `.codecapsule/cache/opencode` instead of global named volumes.
- `.codecapsule/.gitignore` ignores local state/cache.
- Tests and docs cover Linux UID and project isolation behavior.

### Definition of Done (verifiable conditions with commands)
- `npm run typecheck` passes.
- `npm test -- --run` passes.
- `npm run build` passes.
- `node dist/cli.js init --tool opencode --yes --force` creates `.codecapsule/state/opencode`, `.codecapsule/cache/opencode`, and `.codecapsule/.gitignore` with `state/` and `cache/` ignored.
- `node dist/cli.js launch --dry-run` shows bind mounts from the current project’s `.codecapsule/state/opencode` and `.codecapsule/cache/opencode`, not `codecapsule-opencode-state`/`codecapsule-opencode-cache` named volumes.
- `node dist/cli.js launch --build --dry-run` shows Docker build args for host UID/GID and an image tag scoped to project + UID/GID.

### Must Have
- Project-local state/cache by default.
- State/cache ignored by git.
- Native Linux-compatible workspace writes by building `codecapsule` user with host UID/GID.
- Preserve `HOME=/home/codecapsule` and XDG paths.
- Defensive Dockerfile collision handling for existing UID/GID.
- Safe cleanup behavior: cache removable by default with `--yes`, state only with `--include-state --yes`.

### Must NOT Have
- Do not share OpenCode state across projects by default.
- Do not mount host home.
- Do not run as a bare numeric UID without a passwd/home entry.
- Do not delete sessions/auth state through `clean --yes` alone.
- Do not add multi-agent support.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after with existing Vitest suite.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 profile/schema/path model, Task 2 Dockerfile UID/GID strategy, Task 3 gitignore/init local dirs.
Wave 2: Task 4 runner/build/image tagging, Task 5 clean/docs migration UX, Task 6 E2E/manual QA.

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 3, 4, 5, 6.
- Task 2 blocks Tasks 4 and 6.
- Task 3 blocks Tasks 4, 5, 6.
- Task 4 blocks Task 6.
- Task 5 blocks Task 6.
- Task 6 blocks Final Verification Wave.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → unspecified-high.
- Wave 2 → 3 tasks → unspecified-high / writing.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Replace Global Volume Semantics with Project-Local State/Cache Paths

  **What to do**: Update `src/core/types.ts` and `src/core/schemas.ts` so profile/local config explicitly represents project-local state/cache paths. Keep backward parsing for old `stateVolume`/`cacheVolume` only if needed for migration tests, but new init output must use `.codecapsule/state/opencode` and `.codecapsule/cache/opencode` semantics. Recommended field names: `statePath: ".codecapsule/state/opencode"`, `cachePath: ".codecapsule/cache/opencode"`; remove use of global named volume defaults in new profiles.
  **Must NOT do**: Do not keep `codecapsule-opencode-state` or `codecapsule-opencode-cache` as new defaults.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: central profile contract change.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`frontend-ui-ux`] - No UI.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [3,4,5,6] | Blocked By: []

  **References**:
  - Current type: `src/core/types.ts:21` - profile fields.
  - Current schema: `src/core/schemas.ts:60` - profile validation.
  - Current init defaults: `src/commands/init.ts:38` - creates profile.

  **Acceptance Criteria**:
  - [ ] New default profile uses project-local state/cache paths.
  - [ ] Unit tests reject accidental global named-volume defaults in new init output.
  - [ ] Existing validation still provides an actionable error or migration path for old profiles.

  **QA Scenarios**:
  ```
  Scenario: New profile stores project-local paths
    Tool: Bash
    Steps: Run `npm test -- --run test/core/schemas.test.ts test/commands/init.test.ts`.
    Expected: Tests confirm `.codecapsule/state/opencode` and `.codecapsule/cache/opencode` defaults.
    Evidence: .sisyphus/evidence/task-1-profile-state-cache.txt

  Scenario: Old named-volume defaults are not emitted
    Tool: Bash
    Steps: Generate profile in temp dir and inspect `.codecapsule/profile.json`.
    Expected: No `codecapsule-opencode-state` or `codecapsule-opencode-cache` strings.
    Evidence: .sisyphus/evidence/task-1-no-global-volumes.txt
  ```

  **Commit**: NO | Message: `fix(profile): scope opencode state to project` | Files: [src/core/types.ts, src/core/schemas.ts, test/core/, test/fixtures/]

- [x] 2. Make Dockerfile User Creation Host-UID Compatible and Collision-Safe

  **What to do**: Update `src/docker/dockerfile.ts` so generated Dockerfile accepts `ARG USER_ID` and `ARG GROUP_ID`, defaults to high safe values for generated file readability, but robustly handles existing UID/GID in the base image. Required behavior: if group with GID exists, reuse it or rename/create `codecapsule` group safely; if user with UID exists, reuse/rename/configure it as `codecapsule`; ensure `/home/codecapsule` exists, passwd entry points there, shell is usable, and ownership is assigned to final UID/GID. Preserve `HOME` and XDG env vars after OpenCode install.
  **Must NOT do**: Do not use bare numeric runtime users. Do not assume UID/GID 1000 is free.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Docker/Linux permission correctness.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`playwright`] - No browser.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [4,6] | Blocked By: []

  **References**:
  - Current generator: `src/docker/dockerfile.ts:15` - USER_ID/GROUP_ID args.
  - Current tests: `test/docker/dockerfile.test.ts:38` - user creation expectations.

  **Acceptance Criteria**:
  - [ ] Dockerfile tests cover GID/UID collision-safe shell logic.
  - [ ] Generated Dockerfile includes `HOME` and XDG envs.
  - [ ] Generated Dockerfile creates writable `/home/codecapsule` and OpenCode data/cache dirs.

  **QA Scenarios**:
  ```
  Scenario: Dockerfile handles existing UID/GID
    Tool: Bash
    Steps: Run Dockerfile unit tests checking collision-safe commands.
    Expected: Tests assert no direct fragile `groupadd -g ${GROUP_ID} codecapsule && useradd ...` without guards.
    Evidence: .sisyphus/evidence/task-2-dockerfile-user.txt

  Scenario: Image builds with host UID/GID args
    Tool: Bash
    Steps: Run `docker build --build-arg USER_ID=$(id -u) --build-arg GROUP_ID=$(id -g) -f .codecapsule/Dockerfile.opencode -t codecapsule-test .` when Docker is available.
    Expected: Build succeeds or test records Docker-unavailable skip reason.
    Evidence: .sisyphus/evidence/task-2-docker-build-uid.txt
  ```

  **Commit**: NO | Message: `fix(docker): build codecapsule user with host ids` | Files: [src/docker/dockerfile.ts, test/docker/dockerfile.test.ts]

- [x] 3. Update Init Generation and Gitignore for Local State/Cache Directories

  **What to do**: Update `src/commands/init.ts` and `src/core/import.ts` so init creates `.codecapsule/state/opencode` and `.codecapsule/cache/opencode` directories. Update generated `.codecapsule/.gitignore` to include `local.json`, `imports/`, `state/`, `cache/`, `tmp/`, and `logs/`. If current repo has generated `.codecapsule/Dockerfile.opencode`/profile files, regenerate or update them to match the new defaults.
  **Must NOT do**: Do not commit generated state/cache contents. Do not delete existing state.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: generated project files and safety.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`git-master`] - No commit requested.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [4,5,6] | Blocked By: [1]

  **References**:
  - Current gitignore generator: `src/core/import.ts:73`.
  - Current init writes generated files: `src/commands/init.ts:63`.

  **Acceptance Criteria**:
  - [ ] `init --yes --force` creates state/cache directories.
  - [ ] `.codecapsule/.gitignore` ignores state/cache/tmp/logs.
  - [ ] Tests verify directories exist and are ignored.

  **QA Scenarios**:
  ```
  Scenario: Init creates ignored local runtime dirs
    Tool: Bash
    Steps: Run init in temp dir; inspect `.codecapsule/` tree and `.codecapsule/.gitignore`.
    Expected: state/cache dirs exist and gitignore contains required entries.
    Evidence: .sisyphus/evidence/task-3-init-local-dirs.txt

  Scenario: Re-init force preserves ignored policy
    Tool: Bash
    Steps: Run init twice with `--force`.
    Expected: Gitignore still contains state/cache/tmp/logs and no state deletion occurs.
    Evidence: .sisyphus/evidence/task-3-force-init.txt
  ```

  **Commit**: NO | Message: `fix(init): generate project local runtime dirs` | Files: [src/commands/init.ts, src/core/import.ts, test/commands/init.test.ts]

- [x] 4. Update Runner Build/Launch for Project-Scoped Mounts and Host UID/GID Build Args

  **What to do**: Update `src/docker/runner.ts` so `buildDockerImage` passes `--build-arg USER_ID=<host uid>` and `--build-arg GROUP_ID=<host gid>`. Image name must be project/UID scoped, e.g. `codecapsule/opencode:<project-slug>-uid<uid>-gid<gid>` or an equivalent deterministic safe tag from project path + uid/gid. `buildDockerCommand` must mount absolute project paths: `<cwd>/.codecapsule/state/opencode:/home/codecapsule/.local/share/opencode` and `<cwd>/.codecapsule/cache/opencode:/home/codecapsule/.cache/opencode`, not named volumes. Continue `--user codecapsule` and `HOME`/XDG envs.
  **Must NOT do**: Do not mount global named volumes. Do not use unscoped `codecapsule/opencode:latest` for host-UID-built images.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: runtime correctness and Docker behavior.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`playwright`] - No browser.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [6] | Blocked By: [1,2,3]

  **References**:
  - Current build command: `src/docker/runner.ts:23`.
  - Current mount logic: `src/docker/runner.ts:69`.
  - Current dry-run tests: `test/docker/runner.test.ts:32`.

  **Acceptance Criteria**:
  - [ ] Dry-run shows project-local state/cache bind mounts.
  - [ ] Dry-run/build-plan shows UID/GID build args.
  - [ ] Tests verify image tag includes project scope and UID/GID.
  - [ ] Pass-through args still produce `opencode --help`.

  **QA Scenarios**:
  ```
  Scenario: Dry-run uses project-local state/cache
    Tool: Bash
    Steps: Run `node dist/cli.js launch --dry-run -- --help` after init.
    Expected: Command contains `.codecapsule/state/opencode` and `.codecapsule/cache/opencode`, no `codecapsule-opencode-state` named volume.
    Evidence: .sisyphus/evidence/task-4-dry-run-project-state.txt

  Scenario: Build uses host UID/GID args
    Tool: Bash
    Steps: Run `node dist/cli.js launch --build --dry-run -- --help`.
    Expected: Output contains `--build-arg USER_ID=` and `--build-arg GROUP_ID=` for current host values.
    Evidence: .sisyphus/evidence/task-4-build-args.txt
  ```

  **Commit**: NO | Message: `fix(runtime): mount project state and build with host ids` | Files: [src/docker/runner.ts, src/commands/launch.ts, test/docker/runner.test.ts, test/commands/launch.test.ts]

- [x] 5. Update Clean Command, Docs, and Migration UX

  **What to do**: Update `src/commands/clean.ts` and README. `clean --yes` should remove image and cache by default, but must not delete `.codecapsule/state/` unless `--include-state` is passed. Add `--include-cache` only if needed; default can include cache because it is disposable. If old named volumes are detected in profile or Docker daemon, print a migration note but do not delete old state automatically. README must explain project-local state/cache, Linux UID/GID build behavior, and cleanup safety.
  **Must NOT do**: Do not silently delete sessions/auth state. Do not claim shared cache is supported unless implemented.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: docs + UX copy.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`frontend-ui-ux`] - No visual UI.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [6] | Blocked By: [1,3]

  **References**:
  - Current clean command: `src/commands/clean.ts`.
  - Current README: `README.md`.

  **Acceptance Criteria**:
  - [ ] `clean --yes` does not remove `.codecapsule/state`.
  - [ ] `clean --yes --include-state` removes state after explicit flag.
  - [ ] README documents state/cache isolation and Linux UID/GID strategy.

  **QA Scenarios**:
  ```
  Scenario: Clean preserves state by default
    Tool: Bash
    Steps: Create marker file in `.codecapsule/state/opencode`; run clean --yes.
    Expected: Marker remains; cache/image cleanup attempted safely.
    Evidence: .sisyphus/evidence/task-5-clean-preserves-state.txt

  Scenario: Explicit state cleanup removes state
    Tool: Bash
    Steps: Run clean --yes --include-state in temp project with marker state.
    Expected: State directory removed; command output warns state was deleted.
    Evidence: .sisyphus/evidence/task-5-clean-include-state.txt
  ```

  **Commit**: NO | Message: `docs: explain project state isolation` | Files: [src/commands/clean.ts, README.md, test/commands/clean.test.ts]

- [x] 6. End-to-End Docker and Cross-Platform QA

  **What to do**: Add/adjust E2E tests and run manual QA. Verify the full path: init → build dry-run → real Docker build if available → `launch --no-build -- --help` in a TTY-capable test where possible. On non-TTY CI, test dry-run and document TTY skip. Ensure native Linux compatibility is represented by command/build-arg assertions even if running on macOS.
  **Must NOT do**: Do not require real OpenCode auth. Do not call networked LLM APIs.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: integration QA across Docker, filesystem, and CLI.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`playwright`] - No browser.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [Final Verification Wave] | Blocked By: [1,2,3,4,5]

  **References**:
  - Existing E2E: `test/e2e/workflow.test.ts`.
  - User-reported failure: GID 1000 collision and `EACCES: permission denied, mkdir '/.local'`.

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` passes.
  - [ ] `npm test -- --run` passes.
  - [ ] `npm run build` passes.
  - [ ] Docker smoke test records either `opencode --help` success or explicit Docker/TTY skip reason.
  - [ ] Dry-run no longer contains global named state/cache volumes.

  **QA Scenarios**:
  ```
  Scenario: Full dry-run workflow proves isolation
    Tool: Bash
    Steps: Run init, build dry-run, launch dry-run with `-- --help`.
    Expected: Output has project-local state/cache, host UID/GID build args, named user `codecapsule`, and `opencode --help`.
    Evidence: .sisyphus/evidence/task-6-full-dry-run.txt

  Scenario: Real Docker TTY smoke
    Tool: interactive_bash
    Steps: Run `npm start -- launch --build -- --help` in a tmux-backed shell when Docker is available.
    Expected: OpenCode help exits 0 with no GID collision and no `/.local` EACCES.
    Evidence: .sisyphus/evidence/task-6-docker-smoke.txt
  ```

  **Commit**: NO | Message: `test: cover project local docker runtime` | Files: [test/e2e/workflow.test.ts, test/docker/, .sisyphus/evidence/]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Do not commit unless the user explicitly asks.
- Suggested future commit message: `fix: isolate opencode state per project`.

## Success Criteria
- Workspace A and Workspace B no longer share OpenCode state by default.
- Native Linux users can write project files through Docker because the image user is built with host UID/GID.
- OpenCode/Bun has a valid writable `/home/codecapsule` and no `/.local` EACCES.
- State/cache are local, inspectable, and gitignored under `.codecapsule/`.

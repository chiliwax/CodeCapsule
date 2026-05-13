# Capsule CLI Alias

## TL;DR
> **Summary**: Make `capsule` the preferred user-facing CLI command while preserving `codecapsule` as the package/project name and backwards-compatible binary alias.
> **Deliverables**:
> - `package.json` exposes both `capsule` and `codecapsule` bins.
> - CLI help displays `capsule` as the primary command.
> - README and AGENTS usage examples prefer `capsule` while noting `codecapsule` remains an alias.
> - Tests verify both command names and prevent accidental product/internal renames.
> **Effort**: Quick
> **Parallel**: YES - 1 wave
> **Critical Path**: Task 1 → Task 3

## Context
### Original Request
User said the project name should stay `codecapsule`, but usage should prefer the shorter `capsule` command because it is easier to remember.

### Interview Summary
- User selected: add `capsule` and keep `codecapsule`.
- `codecapsule` remains project/package name.
- `capsule` becomes the preferred command in help and docs.

### Metis Review (gaps addressed)
- Guardrail: do not globally replace every `codecapsule` string; many occurrences are package name, Docker namespace, `.codecapsule/` state directory, fixtures, or product branding.
- Guardrail: `npx codecapsule` may still be the correct package execution form because package name remains `codecapsule`; docs should distinguish installed binary usage from package-name execution.
- Acceptance criteria must verify both aliases and help output.

## Work Objectives
### Core Objective
Expose `capsule` as the primary CLI command without breaking existing `codecapsule` usage or renaming internal project resources.

### Deliverables
- Add `capsule` bin alias in package metadata.
- Keep `codecapsule` bin alias.
- Change Commander `.name()` to `capsule`.
- Update docs/instructions examples to prefer `capsule`.
- Update tests and lockfile if npm metadata changes it.

### Definition of Done (verifiable conditions with commands)
- `npm run typecheck` passes.
- `npm test -- --run` passes.
- `npm run build` passes.
- `node dist/cli.js --help` shows `Usage: capsule`.
- Package metadata contains both `bin.capsule` and `bin.codecapsule` pointing to `dist/cli.js`.

### Must Have
- Preserve package name `codecapsule`.
- Preserve `.codecapsule/` directory name.
- Preserve Docker image namespace/tag behavior (`codecapsule/opencode:...`).
- Preserve existing `codecapsule` binary compatibility.
- Prefer `capsule` in user-facing command examples.

### Must NOT Have
- Do not rename the npm package from `codecapsule` to `capsule`.
- Do not rename internal state paths from `.codecapsule/`.
- Do not rename Docker image names or generated Dockerfile comments unless directly necessary for CLI help/docs.
- Do not do blind global search/replace of `codecapsule`.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after with existing Vitest suite.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 package/CLI alias, Task 2 docs/examples, Task 3 tests/verification.

### Dependency Matrix (full, all tasks)
- Task 1 blocks Task 3.
- Task 2 can run after Task 1 decisions are known; it does not block Task 3 except documentation assertions.
- Task 3 blocks Final Verification Wave.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → quick / writing / unspecified-high.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add `capsule` Binary Alias and CLI Help Name

  **What to do**: Update `package.json` so `bin` exposes both `capsule` and `codecapsule`, each pointing to `dist/cli.js`. Update `src/cli.ts` so Commander uses `.name('capsule')`. If package metadata changes require `package-lock.json` updates, update lockfile through npm-safe metadata regeneration only.
  **Must NOT do**: Do not rename `package.json.name`, `.codecapsule/`, Docker image names, profile fields, or generated state/cache/config paths.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: small metadata and CLI help change.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`frontend-ui-ux`] - No UI.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [3] | Blocked By: []

  **References**:
  - Package bin: `package.json:6` - currently exposes only `codecapsule`.
  - CLI display name: `src/cli.ts:14` - currently `.name('codecapsule')`.
  - Existing tests: `test/cli.test.ts` - verify CLI help/name behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `node -e "const p=require('./package.json'); if (p.name !== 'codecapsule') process.exit(1); if (p.bin.capsule !== 'dist/cli.js') process.exit(2); if (p.bin.codecapsule !== 'dist/cli.js') process.exit(3);"` exits 0.
  - [ ] `npm run build` exits 0.
  - [ ] `node dist/cli.js --help` contains `Usage: capsule`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Preferred command appears in help
    Tool: Bash
    Steps: Run `npm run build`; run `node dist/cli.js --help`.
    Expected: Output contains `Usage: capsule`; package name remains `codecapsule`.
    Evidence: .sisyphus/evidence/task-1-capsule-alias.txt

  Scenario: Legacy alias remains available in metadata
    Tool: Bash
    Steps: Run `node -e "const p=require('./package.json'); console.log(p.name, p.bin)"`.
    Expected: `p.name` is `codecapsule`; `p.bin` contains both `capsule` and `codecapsule` mapped to `dist/cli.js`.
    Evidence: .sisyphus/evidence/task-1-capsule-alias-metadata.txt
  ```

  **Commit**: YES | Message: `feat(cli): add capsule command alias` | Files: [package.json, package-lock.json, src/cli.ts, test/cli.test.ts]

- [x] 2. Update User-Facing Docs to Prefer `capsule`

  **What to do**: Update README command examples and AGENTS quick commands to use `capsule` as the preferred installed command. Add one concise note that `codecapsule` remains an alias and that `npx codecapsule ...` may still be used when executing by package name.
  **Must NOT do**: Do not replace product name headings like `# CodeCapsule`, package references, `.codecapsule/` directory references, or Docker image namespace references.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: docs need precise wording and no overbroad rename.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`frontend-ui-ux`] - No UI.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [] | Blocked By: []

  **References**:
  - README usage: `README.md:19` - current command examples.
  - Agent instructions: `AGENTS.md:5` - quick commands for future agents.
  - Package identity: `package.json:2` - package name remains `codecapsule`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `README.md` usage examples prefer `capsule` for installed CLI usage.
  - [ ] `AGENTS.md` quick commands prefer `capsule` or explicitly state when using `node dist/cli.js`.
  - [ ] `README.md` still contains `# CodeCapsule` and `.codecapsule/` references where describing project/state paths.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Docs prefer capsule command
    Tool: Bash
    Steps: Run a content search for command examples in README.md and AGENTS.md.
    Expected: Installed CLI examples use `capsule`; docs include a note that `codecapsule` remains an alias.
    Evidence: .sisyphus/evidence/task-2-capsule-docs.txt

  Scenario: Internal names remain unchanged
    Tool: Bash
    Steps: Search README.md for `# CodeCapsule`, `.codecapsule/`, and `codecapsule` alias note.
    Expected: Product/project/state names remain documented accurately; no broad rename to `.capsule/`.
    Evidence: .sisyphus/evidence/task-2-capsule-docs-guardrail.txt
  ```

  **Commit**: YES | Message: `docs: prefer capsule command examples` | Files: [README.md, AGENTS.md]

- [x] 3. Update Tests and Run Full Verification

  **What to do**: Update tests that assert CLI help output, package bin metadata, README examples, or exact command strings. Add regression coverage that `capsule` is primary and `codecapsule` is retained as an alias. Run typecheck, test, and build.
  **Must NOT do**: Do not weaken tests by removing assertions around package name, state paths, Docker image names, or safety guardrails.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: requires checking all command/help/docs tests and preventing accidental over-renames.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`frontend-ui-ux`] - No UI.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [Final Verification Wave] | Blocked By: [1]

  **References**:
  - Test config: `vitest.config.ts:3` - tests are `test/**/*.test.ts`.
  - CLI tests: `test/cli.test.ts` - likely help/name assertions.
  - E2E workflow tests: `test/e2e/workflow.test.ts` - command output expectations.
  - Runner tests: `test/docker/runner.test.ts` - Docker image namespace must remain `codecapsule/opencode`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm run typecheck` exits 0.
  - [ ] `npm test -- --run` exits 0.
  - [ ] `npm run build` exits 0.
  - [ ] Tests assert `package.json.name === 'codecapsule'` and both bin aliases exist.
  - [ ] Tests or snapshots verify help output uses `capsule`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full regression suite passes
    Tool: Bash
    Steps: Run `npm run typecheck`, `npm test -- --run`, and `npm run build`.
    Expected: All commands exit 0; no failing tests.
    Evidence: .sisyphus/evidence/task-3-capsule-tests.txt

  Scenario: No accidental internal rename
    Tool: Bash
    Steps: Verify package name, `.codecapsule/` strings, and Docker image namespace remain `codecapsule` where expected.
    Expected: `codecapsule` remains in package name, state directory references, Docker image names; only user-facing command examples/help prefer `capsule`.
    Evidence: .sisyphus/evidence/task-3-capsule-guardrail.txt
  ```

  **Commit**: YES | Message: `test: cover capsule cli alias` | Files: [test/cli.test.ts, test/**]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Prefer 2-3 small commits if user requests commits:
  1. `feat(cli): add capsule command alias`
  2. `docs: prefer capsule command examples`
  3. `test: cover capsule cli alias` (can be folded into commit 1 if tests are small)
- Do not commit unless the user explicitly asks.

## Success Criteria
- Users can remember and type `capsule` as the primary command.
- Existing `codecapsule` command still works.
- Project/package name and internal state directory remain `codecapsule` / `.codecapsule`.
- Full verification passes without weakening existing Docker/security behavior.

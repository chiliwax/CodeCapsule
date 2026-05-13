## Final fixes verification - 2026-05-12

- Existing tests had stale expectations for `~` container paths and `.gitignore` contents after the reviewer-required behavior changes; updated tests to assert the new requirements.

## 2026-05-12 Final Manual QA Round 2

- REJECT: `node dist/cli.js --help` printed command help but exited 1 and emitted `Error: (outputHelp)`.
- REJECT: initialized temp-dir happy path passed for `init --tool opencode --yes`, `doctor`, and `launch --dry-run` with exit 0.
- PASS: duplicate init without `--force` exited 1 with a friendly overwrite refusal and no stack trace.
- PASS: `init --tool opencode --yes --force` exited 0.
- PASS: `launch --dry-run` without init exited 1 with remediation: run `codecapsule init --tool opencode --yes` first.
- REJECT: `clean --yes` exited 1 after reporting failed removal for CodeCapsule volumes/image, likely when resources are absent.

## 2026-05-12 Final quality review round 2
- Verification passed: LSP diagnostics on src reported 0 diagnostics across 14 files; npm run typecheck exited 0; npm test passed 53/53 across 12 files; npm run build exited 0.
- Review concern: critical security regressions lack direct tests for allowHostHomeMount, allowSshAgent, and invalid opencodeVersion rejection.
- 2026-05-12 final compliance audit: `node dist/cli.js --help`, `npm run typecheck`, `npm test -- --run`, `npm run build`, `lsp_diagnostics src`, `doctor`, and normal `launch --dry-run` passed. Remaining blockers: launch extra args are rejected as too many arguments; auth import is host read-only mounted instead of copied into state volume.

## Task 4 runner local mounts - 2026-05-13

- Verification passed with existing Vitest hoist warnings for nested `vi.unmock("node:child_process")` in launch/doctor/clean tests; these warnings predate this task and are captured in test evidence.

## Task 6 E2E QA - 2026-05-13

- Verification passed with the same existing Vitest nested `vi.unmock("node:child_process")` hoist warnings in launch/doctor/clean tests; not a blocker for this task.

## 2026-05-13 Vitest warning during final QA

- `npm test` passed, but Vitest warned that nested `vi.unmock("node:child_process")` calls in `test/commands/doctor.test.ts`, `test/commands/clean.test.ts`, and `test/commands/launch.test.ts` are hoisted today and may become errors in a future Vitest version.

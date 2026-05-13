## Learnings

- The project package name stays `codecapsule`; only the Commander display name changes to `capsule`.
- `package.json` can expose both `capsule` and `codecapsule` as bin aliases without touching `.codecapsule/` paths or Docker naming.
- Verifying the built binary with `node dist/cli.js --help` is the fastest way to confirm Commander’s display name change.
- Docs updated: README.md and AGENTS.md now show `capsule` as the preferred CLI name, with a note that `codecapsule` remains a backwards-compatible alias. Product headings, `.codecapsule/` paths, and Docker image namespace were left untouched.

- Task 3 verification:  suite label now says ; typecheck, build, and all tests pass while package name,  paths, and  references remain unchanged.

- Task 3 verification: test/cli.test.ts suite label now says capsule cli; typecheck, build, and all tests pass while package name, .codecapsule/ paths, and codecapsule/opencode references remain unchanged.
- Correction: ignore the preceding malformed Task 3 learning line created by a shell quoting retry; the following complete Task 3 learning is the authoritative entry.

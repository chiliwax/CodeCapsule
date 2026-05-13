## Task 5 init/doctor verification

- `npm run typecheck` passed.
- `npm test -- --run` passed: 8 test files, 30 tests.
- `npm run build` passed.
- `node dist/cli.js --help` showed `init`, `doctor`, `launch`, and `clean` commands.
- Manual init QA in `/tmp/codecapsule-manual-CQBJFz` created `.codecapsule/.gitignore`, `Dockerfile.opencode`, `local.json`, and `profile.json`.
- Manual doctor QA in `/tmp/codecapsule-manual-CQBJFz` passed Node, Docker CLI, profile schema, safe security policy, and Dockerfile checks.

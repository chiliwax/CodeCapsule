## Final fixes verification - 2026-05-12

- Dockerfile generation rejects unsafe `opencodeVersion` values before interpolation, accepting only `latest` or strict `x.y.z` semver.
- CLI top-level parsing now uses `exitOverride()` plus a catch boundary to print concise `Error: ...` messages instead of stack traces.

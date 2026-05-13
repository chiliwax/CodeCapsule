Task 5: Update clean command to distinguish state from cache, and update README for migration UX

Files modified:
- src/commands/clean.ts
- README.md
- test/commands/clean.test.ts

Changes summary:
1. Added --include-state flag to clean command
2. clean --yes now removes cache and image only, preserving state by default
3. clean --yes --include-state removes state, cache, and image
4. Updated output messages to clarify which resources are being removed
5. Updated README with:
   - Project-Local State and Cache isolation section
   - Linux UID/GID Build Behavior section
   - Cleanup Safety section
   - Updated usage examples and command descriptions
6. Updated tests:
   - Existing test now verifies state is preserved by default
   - New test verifies --include-state removes state

Verification results:
- npm run typecheck: PASSED (no errors)
- npm test -- --run: PASSED (12 test files, 62 tests)

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'codecapsule-doctor-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  vi.resetModules();
  vi.unmock('node:child_process');
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('runDoctor', () => {
  test('validates a generated setup', async () => {
    vi.doMock('node:child_process', () => ({
      execFileSync: () => 'Docker version 27.0.0, build test\n'
    }));
    const [{ runInit }, { runDoctor }] = await Promise.all([
      import('../../src/commands/init.js'),
      import('../../src/commands/doctor.js')
    ]);
    const cwd = createTempDir();
    runInit({ tool: 'opencode', yes: true }, cwd);

    const result = runDoctor(cwd);

    expect(result.ok).toBe(true);
    expect(result.checks).toContain('ok: .codecapsule/profile.json is valid');
    expect(result.checks).toContain('ok: .codecapsule/Dockerfile.opencode exists');
    expect(result.checks.some((check) => check.includes('security policy privileged=false, dockerSocket=false'))).toBe(true);
  });

  test('reports missing generated files', async () => {
    vi.doMock('node:child_process', () => ({
      execFileSync: () => 'Docker version 27.0.0, build test\n'
    }));
    const { runDoctor } = await import('../../src/commands/doctor.js');

    const result = runDoctor(createTempDir());

    expect(result.ok).toBe(false);
    expect(result.checks).toContain('fail: .codecapsule/profile.json missing');
    expect(result.checks).toContain('fail: .codecapsule/Dockerfile.opencode missing');
  });
});

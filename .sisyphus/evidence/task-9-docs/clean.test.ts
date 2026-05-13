import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'codecapsule-clean-'));
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

describe('runClean', () => {
  test('requires --yes flag', async () => {
    const { runClean } = await import('../../src/commands/clean.js');

    expect(() => runClean({}, createTempDir())).toThrow('Interactive clean is not available yet. Re-run with --yes.');
  });

  test('requires profile.json to exist', async () => {
    const { runClean } = await import('../../src/commands/clean.js');

    expect(() => runClean({ yes: true }, createTempDir())).toThrow(
      'Missing .codecapsule/profile.json. Run `codecapsule init --tool opencode --yes` first.'
    );
  });

  test('removes volumes and image when profile exists', async () => {
    const execCalls: string[][] = [];
    vi.doMock('node:child_process', () => ({
      execFileSync: (...args: string[]) => {
        execCalls.push(args);
        return '';
      }
    }));

    const [{ runInit }, { runClean }] = await Promise.all([
      import('../../src/commands/init.js'),
      import('../../src/commands/clean.js')
    ]);
    const cwd = createTempDir();
    runInit({ tool: 'opencode', yes: true }, cwd);

    const result = runClean({ yes: true }, cwd);

    expect(result.code).toBe(0);
    expect(result.removed).toContain('volume:codecapsule-opencode-state');
    expect(result.removed).toContain('volume:codecapsule-opencode-cache');
    expect(result.removed).toContain('image:codecapsule/opencode:latest');
    expect(result.errors).toEqual([]);

    const volumeCalls = execCalls.filter((call) => call[0] === 'docker' && call[1][0] === 'volume');
    const imageCalls = execCalls.filter((call) => call[0] === 'docker' && call[1][0] === 'image');
    expect(volumeCalls.length).toBe(2);
    expect(imageCalls.length).toBe(1);
  });

  test('reports errors when docker commands fail', async () => {
    vi.doMock('node:child_process', () => ({
      execFileSync: () => {
        const error = new Error('docker failed');
        throw error;
      }
    }));

    const [{ runInit }, { runClean }] = await Promise.all([
      import('../../src/commands/init.js'),
      import('../../src/commands/clean.js')
    ]);
    const cwd = createTempDir();
    runInit({ tool: 'opencode', yes: true }, cwd);

    const result = runClean({ yes: true }, cwd);

    expect(result.code).toBe(1);
    expect(result.removed).toEqual([]);
    expect(result.errors.length).toBe(3);
    expect(result.errors[0]).toBe('Failed to remove volume: codecapsule-opencode-state');
    expect(result.errors[1]).toBe('Failed to remove volume: codecapsule-opencode-cache');
    expect(result.errors[2]).toBe('Failed to remove image: codecapsule/opencode:latest');
  });
});

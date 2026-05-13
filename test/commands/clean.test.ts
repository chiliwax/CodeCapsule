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

  test('exits successfully when no profile exists', async () => {
    const { runClean } = await import('../../src/commands/clean.js');

    const result = runClean({ yes: true }, createTempDir());

    expect(result.code).toBe(0);
    expect(result.removed).toEqual([]);
    expect(result.errors).toEqual([]);
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
    expect(volumeCalls.length).toBe(4);
    expect(imageCalls.length).toBe(2);
  });

  test('succeeds when Docker resources are already absent', async () => {
    vi.doMock('node:child_process', () => ({
      execFileSync: () => {
        const error = new Error('No such resource');
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

    expect(result.code).toBe(0);
    expect(result.removed).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test('reports errors when docker commands fail', async () => {
    let callCount = 0;
    vi.doMock('node:child_process', () => ({
      execFileSync: () => {
        callCount += 1;
        if (callCount % 2 === 1) {
          return '';
        }

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

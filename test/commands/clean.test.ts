import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
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

  test('removes local cache path and image but preserves state by default when profile exists', async () => {
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
    mkdirSync(join(cwd, '.codecapsule', 'state', 'opencode'), { recursive: true });
    mkdirSync(join(cwd, '.codecapsule', 'cache', 'opencode'), { recursive: true });

    const result = runClean({ yes: true }, cwd);

    expect(result.code).toBe(0);
    expect(result.removed).not.toContain('path:.codecapsule/state/opencode');
    expect(result.removed).toContain('path:.codecapsule/cache/opencode');
    expect(result.removed).toContain('image:codecapsule/opencode:latest');
    expect(result.errors).toEqual([]);
    expect(existsSync(join(cwd, '.codecapsule', 'state', 'opencode'))).toBe(true);
    expect(existsSync(join(cwd, '.codecapsule', 'cache', 'opencode'))).toBe(false);

    const imageCalls = execCalls.filter((call) => call[0] === 'docker' && call[1][0] === 'image');
    expect(imageCalls.length).toBe(2);
  });

  test('removes state when --include-state is passed', async () => {
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
    mkdirSync(join(cwd, '.codecapsule', 'state', 'opencode'), { recursive: true });
    mkdirSync(join(cwd, '.codecapsule', 'cache', 'opencode'), { recursive: true });

    const result = runClean({ yes: true, includeState: true }, cwd);

    expect(result.code).toBe(0);
    expect(result.removed).toContain('path:.codecapsule/state/opencode');
    expect(result.removed).toContain('path:.codecapsule/cache/opencode');
    expect(result.removed).toContain('image:codecapsule/opencode:latest');
    expect(result.errors).toEqual([]);
    expect(existsSync(join(cwd, '.codecapsule', 'state', 'opencode'))).toBe(false);
    expect(existsSync(join(cwd, '.codecapsule', 'cache', 'opencode'))).toBe(false);

    const imageCalls = execCalls.filter((call) => call[0] === 'docker' && call[1][0] === 'image');
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
    rmSync(join(cwd, '.codecapsule', 'state'), { recursive: true, force: true });
    rmSync(join(cwd, '.codecapsule', 'cache'), { recursive: true, force: true });

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
    rmSync(join(cwd, '.codecapsule', 'state'), { recursive: true, force: true });
    rmSync(join(cwd, '.codecapsule', 'cache'), { recursive: true, force: true });

    const result = runClean({ yes: true }, cwd);

    expect(result.code).toBe(1);
    expect(result.removed).toEqual([]);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toBe('Failed to remove image: codecapsule/opencode:latest');
  });
});

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { runInit } from '../../src/commands/init.js';
import { validateProfile } from '../../src/core/schemas.js';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'codecapsule-init-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('runInit', () => {
  test('creates CodeCapsule files with safe defaults', () => {
    const cwd = createTempDir();

    runInit({ tool: 'opencode', yes: true }, cwd);

    const profile = validateProfile(
      JSON.parse(readFileSync(join(cwd, '.codecapsule', 'profile.json'), 'utf8')) as unknown
    );
    const local = JSON.parse(readFileSync(join(cwd, '.codecapsule', 'local.json'), 'utf8')) as unknown;
    const dockerfile = readFileSync(join(cwd, '.codecapsule', 'Dockerfile.opencode'), 'utf8');
    const gitignore = readFileSync(join(cwd, '.codecapsule', '.gitignore'), 'utf8');

    expect(profile.imports).toEqual({
      settings: false,
      auth: false,
      skills: false,
      plugins: false,
      agents: false,
      commands: false,
      tools: false,
      themes: false
    });
    expect(profile.security.allowPrivileged).toBe(false);
    expect(profile.security.allowDockerSocket).toBe(false);
    expect(local).toEqual({ hostSourcePaths: {} });
    expect(dockerfile).toContain('FROM node:22-bookworm-slim');
    expect(gitignore).toContain('local.json\n');
    expect(gitignore).toContain('imports/\n');
  });

  test('refuses to overwrite existing files without force', () => {
    const cwd = createTempDir();
    runInit({ tool: 'opencode', yes: true }, cwd);

    expect(() => runInit({ tool: 'opencode', yes: true }, cwd)).toThrow('Refusing to overwrite');
  });

  test('overwrites existing files with force', () => {
    const cwd = createTempDir();
    runInit({ tool: 'opencode', yes: true }, cwd);
    writeFileSync(join(cwd, '.codecapsule', 'local.json'), '{"stale":true}\n', 'utf8');

    runInit({ tool: 'opencode', yes: true, force: true }, cwd);

    expect(JSON.parse(readFileSync(join(cwd, '.codecapsule', 'local.json'), 'utf8'))).toEqual({ hostSourcePaths: {} });
  });

  test('enables requested imports and requires auth confirmation', () => {
    const cwd = createTempDir();

    runInit({ tool: 'opencode', yes: true, import: ['settings', 'skills'] }, cwd);

    const profile = validateProfile(
      JSON.parse(readFileSync(join(cwd, '.codecapsule', 'profile.json'), 'utf8')) as unknown
    );
    expect(profile.imports.settings).toBe(true);
    expect(profile.imports.skills).toBe(true);
    expect(profile.imports.auth).toBe(false);

    expect(JSON.parse(readFileSync(join(cwd, '.codecapsule', 'local.json'), 'utf8'))).toEqual({
      hostSourcePaths: {
        settings: '~/.config/opencode/opencode.json',
        skills: '~/.config/opencode/skills/'
      }
    });

    expect(() => runInit({ tool: 'opencode', yes: true, import: ['auth'] }, createTempDir())).toThrow(
      'Auth import requires --confirm-auth-import'
    );
  });
});

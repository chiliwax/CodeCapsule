import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { importCategories } from '../../src/core/schemas.js';
import type { ImportSelections, Profile } from '../../src/core/types.js';

const tempDirs: string[] = [];

const disabledImports = Object.fromEntries(
  importCategories.map((category) => [category, false])
) as ImportSelections;

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    schemaVersion: '1',
    tool: 'opencode',
    imageName: 'codecapsule/opencode:latest',
    containerWorkdir: '/workspace',
    opencodeVersion: 'latest',
    statePath: '.codecapsule/state/opencode',
    cachePath: '.codecapsule/cache/opencode',
    network: 'bridge',
    imports: disabledImports,
    security: {
      allowPrivileged: false,
      allowDockerSocket: false,
      allowHostHomeMount: false,
      allowSshAgent: false,
      envAllowlist: ['TERM']
    },
    ...overrides
  };
}

function createLaunchProject(profile = createProfile()): string {
  const cwd = mkdtempSync(join(tmpdir(), 'codecapsule-launch-'));
  tempDirs.push(cwd);
  const capsuleDir = join(cwd, '.codecapsule');

  mkdirSync(capsuleDir);
  writeFileSync(join(capsuleDir, 'profile.json'), `${JSON.stringify(profile)}\n`, 'utf8');
  writeFileSync(join(capsuleDir, 'local.json'), `${JSON.stringify({ hostSourcePaths: {} })}\n`, 'utf8');
  writeFileSync(join(capsuleDir, `Dockerfile.${profile.tool}`), 'FROM node:22-bookworm-slim\n', 'utf8');

  return cwd;
}

afterEach(() => {
  vi.resetModules();
  vi.unmock('node:child_process');
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('runLaunch', () => {
  test('fails clearly when profile is missing', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'codecapsule-missing-profile-'));
    tempDirs.push(cwd);
    const { runLaunch } = await import('../../src/commands/launch.js');

    const result = await runLaunch({ dryRun: true }, cwd);

    expect(result.code).toBe(1);
    expect(result.message).toContain('Missing .codecapsule/profile.json');
    expect(result.message).toContain('codecapsule init');
  });

  test('dry-run prints a safe Docker command without executing Docker', async () => {
    const execFileSync = vi.fn();
    const spawn = vi.fn();
    vi.doMock('node:child_process', () => ({ execFileSync, spawn }));
    const cwd = createLaunchProject();
    const { runLaunch } = await import('../../src/commands/launch.js');
    const { getProjectImageTag } = await import('../../src/docker/runner.js');
    const imageTag = getProjectImageTag(createProfile(), cwd);

    const result = await runLaunch({ dryRun: true }, cwd);

    expect(result.code).toBe(0);
    expect(result.message).toContain('docker run');
    expect(result.message).toContain('--rm');
    expect(result.message).toContain('-it');
    expect(result.message).toContain(`${cwd}:/workspace`);
    expect(result.message).toContain(`${cwd}/.codecapsule/state/opencode:/home/codecapsule/.local/share/opencode`);
    expect(result.message).toContain(`${cwd}/.codecapsule/cache/opencode:/home/codecapsule/.cache/opencode`);
    expect(result.message).toContain(imageTag);
    expect(result.message).not.toContain('codecapsule/opencode:latest');
    expect(result.message).not.toContain('--privileged');
    expect(result.message).not.toContain('/var/run/docker.sock');
    expect(execFileSync).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  test('passes extra args through as the container command', async () => {
    const execFileSync = vi.fn();
    const spawn = vi.fn();
    vi.doMock('node:child_process', () => ({ execFileSync, spawn }));
    const cwd = createLaunchProject();
    const { runLaunch } = await import('../../src/commands/launch.js');
    const { getProjectImageTag } = await import('../../src/docker/runner.js');
    const imageTag = getProjectImageTag(createProfile(), cwd);

    const result = await runLaunch({ dryRun: true }, cwd, ['--help']);

    expect(result.code).toBe(0);
    expect(result.command?.slice(-3)).toEqual([imageTag, 'opencode', '--help']);
    expect(result.message).toContain('--help');
    expect(spawn).not.toHaveBeenCalled();
  });

  test('--build --dry-run reports the image build plan without mutating state', async () => {
    const execFileSync = vi.fn();
    const spawn = vi.fn();
    vi.doMock('node:child_process', () => ({ execFileSync, spawn }));
    const cwd = createLaunchProject();
    const { runLaunch } = await import('../../src/commands/launch.js');
    const { getProjectImageTag } = await import('../../src/docker/runner.js');
    const imageTag = getProjectImageTag(createProfile(), cwd);

    const result = await runLaunch({ dryRun: true, build: true }, cwd);

    expect(result.code).toBe(0);
    expect(result.message).toContain('docker build');
    expect(result.message).toContain(join(cwd, '.codecapsule', 'Dockerfile.opencode'));
    expect(result.message).toContain(`USER_ID=${process.getuid?.() ?? 1000}`);
    expect(result.message).toContain(`GROUP_ID=${process.getgid?.() ?? 1000}`);
    expect(result.message).toContain(imageTag);
    expect(result.message).toContain('docker run');
    expect(execFileSync).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  test('propagates the Docker container exit code', async () => {
    const child = new EventEmitter() as EventEmitter & { kill: ReturnType<typeof vi.fn> };
    child.kill = vi.fn();
    const execFileSync = vi.fn();
    const spawn = vi.fn(() => {
      process.nextTick(() => child.emit('exit', 23));
      return child;
    });
    vi.doMock('node:child_process', () => ({ execFileSync, spawn }));
    const cwd = createLaunchProject();
    const { runLaunch } = await import('../../src/commands/launch.js');
    const { getProjectImageTag } = await import('../../src/docker/runner.js');
    const imageTag = getProjectImageTag(createProfile(), cwd);

    const result = await runLaunch({}, cwd);

    expect(result.code).toBe(23);
    expect(execFileSync).toHaveBeenCalledWith('docker', ['image', 'inspect', imageTag], { stdio: 'ignore' });
    expect(spawn).toHaveBeenCalledWith('docker', expect.arrayContaining(['run', '--rm', '-it']), { stdio: 'inherit' });
  });

  test('--build passes host uid and gid build args for the project-scoped image', async () => {
    const child = new EventEmitter() as EventEmitter & { kill: ReturnType<typeof vi.fn> };
    child.kill = vi.fn();
    const execFileSync = vi.fn();
    const spawn = vi.fn(() => {
      process.nextTick(() => child.emit('exit', 0));
      return child;
    });
    vi.doMock('node:child_process', () => ({ execFileSync, spawn }));
    const cwd = createLaunchProject();
    const { runLaunch } = await import('../../src/commands/launch.js');
    const { getProjectImageTag } = await import('../../src/docker/runner.js');
    const imageTag = getProjectImageTag(createProfile(), cwd);

    const result = await runLaunch({ build: true }, cwd);

    expect(result.code).toBe(0);
    expect(execFileSync).toHaveBeenCalledWith('docker', [
      'build',
      '-f', join(cwd, '.codecapsule', 'Dockerfile.opencode'),
      '--build-arg', `USER_ID=${process.getuid?.() ?? 1000}`,
      '--build-arg', `GROUP_ID=${process.getgid?.() ?? 1000}`,
      '-t', imageTag,
      cwd
    ], { stdio: 'inherit' });
    expect(spawn).toHaveBeenCalledWith('docker', expect.arrayContaining([imageTag]), { stdio: 'inherit' });
  });

  test('forwards SIGINT and SIGTERM to the Docker child process', async () => {
    const child = new EventEmitter() as EventEmitter & { kill: ReturnType<typeof vi.fn> };
    child.kill = vi.fn();
    const execFileSync = vi.fn();
    const spawn = vi.fn(() => child);
    vi.doMock('node:child_process', () => ({ execFileSync, spawn }));
    const cwd = createLaunchProject();
    const { runLaunch } = await import('../../src/commands/launch.js');

    const launched = runLaunch({}, cwd);
    await Promise.resolve();
    process.emit('SIGINT');
    process.emit('SIGTERM');
    child.emit('exit', 0);
    const result = await launched;

    expect(result.code).toBe(0);
    expect(child.kill).toHaveBeenCalledWith('SIGINT');
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  test('reports missing Docker with an actionable error', async () => {
    const error = new Error('spawn docker ENOENT') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    const execFileSync = vi.fn(() => {
      throw error;
    });
    const spawn = vi.fn();
    vi.doMock('node:child_process', () => ({ execFileSync, spawn }));
    const cwd = createLaunchProject();
    const { runLaunch } = await import('../../src/commands/launch.js');

    const result = await runLaunch({ build: true }, cwd);

    expect(result.code).toBe(1);
    expect(result.message).toContain('Docker is unavailable');
    expect(result.message).toContain('docker');
    expect(spawn).not.toHaveBeenCalled();
  });
});

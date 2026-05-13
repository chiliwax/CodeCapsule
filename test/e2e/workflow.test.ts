import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { runClean } from '../../src/commands/clean.js';
import { runDoctor } from '../../src/commands/doctor.js';
import { runInit } from '../../src/commands/init.js';
import { runLaunch } from '../../src/commands/launch.js';

const fixturesDir = join(process.cwd(), 'test', 'fixtures');
const dockerAvailable = (() => {
  try {
    execFileSync('docker', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return true;
  } catch {
    return false;
  }
})();

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

function writeCapsuleFile(cwd: string, name: string, contents: string): void {
  const capsuleDir = join(cwd, '.codecapsule');
  mkdirSync(capsuleDir, { recursive: true });
  writeFileSync(join(capsuleDir, name), contents, 'utf8');
}

describe('e2e workflow', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'codecapsule-e2e-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test.skipIf(!dockerAvailable)('full workflow: init → doctor → launch --dry-run', async () => {
    runInit({ tool: 'opencode', yes: true }, tempDir);

    const doctorResult = runDoctor(tempDir);
    expect(doctorResult.ok).toBe(true);
    expect(doctorResult.checks).toContain('ok: .codecapsule/profile.json is valid');
    expect(doctorResult.checks).toContain('ok: .codecapsule/Dockerfile.opencode exists');

    const launchResult = await runLaunch({ dryRun: true }, tempDir);
    expect(launchResult.code).toBe(0);
    expect(launchResult.message).toContain('docker run');
  });

  test('init refuses overwrite without --force', () => {
    runInit({ tool: 'opencode', yes: true }, tempDir);

    expect(() => runInit({ tool: 'opencode', yes: true }, tempDir)).toThrow('Refusing to overwrite');
  });

  test('init --force overwrites existing files', () => {
    runInit({ tool: 'opencode', yes: true }, tempDir);
    writeFileSync(join(tempDir, '.codecapsule', 'local.json'), '{"stale":true}\n', 'utf8');

    runInit({ tool: 'opencode', yes: true, force: true }, tempDir);

    expect(JSON.parse(readFileSync(join(tempDir, '.codecapsule', 'local.json'), 'utf8'))).toEqual({ hostSourcePaths: {} });
  });

  test('doctor fails when profile is missing', () => {
    const result = runDoctor(tempDir);

    expect(result.ok).toBe(false);
    expect(result.checks).toContain('fail: .codecapsule/profile.json missing');
  });

  test('doctor fails when profile is invalid', () => {
    writeCapsuleFile(tempDir, 'profile.json', readFixture('invalid-profile.json'));

    const result = runDoctor(tempDir);

    expect(result.ok).toBe(false);
    expect(result.checks.some((check) => check.includes('fail: .codecapsule/profile.json invalid'))).toBe(true);
  });

  test.skipIf(!dockerAvailable)('doctor fails when Dockerfile is missing', () => {
    writeCapsuleFile(tempDir, 'profile.json', readFixture('missing-dockerfile-profile.json'));
    writeCapsuleFile(tempDir, 'local.json', '{"hostSourcePaths":{}}\n');

    const result = runDoctor(tempDir);

    expect(result.ok).toBe(false);
    expect(result.checks).toContain('ok: .codecapsule/profile.json is valid');
    expect(result.checks).toContain('fail: .codecapsule/Dockerfile.opencode missing');
  });

  test('launch --dry-run fails when profile is missing', async () => {
    const result = await runLaunch({ dryRun: true }, tempDir);

    expect(result.code).toBe(1);
    expect(result.message).toContain('Missing .codecapsule/profile.json');
    expect(result.message).toContain('codecapsule init');
  });

  test('launch --dry-run rejects unsafe imported config', async () => {
    writeCapsuleFile(tempDir, 'profile.json', readFixture('unsafe-import-config.json'));
    writeCapsuleFile(tempDir, 'local.json', '{"hostSourcePaths":{}}\n');

    const result = await runLaunch({ dryRun: true }, tempDir);

    expect(result.code).toBe(1);
    expect(result.message).toContain('Profile requests unsafe Docker capabilities');
    expect(result.command).toBeUndefined();
  });

  test('security regression: no privileged, docker.sock, host home, or SSH agent in dry-run', async () => {
    runInit({ tool: 'opencode', yes: true }, tempDir);

    const result = await runLaunch({ dryRun: true }, tempDir);
    const command = result.message ?? '';

    expect(result.code).toBe(0);
    expect(command).toContain('docker run');
    expect(command).not.toContain('--privileged');
    expect(command).not.toContain('docker.sock');
    expect(command).not.toContain('/var/run/docker.sock');
    if (process.env.HOME) {
      expect(command).not.toContain(process.env.HOME);
    }
    expect(command).not.toContain('SSH_AUTH_SOCK');
    expect(command).not.toContain('SSH_AGENT_PID');
  });

  test('launch --dry-run uses project-scoped state, cache, user, and image tag', async () => {
    runInit({ tool: 'opencode', yes: true }, tempDir);

    const result = await runLaunch({ dryRun: true, build: true }, tempDir, ['--help']);
    const command = result.message ?? '';
    const projectSlug = basename(tempDir).toLowerCase();
    const userId = typeof process.getuid === 'function' ? process.getuid() : 1000;
    const groupId = typeof process.getgid === 'function' ? process.getgid() : 1000;

    expect(result.code).toBe(0);
    expect(command).toContain(join(tempDir, '.codecapsule/state/opencode'));
    expect(command).toContain(join(tempDir, '.codecapsule/cache/opencode'));
    expect(command).toContain('--user codecapsule');
    expect(command).toContain('HOME=/home/codecapsule');
    expect(command).toContain(`--build-arg USER_ID=${userId}`);
    expect(command).toContain(`--build-arg GROUP_ID=${groupId}`);
    expect(command).toContain(`codecapsule/opencode:${projectSlug}-uid${userId}-gid${groupId}`);
    expect(command).toContain('--help');
    expect(command).not.toContain('codecapsule-opencode-state');
    expect(command).not.toContain('codecapsule-opencode-cache');
  });

  test('clean requires --yes', () => {
    runInit({ tool: 'opencode', yes: true }, tempDir);

    expect(() => runClean({}, tempDir)).toThrow('Re-run with --yes');
  });
});

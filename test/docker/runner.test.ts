import { describe, expect, test } from 'vitest';
import { importCategories } from '../../src/core/schemas.js';
import type { ImportSelections, LocalConfig, Profile } from '../../src/core/types.js';
import { buildDockerCommand, formatDockerCommand } from '../../src/docker/runner.js';

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
    stateVolume: 'codecapsule-opencode-state',
    cacheVolume: 'codecapsule-opencode-cache',
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

describe('buildDockerCommand', () => {
  test('includes dry-run essentials for a safe interactive workspace launch', () => {
    const command = buildDockerCommand(createProfile(), { hostSourcePaths: {} }, { dryRun: true });

    expect(command).toContain('run');
    expect(command).toContain('--rm');
    expect(command).toContain('-it');
    expect(command).toContain('--workdir');
    expect(command).toContain('/workspace');
    expect(command).toContain('--network');
    expect(command).toContain('bridge');
    expect(command).toContain('--user');
    expect(command).toContain('codecapsule');
    expect(command).toContain(`${process.cwd()}:/workspace`);
    expect(command).toContain('HOME=/home/codecapsule');
    expect(command).toContain('XDG_CONFIG_HOME=/home/codecapsule/.config');
    expect(command).toContain('XDG_DATA_HOME=/home/codecapsule/.local/share');
    expect(command).toContain('XDG_CACHE_HOME=/home/codecapsule/.cache');
    expect(command).toContain('codecapsule/opencode:latest');
    expect(command).toContain('opencode');
  });

  test('omits privileged mode, Docker socket, broad home mount, SSH agent, and broad env passthrough', () => {
    const text = formatDockerCommand(buildDockerCommand(createProfile(), { hostSourcePaths: {} }, { dryRun: true }));

    expect(text).not.toContain('--privileged');
    expect(text).not.toContain('/var/run/docker.sock');
    expect(text).not.toContain(`${process.env.HOME}:/home`);
    expect(text).not.toContain('SSH_AUTH_SOCK');
    expect(text).not.toContain('--env-file');
    expect(text).not.toContain(`HOME=${process.env.HOME}`);
  });

  test('mounts every enabled import category from local config as read-only', () => {
    const imports = Object.fromEntries(importCategories.map((category) => [category, true])) as ImportSelections;
    const localConfig: LocalConfig = {
      hostSourcePaths: Object.fromEntries(
        importCategories.map((category) => [category, `/safe-host/${category}`])
      )
    };

    const command = buildDockerCommand(createProfile({ imports }), localConfig, { dryRun: true });

    for (const category of importCategories) {
      expect(command.some((arg) => arg.startsWith(`/safe-host/${category}:`) && arg.endsWith(':ro'))).toBe(true);
    }
  });

  test('uses explicit container command args instead of the adapter default command', () => {
    const command = buildDockerCommand(createProfile(), { hostSourcePaths: {} }, { dryRun: true, command: ['--help'] });

    expect(command.slice(-3)).toEqual(['codecapsule/opencode:latest', 'opencode', '--help']);
  });
});

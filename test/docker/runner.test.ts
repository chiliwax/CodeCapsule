import { describe, expect, test } from 'vitest';
import { importCategories } from '../../src/core/schemas.js';
import type { ImportSelections, LocalConfig, Profile } from '../../src/core/types.js';
import { buildDockerCommand, formatDockerCommand, getProjectImageTag } from '../../src/docker/runner.js';

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

describe('buildDockerCommand', () => {
  test('includes dry-run essentials for a safe interactive workspace launch', () => {
    const command = buildDockerCommand(createProfile(), { hostSourcePaths: {} }, { dryRun: true });
    const imageTag = getProjectImageTag(createProfile(), process.cwd());

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
    expect(command).toContain(`${process.cwd()}/.codecapsule/state/opencode:/home/codecapsule/.local/share/opencode`);
    expect(command).toContain(`${process.cwd()}/.codecapsule/cache/opencode:/home/codecapsule/.cache/opencode`);
    expect(command).toContain(imageTag);
    expect(command).not.toContain('codecapsule/opencode:latest');
    expect(command).toContain('opencode');
  });

  test('scopes image tags to the project basename and host user ids', () => {
    const imageTag = getProjectImageTag(createProfile(), '/tmp/Safe Code!');

    expect(imageTag).toBe(`codecapsule/opencode:safe-code-uid${process.getuid?.() ?? 1000}-gid${process.getgid?.() ?? 1000}`);
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
    const imageTag = getProjectImageTag(createProfile(), process.cwd());

    expect(command.slice(-3)).toEqual([imageTag, 'opencode', '--help']);
  });
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { ProfileSchema, validateProfile } from '../../src/core/schemas.js';

function readFixture(name: string): unknown {
  const fixturePath = fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as unknown;
}

describe('ProfileSchema', () => {
  test('parses a valid profile fixture', () => {
    const profile = validateProfile(readFixture('valid-profile.json'));

    expect(profile.tool).toBe('opencode');
    expect(profile.containerWorkdir).toBe('/workspace');
    expect(profile.statePath).toBe('.codecapsule/state/opencode');
    expect(profile.cachePath).toBe('.codecapsule/cache/opencode');
    expect(profile.security.allowPrivileged).toBe(false);
  });

  test('rejects an invalid tool', () => {
    const profile = readFixture('valid-profile.json');

    expect(() => validateProfile({ ...profile, tool: 'other-tool' })).toThrow();
  });

  test('rejects an unsafe privileged profile', () => {
    expect(() => validateProfile(readFixture('invalid-profile.json'))).toThrow(
      'Profile requests unsafe Docker capabilities'
    );
  });

  test('rejects unsafe host home mounts and SSH agent forwarding', () => {
    const profile = readFixture('valid-profile.json');

    expect(() => validateProfile({
      ...profile,
      security: {
        ...(profile as { security: Record<string, unknown> }).security,
        allowHostHomeMount: true
      }
    })).toThrow('Profile requests unsafe Docker capabilities');

    expect(() => validateProfile({
      ...profile,
      security: {
        ...(profile as { security: Record<string, unknown> }).security,
        allowSshAgent: true
      }
    })).toThrow('Profile requests unsafe Docker capabilities');
  });

  test('defaults import flags to false', () => {
    const profile = ProfileSchema.parse({
      schemaVersion: '1',
      tool: 'opencode',
      imageName: 'codecapsule/opencode:latest'
    });

    expect(profile.statePath).toBe('.codecapsule/state/opencode');
    expect(profile.cachePath).toBe('.codecapsule/cache/opencode');
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
  });

  test('rejects legacy named-volume profile fields with a migration error', () => {
    expect(() => validateProfile({
      schemaVersion: '1',
      tool: 'opencode',
      imageName: 'codecapsule/opencode:latest',
      stateVolume: 'codecapsule-opencode-state',
      cacheVolume: 'codecapsule-opencode-cache'
    })).toThrow('Profile uses legacy stateVolume/cacheVolume fields');
  });
});

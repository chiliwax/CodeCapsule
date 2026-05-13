import { describe, expect, test } from 'vitest';
import type { AdapterMetadata, ImportCategory, Profile } from '../../src/core/types.js';

describe('core domain types', () => {
  test('types adapter metadata for import categories', () => {
    const importCategories: ImportCategory[] = ['settings', 'auth', 'skills'];
    const metadata: AdapterMetadata = {
      toolId: 'opencode',
      displayName: 'OpenCode',
      defaultCommand: ['opencode'],
      containerConfigPaths: {
        settings: '/workspace/.opencode/settings.json',
        auth: '/workspace/.opencode/auth.json',
        skills: '/workspace/.opencode/skills',
        plugins: '/workspace/.opencode/plugins',
        agents: '/workspace/.opencode/agents',
        commands: '/workspace/.opencode/commands',
        tools: '/workspace/.opencode/tools',
        themes: '/workspace/.opencode/themes'
      },
      hostConfigPaths: {
        settings: '~/.config/opencode/settings.json',
        auth: '~/.config/opencode/auth.json',
        skills: '~/.config/opencode/skills',
        plugins: '~/.config/opencode/plugins',
        agents: '~/.config/opencode/agents',
        commands: '~/.config/opencode/commands',
        tools: '~/.config/opencode/tools',
        themes: '~/.config/opencode/themes'
      },
      importCategories,
      authWarning: 'Authentication files may contain secrets.'
    };

    expect(metadata.toolId).toBe('opencode');
    expect(metadata.importCategories).toEqual(importCategories);
  });

  test('types profile import selections explicitly', () => {
    const profileImports: Profile['imports'] = {
      settings: false,
      auth: false,
      skills: false,
      plugins: false,
      agents: false,
      commands: false,
      tools: false,
      themes: false
    };

    expect(Object.values(profileImports).every((enabled) => enabled === false)).toBe(true);
  });
});

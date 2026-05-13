import type { AdapterMetadata, ImportCategory } from '../core/types.js';

const importCategories: ImportCategory[] = [
  'settings',
  'auth',
  'skills',
  'plugins',
  'agents',
  'commands',
  'tools',
  'themes'
];

const configPaths: Record<ImportCategory, string> = {
  settings: '~/.config/opencode/opencode.json',
  auth: '~/.local/share/opencode/auth.json',
  skills: '~/.config/opencode/skills/',
  plugins: '~/.config/opencode/plugins/',
  agents: '~/.config/opencode/agents/',
  commands: '~/.config/opencode/commands/',
  tools: '~/.config/opencode/tools/',
  themes: '~/.config/opencode/themes/'
};

const containerConfigPaths: Record<ImportCategory, string> = {
  settings: '/home/codecapsule/.config/opencode/opencode.json',
  auth: '/home/codecapsule/.local/share/opencode/auth.json',
  skills: '/home/codecapsule/.config/opencode/skills/',
  plugins: '/home/codecapsule/.config/opencode/plugins/',
  agents: '/home/codecapsule/.config/opencode/agents/',
  commands: '/home/codecapsule/.config/opencode/commands/',
  tools: '/home/codecapsule/.config/opencode/tools/',
  themes: '/home/codecapsule/.config/opencode/themes/'
};

export const opencodeAdapter: AdapterMetadata = {
  toolId: 'opencode',
  displayName: 'OpenCode',
  defaultCommand: ['opencode'],
  containerConfigPaths,
  hostConfigPaths: configPaths,
  importCategories,
  authWarning:
    'Browser-based OpenCode authentication can be brittle inside containers or Docker environments; prefer API keys or tokens passed explicitly as secrets instead of relying on copied browser auth state.'
};

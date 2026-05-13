import { homedir } from 'node:os';
import type {
  AdapterMetadata,
  HostSourcePaths,
  ImportCategory,
  ImportSelections,
  LocalConfig
} from './types.js';

export interface ImportOptions {
  settings?: boolean;
  auth?: boolean;
  skills?: boolean;
  plugins?: boolean;
  agents?: boolean;
  commands?: boolean;
  tools?: boolean;
  themes?: boolean;
  confirmAuthImport?: boolean;
}

export interface ProcessImportOptionsResult {
  profileImports: ImportSelections;
  localConfig: LocalConfig;
}

export function processImportOptions(
  options: ImportOptions,
  adapter: AdapterMetadata
): ProcessImportOptionsResult {
  if (options.auth && !options.confirmAuthImport) {
    throw new Error(
      'Auth import requires --confirm-auth-import flag. ' +
        'This will copy authentication tokens. Use with caution.'
    );
  }

  const profileImports: ImportSelections = {
    settings: options.settings ?? false,
    auth: options.auth ?? false,
    skills: options.skills ?? false,
    plugins: options.plugins ?? false,
    agents: options.agents ?? false,
    commands: options.commands ?? false,
    tools: options.tools ?? false,
    themes: options.themes ?? false
  };

  const hostSourcePaths: HostSourcePaths = {};

  for (const category of adapter.importCategories) {
    if (profileImports[category]) {
      const hostPath = resolveHostPath(category, adapter);

      if (hostPath !== undefined) {
        hostSourcePaths[category] = hostPath;
      }
    }
  }

  return {
    profileImports,
    localConfig: { hostSourcePaths }
  };
}

export function resolveHostPath(
  category: ImportCategory,
  adapter: AdapterMetadata
): string | undefined {
  const rawPath = adapter.hostConfigPaths[category];
  if (rawPath && rawPath.startsWith('~/')) {
    return rawPath.replace(/^~\//, homedir() + '/');
  }
  return rawPath;
}

export function generateGitignore(): string {
  return `# CodeCapsule local config (machine-specific)
local.json
imports/
state/
cache/
config/
tmp/
logs/
`;
}

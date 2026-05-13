import { homedir } from 'node:os';
import { describe, expect, test } from 'vitest';
import { opencodeAdapter } from '../../src/adapters/index.js';
import {
  generateGitignore,
  processImportOptions,
  resolveHostPath
} from '../../src/core/import.js';

const disabledImports = {
  settings: false,
  auth: false,
  skills: false,
  plugins: false,
  agents: false,
  commands: false,
  tools: false,
  themes: false
};

describe('processImportOptions', () => {
  test('keeps clean init imports disabled', () => {
    const result = processImportOptions({}, opencodeAdapter);

    expect(result.profileImports).toEqual(disabledImports);
    expect(result.localConfig).toEqual({ hostSourcePaths: {} });
  });

  test('rejects auth import without explicit confirmation', () => {
    expect(() => processImportOptions({ auth: true }, opencodeAdapter)).toThrow(
      'Auth import requires --confirm-auth-import flag.'
    );
  });

  test('allows auth import with explicit confirmation', () => {
    const result = processImportOptions(
      { auth: true, confirmAuthImport: true },
      opencodeAdapter
    );

    expect(result.profileImports).toEqual({
      ...disabledImports,
      auth: true
    });
    expect(result.localConfig.hostSourcePaths).toEqual({
      auth: `${homedir()}/.local/share/opencode/auth.json`
    });
  });

  test('imports settings and skills without auth confirmation', () => {
    const result = processImportOptions(
      { settings: true, skills: true },
      opencodeAdapter
    );

    expect(result.profileImports).toEqual({
      ...disabledImports,
      settings: true,
      skills: true
    });
    expect(result.localConfig.hostSourcePaths).toEqual({
      settings: `${homedir()}/.config/opencode/opencode.json`,
      skills: `${homedir()}/.config/opencode/skills/`
    });
  });
});

describe('resolveHostPath', () => {
  test('returns adapter metadata path for an import category', () => {
    expect(resolveHostPath('settings', opencodeAdapter)).toBe(
      `${homedir()}/.config/opencode/opencode.json`
    );
  });
});

describe('generateGitignore', () => {
  test('ignores local config and imported machine-local files', () => {
    expect(generateGitignore()).toBe(`# CodeCapsule local config (machine-specific)
local.json
imports/
state/
cache/
config/
tmp/
logs/
`);
  });
});

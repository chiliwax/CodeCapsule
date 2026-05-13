import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Command, InvalidArgumentError } from 'commander';
import { getAdapter } from '../adapters/index.js';
import { importCategories, ProfileSchema } from '../core/schemas.js';
import { generateGitignore, processImportOptions } from '../core/import.js';
import type { AdapterMetadata, ImportCategory, ImportSelections, Profile } from '../core/types.js';
import { generateDockerfile } from '../docker/dockerfile.js';

interface InitOptions {
  tool: string;
  yes?: boolean;
  force?: boolean;
  import?: ImportCategory[];
  confirmAuthImport?: boolean;
}

const capsuleDir = '.codecapsule';

function parseImportCategory(value: string, previous: ImportCategory[] = []): ImportCategory[] {
  if (!importCategories.includes(value as ImportCategory)) {
    throw new InvalidArgumentError(
      `Unsupported import category "${value}". Expected one of: ${importCategories.join(', ')}`
    );
  }

  return [...previous, value as ImportCategory];
}

function createImportSelections(selected: readonly ImportCategory[]): ImportSelections {
  const selections = Object.fromEntries(
    importCategories.map((category) => [category, selected.includes(category)])
  ) as ImportSelections;

  return selections;
}

function createProfile(adapter: AdapterMetadata, imports: ImportSelections): Profile {
  return ProfileSchema.parse({
    schemaVersion: '1',
    tool: adapter.toolId,
    imageName: `codecapsule/${adapter.toolId}:latest`,
    containerWorkdir: '/workspace',
    opencodeVersion: 'latest',
    statePath: `.codecapsule/state/${adapter.toolId}`,
    cachePath: `.codecapsule/cache/${adapter.toolId}`,
    network: 'bridge',
    imports,
    security: {
      allowPrivileged: false,
      allowDockerSocket: false,
      allowHostHomeMount: false,
      allowSshAgent: false,
      envAllowlist: ['TERM']
    }
  });
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function runInit(options: InitOptions, cwd = process.cwd()): void {
  if (!options.yes) {
    throw new Error('Interactive init is not available yet. Re-run with --yes.');
  }

  const adapter = getAdapter(options.tool);

  if (!adapter) {
    throw new Error(`Unsupported tool "${options.tool}"`);
  }

  const selectedImports = createImportSelections(options.import ?? []);
  const { profileImports, localConfig } = processImportOptions(
    { ...selectedImports, confirmAuthImport: options.confirmAuthImport },
    adapter
  );
  const profile = createProfile(adapter, profileImports);
  const baseDir = join(cwd, capsuleDir);
  const files = [
    { path: join(baseDir, 'profile.json'), write: () => writeJson(join(baseDir, 'profile.json'), profile) },
    { path: join(baseDir, 'local.json'), write: () => writeJson(join(baseDir, 'local.json'), localConfig) },
    {
      path: join(baseDir, `Dockerfile.${profile.tool}`),
      write: () => writeFileSync(join(baseDir, `Dockerfile.${profile.tool}`), generateDockerfile(profile), 'utf8')
    },
    { path: join(baseDir, '.gitignore'), write: () => writeFileSync(join(baseDir, '.gitignore'), generateGitignore(), 'utf8') }
  ];

  const existingFiles = files.filter((file) => existsSync(file.path)).map((file) => file.path);
  if (existingFiles.length > 0 && !options.force) {
    throw new Error(`Refusing to overwrite existing CodeCapsule files: ${existingFiles.join(', ')}`);
  }

  mkdirSync(dirname(files[0].path), { recursive: true });
  mkdirSync(join(baseDir, 'state', profile.tool), { recursive: true });
  mkdirSync(join(baseDir, 'cache', profile.tool), { recursive: true });
  for (const file of files) {
    file.write();
  }
}

export const initCommand = new Command('init')
  .description('Create a CodeCapsule profile and local configuration')
  .option('--tool <tool>', 'coding agent tool to configure', 'opencode')
  .option('--yes', 'run non-interactively with safe defaults')
  .option('--force', 'overwrite existing generated files')
  .option('--import <category>', 'enable import category', parseImportCategory, [])
  .option('--confirm-auth-import', 'confirm that auth import is intentional')
  .action((options: InitOptions) => {
    runInit(options);
    process.stdout.write('Created .codecapsule/profile.json, local.json, Dockerfile.opencode, and .gitignore\n');
  });

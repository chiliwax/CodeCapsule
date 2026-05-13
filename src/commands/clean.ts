import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { validateProfile } from '../core/schemas.js';
import type { Profile } from '../core/types.js';

interface CleanOptions {
  yes?: boolean;
  includeState?: boolean;
}

export interface CleanResult {
  code: number;
  removed: string[];
  errors: string[];
}

function loadProfile(cwd: string): Profile | undefined {
  const profilePath = join(cwd, '.codecapsule', 'profile.json');

  if (!existsSync(profilePath)) {
    return undefined;
  }

  return validateProfile(JSON.parse(readFileSync(profilePath, 'utf8')) as unknown);
}

function dockerResourceExists(kind: 'image', name: string): boolean {
  try {
    execFileSync('docker', [kind, 'inspect', name], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function removeImage(name: string, errors: string[]): boolean {
  if (!dockerResourceExists('image', name)) {
    return false;
  }

  try {
    execFileSync('docker', ['image', 'rm', name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    errors.push(`Failed to remove image: ${name}`);
    return false;
  }
}

function removeLocalPath(path: string, cwd: string, errors: string[]): boolean {
  const fullPath = join(cwd, path);

  if (!existsSync(fullPath)) {
    return false;
  }

  try {
    rmSync(fullPath, { recursive: true, force: true });
    return true;
  } catch {
    errors.push(`Failed to remove path: ${path}`);
    return false;
  }
}

export function runClean(options: CleanOptions = {}, cwd = process.cwd()): CleanResult {
  if (!options.yes) {
    throw new Error('Interactive clean is not available yet. Re-run with --yes.');
  }

  const profile = loadProfile(cwd);
  const removed: string[] = [];
  const errors: string[] = [];

  if (!profile) {
    process.stdout.write('No CodeCapsule profile found; nothing to clean.\n');
    return { code: 0, removed, errors };
  }

  const removeState = options.includeState ?? false;

  process.stdout.write('The following CodeCapsule resources will be removed:\n');
  if (removeState) {
    process.stdout.write(`  - path: ${profile.statePath}\n`);
  }
  process.stdout.write(`  - path: ${profile.cachePath}\n`);
  process.stdout.write(`  - image: ${profile.imageName}\n`);

  if (removeState && removeLocalPath(profile.statePath, cwd, errors)) {
    removed.push(`path:${profile.statePath}`);
  }
  if (removeLocalPath(profile.cachePath, cwd, errors)) {
    removed.push(`path:${profile.cachePath}`);
  }
  if (removeImage(profile.imageName, errors)) {
    removed.push(`image:${profile.imageName}`);
  }

  return { code: errors.length > 0 ? 1 : 0, removed, errors };
}

export const cleanCommand = new Command('clean')
  .description('Remove CodeCapsule local cache path and Docker image (state is preserved by default)')
  .option('--yes', 'confirm removal without interactive prompt')
  .option('--include-state', 'also remove the local state path (sessions, auth, etc.)')
  .action((options: CleanOptions) => {
    const result = runClean(options);

    if (result.removed.length > 0) {
      process.stdout.write(`Removed: ${result.removed.join(', ')}\n`);
    }

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        process.stderr.write(`${error}\n`);
      }
    }

    process.exitCode = result.code;
  });

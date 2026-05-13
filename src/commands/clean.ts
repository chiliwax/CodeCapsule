import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { validateProfile } from '../core/schemas.js';
import type { Profile } from '../core/types.js';

interface CleanOptions {
  yes?: boolean;
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

function dockerResourceExists(kind: 'volume' | 'image', name: string): boolean {
  try {
    execFileSync('docker', [kind, 'inspect', name], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function removeVolume(name: string, errors: string[]): boolean {
  if (!dockerResourceExists('volume', name)) {
    return false;
  }

  try {
    execFileSync('docker', ['volume', 'rm', name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    errors.push(`Failed to remove volume: ${name}`);
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

  process.stdout.write('The following CodeCapsule resources will be removed:\n');
  process.stdout.write(`  - volume: ${profile.stateVolume}\n`);
  process.stdout.write(`  - volume: ${profile.cacheVolume}\n`);
  process.stdout.write(`  - image: ${profile.imageName}\n`);

  if (removeVolume(profile.stateVolume, errors)) {
    removed.push(`volume:${profile.stateVolume}`);
  }
  if (removeVolume(profile.cacheVolume, errors)) {
    removed.push(`volume:${profile.cacheVolume}`);
  }
  if (removeImage(profile.imageName, errors)) {
    removed.push(`image:${profile.imageName}`);
  }

  return { code: errors.length > 0 ? 1 : 0, removed, errors };
}

export const cleanCommand = new Command('clean')
  .description('Remove CodeCapsule Docker volumes and images')
  .option('--yes', 'confirm removal without interactive prompt')
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

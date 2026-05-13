import { execFileSync } from 'node:child_process';
import { basename, join } from 'node:path';
import { getAdapter } from '../adapters/index.js';
import { importCategories } from '../core/schemas.js';
import type { ImportCategory, LocalConfig, Profile } from '../core/types.js';

export interface DockerRunOptions {
  dryRun: boolean;
  build?: boolean;
  cwd?: string;
  command?: string[];
}

export async function checkImageExists(imageName: string): Promise<boolean> {
  try {
    execFileSync('docker', ['image', 'inspect', imageName], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getHostUserId(): number {
  return typeof process.getuid === 'function' ? process.getuid() : 1000;
}

function getHostGroupId(): number {
  return typeof process.getgid === 'function' ? process.getgid() : 1000;
}

function getProjectSlug(cwd: string): string {
  const slug = basename(cwd).toLowerCase().replace(/[^a-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'project';
}

export function getProjectImageTag(profile: Profile, cwd: string): string {
  return `codecapsule/${profile.tool}:${getProjectSlug(cwd)}-uid${getHostUserId()}-gid${getHostGroupId()}`;
}

export async function buildDockerImage(profile: Profile, cwd: string): Promise<boolean> {
  const dockerfile = join(cwd, '.codecapsule', `Dockerfile.${profile.tool}`);
  const imageTag = getProjectImageTag(profile, cwd);

  execFileSync('docker', [
    'build',
    '-f', dockerfile,
    '--build-arg', `USER_ID=${getHostUserId()}`,
    '--build-arg', `GROUP_ID=${getHostGroupId()}`,
    '-t', imageTag,
    cwd
  ], { stdio: 'inherit' });
  return true;
}

function assertSafeProfile(profile: Profile): void {
  if (profile.security.allowPrivileged) {
    throw new Error('Refusing to launch a privileged Docker container');
  }

  if (profile.security.allowDockerSocket) {
    throw new Error('Refusing to mount the Docker socket');
  }

  if (profile.security.allowHostHomeMount) {
    throw new Error('Refusing to mount the host home directory');
  }

  if (profile.security.allowSshAgent) {
    throw new Error('Refusing to forward the SSH agent');
  }
}

export function buildDockerCommand(
  profile: Profile,
  localConfig: LocalConfig,
  options: DockerRunOptions
): string[] {
  assertSafeProfile(profile);

  const adapter = getAdapter(profile.tool);
  const cwd = options.cwd || process.cwd();
  const args = ['run'];

  args.push('--rm');
  args.push('-it');
  args.push('--network', profile.network || 'bridge');
  args.push('--workdir', profile.containerWorkdir || '/workspace');
  args.push('--user', 'codecapsule');
  args.push('-v', `${cwd}:/workspace`);
  args.push('-e', 'HOME=/home/codecapsule');
  args.push('-e', 'XDG_CONFIG_HOME=/home/codecapsule/.config');
  args.push('-e', 'XDG_DATA_HOME=/home/codecapsule/.local/share');
  args.push('-e', 'XDG_CACHE_HOME=/home/codecapsule/.cache');

  if (profile.statePath) {
    args.push('-v', `${join(cwd, profile.statePath)}:/home/codecapsule/.local/share/opencode`);
  }

  if (profile.cachePath) {
    args.push('-v', `${join(cwd, profile.cachePath)}:/home/codecapsule/.cache/opencode`);
  }

  if (profile.configPath) {
    args.push('-v', `${join(cwd, profile.configPath)}:/home/codecapsule/.config/opencode`);
  }

  for (const envVar of profile.security.envAllowlist) {
    args.push('-e', envVar);
  }

  for (const category of importCategories) {
    const hostPath = localConfig.hostSourcePaths[category as ImportCategory];
    if (profile.imports[category] && hostPath) {
      const containerPath = adapter.containerConfigPaths[category];
      args.push('-v', `${hostPath}:${containerPath}:ro`);
    }
  }

  args.push(getProjectImageTag(profile, cwd));
  args.push(...adapter.defaultCommand);
  if (options.command && options.command.length > 0) {
    args.push(...options.command);
  }

  return args;
}

export function formatDockerCommand(args: readonly string[]): string {
  return ['docker', ...args].map((arg) => (/[\s"'\\]/.test(arg) ? JSON.stringify(arg) : arg)).join(' ');
}

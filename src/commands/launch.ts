import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { validateLocalConfig, validateProfile } from '../core/schemas.js';
import type { LocalConfig, Profile } from '../core/types.js';
import { buildDockerCommand, buildDockerImage, checkImageExists, formatDockerCommand, getProjectImageTag } from '../docker/runner.js';

interface LaunchCommandOptions {
  dryRun?: boolean;
  build?: boolean;
}

export interface LaunchResult {
  code: number;
  command?: string[];
  message?: string;
}

function formatBuildCommand(profile: Profile, cwd: string): string {
  return formatDockerCommand([
    'build',
    '-f', join(cwd, '.codecapsule', `Dockerfile.${profile.tool}`),
    '--build-arg', `USER_ID=${typeof process.getuid === 'function' ? process.getuid() : 1000}`,
    '--build-arg', `GROUP_ID=${typeof process.getgid === 'function' ? process.getgid() : 1000}`,
    '-t', getProjectImageTag(profile, cwd),
    cwd
  ]);
}

function isDockerUnavailable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

async function runDockerCommand(command: string[]): Promise<LaunchResult> {
  return new Promise((resolve) => {
    let settled = false;
    const child = spawn('docker', command, { stdio: 'inherit' });
    const forwardSigint = (): void => {
      child.kill('SIGINT');
    };
    const forwardSigterm = (): void => {
      child.kill('SIGTERM');
    };

    const cleanup = (): void => {
      process.removeListener('SIGINT', forwardSigint);
      process.removeListener('SIGTERM', forwardSigterm);
    };

    const settle = (result: LaunchResult): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(result);
    };

    process.on('SIGINT', forwardSigint);
    process.on('SIGTERM', forwardSigterm);

    child.on('error', (error) => {
      const message = isDockerUnavailable(error)
        ? 'Docker is unavailable. Install Docker and ensure the `docker` command is on PATH.'
        : error.message;
      settle({ code: 1, command, message });
    });

    child.on('exit', (code) => {
      const exitCode = code ?? 1;
      settle({
        code: exitCode,
        command,
        message: exitCode === 127 ? 'Container command failed with exit code 127. Verify OpenCode is installed in the image.' : undefined
      });
    });
  });
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

export function loadLaunchConfig(cwd = process.cwd()): { profile: Profile; localConfig: LocalConfig } {
  const profilePath = join(cwd, '.codecapsule', 'profile.json');
  const localConfigPath = join(cwd, '.codecapsule', 'local.json');

  if (!existsSync(profilePath)) {
    throw new Error('Missing .codecapsule/profile.json. Run `codecapsule init --tool opencode --yes` first.');
  }

  const profile = validateProfile(readJson(profilePath));
  const localConfig = existsSync(localConfigPath)
    ? validateLocalConfig(readJson(localConfigPath))
    : { hostSourcePaths: {} };

  return { profile, localConfig };
}

export async function runLaunch(options: LaunchCommandOptions = {}, cwd = process.cwd(), extraArgs: string[] = []): Promise<LaunchResult> {
  try {
    const { profile, localConfig } = loadLaunchConfig(cwd);
    const imageTag = getProjectImageTag(profile, cwd);
    const command = buildDockerCommand(profile, localConfig, { dryRun: Boolean(options.dryRun), build: options.build, cwd, command: extraArgs });

    if (options.dryRun) {
      const message = options.build
        ? `${formatBuildCommand(profile, cwd)}\n${formatDockerCommand(command)}`
        : formatDockerCommand(command);
      return { code: 0, command, message };
    }

    if (options.build === true) {
      await buildDockerImage(profile, cwd);
    } else if (options.build === false) {
      const imageExists = await checkImageExists(imageTag);
      if (!imageExists) {
        return { code: 1, command, message: `Docker image ${imageTag} is missing. Re-run without --no-build or pass --build.` };
      }
    } else {
      const imageExists = await checkImageExists(imageTag);
      if (!imageExists) {
        await buildDockerImage(profile, cwd);
      }
    }

    return await runDockerCommand(command);
  } catch (error) {
    const message = isDockerUnavailable(error)
      ? 'Docker is unavailable. Install Docker and ensure the `docker` command is on PATH.'
      : error instanceof Error
        ? error.message
        : String(error);
    return { code: 1, message };
  }
}

export const launchCommand = new Command('launch')
  .description('Launch the configured coding agent in Docker')
  .option('--dry-run', 'print the docker run command without executing it')
  .option('--build', 'build the Docker image before launching')
  .option('--no-build', 'fail if the Docker image is missing instead of auto-building')
  .allowUnknownOption()
  .allowExcessArguments(true)
  .action(async (options: LaunchCommandOptions, command: Command) => {
    const result = await runLaunch(options, process.cwd(), command.args);

    if (result.message) {
      const stream = result.code === 0 ? process.stdout : process.stderr;
      stream.write(`${result.message}\n`);
    }

    process.exitCode = result.code;
  });

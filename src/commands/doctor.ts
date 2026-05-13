import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { validateProfile } from '../core/schemas.js';

export interface DoctorResult {
  ok: boolean;
  checks: string[];
}

function checkNodeVersion(checks: string[]): boolean {
  const major = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
  const ok = major >= 22;
  checks.push(`${ok ? 'ok' : 'fail'}: Node.js ${process.versions.node} (requires >=22)`);
  return ok;
}

function checkDocker(checks: string[]): boolean {
  try {
    const version = execFileSync('docker', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    checks.push(`ok: Docker CLI available (${version})`);
    return true;
  } catch {
    checks.push('fail: Docker CLI unavailable (docker --version failed)');
    return false;
  }
}

function checkProfile(cwd: string, checks: string[]): { ok: boolean; tool?: string; security?: string } {
  const profilePath = join(cwd, '.codecapsule', 'profile.json');

  if (!existsSync(profilePath)) {
    checks.push('fail: .codecapsule/profile.json missing');
    return { ok: false };
  }

  try {
    const profile = validateProfile(JSON.parse(readFileSync(profilePath, 'utf8')) as unknown);
    checks.push('ok: .codecapsule/profile.json is valid');
    checks.push(
      `ok: security policy privileged=${profile.security.allowPrivileged}, dockerSocket=${profile.security.allowDockerSocket}`
    );
    return { ok: true, tool: profile.tool, security: 'safe' };
  } catch (error) {
    checks.push(`fail: .codecapsule/profile.json invalid (${error instanceof Error ? error.message : String(error)})`);
    return { ok: false };
  }
}

function checkDockerfile(cwd: string, tool: string | undefined, checks: string[]): boolean {
  const dockerfileName = `Dockerfile.${tool ?? 'opencode'}`;
  const ok = existsSync(join(cwd, '.codecapsule', dockerfileName));
  checks.push(`${ok ? 'ok' : 'fail'}: .codecapsule/${dockerfileName} ${ok ? 'exists' : 'missing'}`);
  return ok;
}

export function runDoctor(cwd = process.cwd()): DoctorResult {
  const checks: string[] = [];
  const nodeOk = checkNodeVersion(checks);
  const dockerOk = checkDocker(checks);
  const profile = checkProfile(cwd, checks);
  const dockerfileOk = checkDockerfile(cwd, profile.tool, checks);
  const ok = nodeOk && dockerOk && profile.ok && dockerfileOk;

  return { ok, checks };
}

export const doctorCommand = new Command('doctor')
  .description('Validate the local CodeCapsule environment')
  .action(() => {
    const result = runDoctor();
    process.stdout.write(`${result.checks.join('\n')}\n`);
    process.exitCode = result.ok ? 0 : 1;
  });

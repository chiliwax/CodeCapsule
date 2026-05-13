import { z } from 'zod';
import type {
  ImportCategory,
  LocalConfig,
  Profile,
  SecurityPolicy
} from './types.js';

export const importCategories = [
  'settings',
  'auth',
  'skills',
  'plugins',
  'agents',
  'commands',
  'tools',
  'themes'
] as const satisfies readonly ImportCategory[];

const importFlagSchema = z.boolean().default(false);

const defaultImports = {
  settings: false,
  auth: false,
  skills: false,
  plugins: false,
  agents: false,
  commands: false,
  tools: false,
  themes: false
};

const defaultSecurityPolicy = {
  allowPrivileged: false,
  allowDockerSocket: false,
  allowHostHomeMount: false,
  allowSshAgent: false,
  envAllowlist: ['TERM']
};

export const ImportsSchema = z.object({
  settings: importFlagSchema,
  auth: importFlagSchema,
  skills: importFlagSchema,
  plugins: importFlagSchema,
  agents: importFlagSchema,
  commands: importFlagSchema,
  tools: importFlagSchema,
  themes: importFlagSchema
});

export const SecurityPolicySchema = z.object({
  allowPrivileged: z.boolean().default(false),
  allowDockerSocket: z.boolean().default(false),
  allowHostHomeMount: z.boolean().default(false),
  allowSshAgent: z.boolean().default(false),
  envAllowlist: z.array(z.string()).default(['TERM'])
});

export const ProfileSchema = z.object({
  schemaVersion: z.string().min(1),
  tool: z.literal('opencode'),
  imageName: z.string().min(1),
  containerWorkdir: z.string().min(1).default('/workspace'),
  opencodeVersion: z.string().min(1).default('latest'),
  stateVolume: z.string().min(1),
  cacheVolume: z.string().min(1),
  network: z.string().min(1).default('bridge'),
  imports: ImportsSchema.default(defaultImports),
  security: SecurityPolicySchema.default(defaultSecurityPolicy)
});

export const LocalConfigSchema = z.object({
  hostSourcePaths: z.object({
    settings: z.string().optional(),
    auth: z.string().optional(),
    skills: z.string().optional(),
    plugins: z.string().optional(),
    agents: z.string().optional(),
    commands: z.string().optional(),
    tools: z.string().optional(),
    themes: z.string().optional()
  })
});

export function isSafeProfile(profile: Profile): boolean {
  return (
    !profile.security.allowPrivileged &&
    !profile.security.allowDockerSocket &&
    !profile.security.allowHostHomeMount &&
    !profile.security.allowSshAgent
  );
}

export function validateProfile(data: unknown): Profile {
  const profile = ProfileSchema.parse(data) satisfies Profile;

  if (!isSafeProfile(profile)) {
    throw new Error('Profile requests unsafe Docker capabilities');
  }

  return profile;
}

export function validateLocalConfig(data: unknown): LocalConfig {
  return LocalConfigSchema.parse(data) satisfies LocalConfig;
}

export function validateSecurityPolicy(data: unknown): SecurityPolicy {
  return SecurityPolicySchema.parse(data) satisfies SecurityPolicy;
}

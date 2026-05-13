export type ImportCategory =
  | 'settings'
  | 'auth'
  | 'skills'
  | 'plugins'
  | 'agents'
  | 'commands'
  | 'tools'
  | 'themes';

export type ImportSelections = Record<ImportCategory, boolean>;

export interface SecurityPolicy {
  allowPrivileged: boolean;
  allowDockerSocket: boolean;
  allowHostHomeMount: boolean;
  allowSshAgent: boolean;
  envAllowlist: string[];
}

export interface Profile {
  schemaVersion: string;
  tool: 'opencode';
  imageName: string;
  containerWorkdir: string;
  opencodeVersion: string;
  statePath: string;
  cachePath: string;
  network: string;
  imports: ImportSelections;
  security: SecurityPolicy;
}

export type HostSourcePaths = Partial<Record<ImportCategory, string>>;

export interface LocalConfig {
  hostSourcePaths: HostSourcePaths;
}

export interface AdapterMetadata {
  toolId: string;
  displayName: string;
  defaultCommand: string[];
  containerConfigPaths: Record<ImportCategory, string>;
  hostConfigPaths: Record<ImportCategory, string>;
  importCategories: ImportCategory[];
  authWarning: string;
}

export interface LaunchOptions {
  profile: Profile;
  localConfig: LocalConfig;
  command?: string[];
  env?: Record<string, string>;
}

import type { SecurityPolicy } from './types.js';
import { validateSecurityPolicy as parseSecurityPolicy } from './schemas.js';

export const defaultSecurityPolicy: SecurityPolicy = {
  allowPrivileged: false,
  allowDockerSocket: false,
  allowHostHomeMount: false,
  allowSshAgent: false,
  envAllowlist: ['TERM']
};

export function validateSecurityPolicy(data: unknown): SecurityPolicy {
  return parseSecurityPolicy(data);
}

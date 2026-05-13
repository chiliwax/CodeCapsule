import type { AdapterMetadata } from '../core/types.js';
import { opencodeAdapter } from './opencode.js';

export type { AdapterMetadata } from '../core/types.js';
export { opencodeAdapter } from './opencode.js';

export const adapters: Record<string, AdapterMetadata> = {
  [opencodeAdapter.toolId]: opencodeAdapter
};

export function getAdapter(toolId: string): AdapterMetadata {
  return adapters[toolId];
}

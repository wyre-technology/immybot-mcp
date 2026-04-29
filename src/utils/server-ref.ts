import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Global server reference for elicitation support
 * This allows domain handlers to access server methods for elicitation
 */
let serverReference: Server | null = null;

export function setServerRef(server: Server): void {
  serverReference = server;
}

export function getServerRef(): Server | null {
  return serverReference;
}

export function clearServerRef(): void {
  serverReference = null;
}
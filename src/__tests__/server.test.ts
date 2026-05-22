import { describe, it, expect, vi } from 'vitest';

// Mock the client so createMcpServer doesn't try to reach ImmyBot during construction.
vi.mock('../utils/client.js', () => ({
  getClient: vi.fn().mockResolvedValue({}),
}));

import { createMcpServer } from '../server.js';

describe('createMcpServer', () => {
  it('registers MCP request handlers without throwing', () => {
    // Regression for #3 / #7: passing raw method strings to
    // Server.setRequestHandler causes the SDK to throw
    // "Schema is missing a method literal" because it expects a Zod
    // schema with a literal `method` field. createMcpServer must use the
    // canonical ListToolsRequestSchema / CallToolRequestSchema exports.
    expect(() => createMcpServer()).not.toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { createMcpServer } from '../server.js';

describe('createMcpServer', () => {
  it('registers MCP request handlers without throwing', () => {
    expect(() => createMcpServer()).not.toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import { navigationHandler, getCurrentState, setNavigationState } from '../domains/navigation.js';

describe('Navigation Handler', () => {
  it('should provide navigation tools in root state', () => {
    setNavigationState('root');
    const tools = navigationHandler.getTools();

    expect(tools).toHaveLength(2);
    expect(tools.map(t => t.name)).toContain('immybot_navigate');
    expect(tools.map(t => t.name)).toContain('immybot_status');
  });

  it('should provide back tool in domain state', () => {
    setNavigationState('computers');
    const tools = navigationHandler.getTools();

    expect(tools).toHaveLength(2);
    expect(tools.map(t => t.name)).toContain('immybot_back');
    expect(tools.map(t => t.name)).toContain('immybot_status');
  });

  it('should handle navigate command', async () => {
    setNavigationState('root');

    const result = await navigationHandler.handleCall('immybot_navigate', {
      domain: 'computers'
    });

    expect(result.isError).toBe(undefined);
    expect(result.content[0].text).toContain('Navigated to computers domain');
    expect(getCurrentState()).toBe('computers');
  });

  it('should handle back command', async () => {
    setNavigationState('computers');

    const result = await navigationHandler.handleCall('immybot_back', {});

    expect(result.isError).toBe(undefined);
    expect(result.content[0].text).toContain('Returned to main navigation menu');
    expect(getCurrentState()).toBe('root');
  });

  it('should handle status command', async () => {
    setNavigationState('root');

    const result = await navigationHandler.handleCall('immybot_status', {});

    expect(result.isError).toBe(undefined);
    expect(result.content[0].text).toContain('Currently at: Main Navigation');
    expect(result.content[0].text).toContain('computers - Device and endpoint management');
  });

  it('should reject invalid domain', async () => {
    const result = await navigationHandler.handleCall('immybot_navigate', {
      domain: 'invalid'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid domain');
  });
});
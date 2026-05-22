import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deploymentsHandler } from '../domains/deployments.js';
import { scriptsHandler } from '../domains/scripts.js';
import { tenantsHandler } from '../domains/tenants.js';
import { maintenanceSessionsHandler } from '../domains/maintenance_sessions.js';
import { tasksHandler } from '../domains/tasks.js';

// Mock the client
vi.mock('../utils/client.js', () => ({
  getClient: vi.fn().mockResolvedValue({
    deployments: {
      list: vi.fn().mockResolvedValue([
        { id: 1, name: 'Test Deployment', softwareId: 100, targetType: 'Computer', targetId: 1, desiredState: 'Installed', status: 'Active', autoUpdate: false }
      ]),
      get: vi.fn().mockResolvedValue(
        { id: 1, name: 'Test Deployment', softwareId: 100, targetType: 'Computer', targetId: 1, desiredState: 'Installed', status: 'Active', autoUpdate: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
      )
    },
    scripts: {
      list: vi.fn().mockResolvedValue([
        { id: 1, name: 'Test Script', category: 'Maintenance', language: 'PowerShell', status: 'Active', isGlobal: true, description: 'Test script description' }
      ]),
      get: vi.fn().mockResolvedValue(
        { id: 1, name: 'Test Script', category: 'Maintenance', language: 'PowerShell', status: 'Active', isGlobal: true, description: 'Test script description', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
      )
    },
    tenants: {
      list: vi.fn().mockResolvedValue([
        { id: 1, name: 'Test Tenant', status: 'Active', type: 'Standard', primaryContact: 'test@example.com', createdAt: '2024-01-01T00:00:00Z' }
      ]),
      get: vi.fn().mockResolvedValue(
        { id: 1, name: 'Test Tenant', status: 'Active', type: 'Standard', primaryContact: 'test@example.com', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
      )
    },
    maintenanceSessions: {
      list: vi.fn().mockResolvedValue([
        { id: 1, computerId: 1, tenantId: 1, status: 'Completed', sessionType: 'Manual', priority: 'Normal', startedAt: '2024-01-01T00:00:00Z', duration: 300 }
      ]),
      get: vi.fn().mockResolvedValue(
        { id: 1, computerId: 1, tenantId: 1, status: 'Completed', sessionType: 'Manual', priority: 'Normal', startedAt: '2024-01-01T00:00:00Z', duration: 300, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
      )
    },
    tasks: {
      list: vi.fn().mockResolvedValue([
        { id: 1, name: 'Test Task', type: 'SoftwareInstall', status: 'Completed', priority: 'Normal', computerId: 1, tenantId: 1, progress: 100, startedAt: '2024-01-01T00:00:00Z' }
      ]),
      get: vi.fn().mockResolvedValue(
        { id: 1, name: 'Test Task', type: 'SoftwareInstall', status: 'Completed', priority: 'Normal', computerId: 1, tenantId: 1, progress: 100, startedAt: '2024-01-01T00:00:00Z', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
      )
    }
  })
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn()
  }
}));

describe('Domain Handlers', () => {
  describe('Deployments Handler', () => {
    it('should provide deployment tools', () => {
      const tools = deploymentsHandler.getTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.map(t => t.name)).toContain('immybot_deployments_list');
      expect(tools.map(t => t.name)).toContain('immybot_deployments_get');
    });

    it('should handle deployments list', async () => {
      const result = await deploymentsHandler.handleCall('immybot_deployments_list', {});
      expect(result.isError).toBe(undefined);
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Found 1 deployments');
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Test Deployment');
    });

    it('should handle deployments get', async () => {
      const result = await deploymentsHandler.handleCall('immybot_deployments_get', { deploymentId: 1 });
      expect(result.isError).toBe(undefined);
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Test Deployment');
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Software ID: 100');
    });
  });

  describe('Scripts Handler', () => {
    it('should provide script tools', () => {
      const tools = scriptsHandler.getTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.map(t => t.name)).toContain('immybot_scripts_list');
      expect(tools.map(t => t.name)).toContain('immybot_scripts_get');
    });

    it('should handle scripts list', async () => {
      const result = await scriptsHandler.handleCall('immybot_scripts_list', {});
      expect(result.isError).toBe(undefined);
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Found 1 scripts');
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Test Script');
    });

    it('should handle scripts get', async () => {
      const result = await scriptsHandler.handleCall('immybot_scripts_get', { scriptId: 1 });
      expect(result.isError).toBe(undefined);
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Test Script');
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Language: PowerShell');
    });
  });

  describe('Tenants Handler', () => {
    it('should provide tenant tools', () => {
      const tools = tenantsHandler.getTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.map(t => t.name)).toContain('immybot_tenants_list');
      expect(tools.map(t => t.name)).toContain('immybot_tenants_get');
    });

    it('should handle tenants list', async () => {
      const result = await tenantsHandler.handleCall('immybot_tenants_list', {});
      expect(result.isError).toBe(undefined);
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Found 1 tenants');
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Test Tenant');
    });

    it('should handle tenants get', async () => {
      const result = await tenantsHandler.handleCall('immybot_tenants_get', { tenantId: 1 });
      expect(result.isError).toBe(undefined);
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Test Tenant');
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Status: Active');
    });
  });

  describe('Maintenance Sessions Handler', () => {
    it('should provide maintenance session tools', () => {
      const tools = maintenanceSessionsHandler.getTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.map(t => t.name)).toContain('immybot_maintenance_sessions_list');
      expect(tools.map(t => t.name)).toContain('immybot_maintenance_sessions_get');
    });

    it('should handle maintenance sessions list', async () => {
      const result = await maintenanceSessionsHandler.handleCall('immybot_maintenance_sessions_list', {});
      expect(result.isError).toBe(undefined);
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Found 1 maintenance sessions');
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Session ID 1');
    });

    it('should handle maintenance sessions get', async () => {
      const result = await maintenanceSessionsHandler.handleCall('immybot_maintenance_sessions_get', { sessionId: 1 });
      expect(result.isError).toBe(undefined);
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Maintenance Session ID: 1');
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Status: Completed');
    });
  });

  describe('Tasks Handler', () => {
    it('should provide task tools', () => {
      const tools = tasksHandler.getTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.map(t => t.name)).toContain('immybot_tasks_list');
      expect(tools.map(t => t.name)).toContain('immybot_tasks_get');
    });

    it('should handle tasks list', async () => {
      const result = await tasksHandler.handleCall('immybot_tasks_list', {});
      expect(result.isError).toBe(undefined);
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Found 1 tasks');
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Test Task');
    });

    it('should handle tasks get', async () => {
      const result = await tasksHandler.handleCall('immybot_tasks_get', { taskId: 1 });
      expect(result.isError).toBe(undefined);
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Test Task');
      expect((result.content[0] as {type: 'text'; text: string}).text).toContain('Type: SoftwareInstall');
    });
  });
});

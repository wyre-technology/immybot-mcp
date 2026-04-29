import type { DomainHandler, NavigationState } from '../utils/types.js';
import { getCurrentState } from './navigation.js';

/**
 * Domain registry with lazy loading
 */

let domainHandlers: Record<string, DomainHandler> | null = null;

async function loadDomainHandlers(): Promise<Record<string, DomainHandler>> {
  if (domainHandlers) {
    return domainHandlers;
  }

  // Lazy load all domain handlers
  const [
    navigation,
    computers,
    software,
    deployments,
    scripts,
    tenants,
    maintenanceSessions,
    tasks
  ] = await Promise.all([
    import('./navigation.js'),
    import('./computers.js'),
    import('./software.js'),
    import('./deployments.js'),
    import('./scripts.js'),
    import('./tenants.js'),
    import('./maintenance_sessions.js'),
    import('./tasks.js'),
  ]);

  domainHandlers = {
    navigation: navigation.navigationHandler,
    computers: computers.computersHandler,
    software: software.softwareHandler,
    deployments: deployments.deploymentsHandler,
    scripts: scripts.scriptsHandler,
    tenants: tenants.tenantsHandler,
    maintenance_sessions: maintenanceSessions.maintenanceSessionsHandler,
    tasks: tasks.tasksHandler,
  };

  return domainHandlers;
}

/**
 * Get tools for current navigation state
 */
export async function getAvailableTools() {
  const handlers = await loadDomainHandlers();
  const currentState = getCurrentState();

  if (currentState === 'root') {
    // Root state: only show navigation tools
    return handlers.navigation.getTools();
  } else {
    // Domain state: show navigation + domain tools
    const domainHandler = handlers[currentState];
    if (!domainHandler) {
      throw new Error(`No handler found for domain: ${currentState}`);
    }

    return [
      ...handlers.navigation.getTools(),
      ...domainHandler.getTools(),
    ];
  }
}

/**
 * Handle tool call by routing to appropriate domain handler
 */
export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>
) {
  const handlers = await loadDomainHandlers();

  // Navigation tools are always available
  if (toolName.startsWith('immybot_navigate') || toolName.startsWith('immybot_back') || toolName.startsWith('immybot_status')) {
    return handlers.navigation.handleCall(toolName, args);
  }

  // Route domain-specific tools
  const currentState = getCurrentState();

  if (currentState === 'root') {
    throw new Error('Domain-specific tools are not available in root state. Use immybot_navigate first.');
  }

  const domainHandler = handlers[currentState];
  if (!domainHandler) {
    throw new Error(`No handler found for domain: ${currentState}`);
  }

  return domainHandler.handleCall(toolName, args);
}
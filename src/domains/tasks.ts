import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult, RequestHandlerExtra } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';

/**
 * Tasks domain handler for background operation monitoring (read-only)
 */

function getTools(): Tool[] {
  return [
    {
      name: 'immybot_tasks_list',
      description: 'List background tasks with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          computerId: {
            type: 'number',
            description: 'Filter by computer ID',
          },
          tenantId: {
            type: 'number',
            description: 'Filter by tenant ID',
          },
          status: {
            type: 'string',
            enum: ['Queued', 'Running', 'Completed', 'Failed', 'Cancelled', 'Retrying'],
            description: 'Filter by task status',
          },
          type: {
            type: 'string',
            description: 'Filter by task type (e.g., SoftwareInstall, ScriptExecution)',
          },
          parentTaskId: {
            type: 'number',
            description: 'Filter by parent task ID',
          },
          priority: {
            type: 'string',
            enum: ['Low', 'Normal', 'High', 'Emergency'],
            description: 'Filter by task priority',
          },
          startDate: {
            type: 'string',
            description: 'Filter by start date (ISO format)',
          },
          endDate: {
            type: 'string',
            description: 'Filter by end date (ISO format)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default: 50)',
            default: 50,
          },
        },
      },
    },
    {
      name: 'immybot_tasks_get',
      description: 'Get details for a specific task by ID',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'number',
            description: 'Task ID',
          },
        },
        required: ['taskId'],
      },
    },
    {
      name: 'immybot_tasks_running',
      description: 'Get all currently running tasks',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'immybot_tasks_queued',
      description: 'Get all queued tasks waiting for execution',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'immybot_tasks_failed',
      description: 'Get all failed tasks',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'immybot_tasks_for_computer',
      description: 'Get tasks for a specific computer',
      inputSchema: {
        type: 'object',
        properties: {
          computerId: {
            type: 'number',
            description: 'Computer ID',
          },
        },
        required: ['computerId'],
      },
    },
    {
      name: 'immybot_tasks_for_tenant',
      description: 'Get tasks for a specific tenant',
      inputSchema: {
        type: 'object',
        properties: {
          tenantId: {
            type: 'number',
            description: 'Tenant ID',
          },
        },
        required: ['tenantId'],
      },
    },
    {
      name: 'immybot_tasks_by_type',
      description: 'Get tasks by type',
      inputSchema: {
        type: 'object',
        properties: {
          taskType: {
            type: 'string',
            description: 'Task type (e.g., SoftwareInstall, ScriptExecution, Maintenance)',
          },
        },
        required: ['taskType'],
      },
    },
    {
      name: 'immybot_tasks_queue_stats',
      description: 'Get task queue statistics',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'immybot_tasks_history',
      description: 'Get task execution history',
      inputSchema: {
        type: 'object',
        properties: {
          computerId: {
            type: 'number',
            description: 'Filter by computer ID',
          },
          tenantId: {
            type: 'number',
            description: 'Filter by tenant ID',
          },
          taskType: {
            type: 'string',
            description: 'Filter by task type',
          },
          startDate: {
            type: 'string',
            description: 'Start date for history (ISO format)',
          },
          endDate: {
            type: 'string',
            description: 'End date for history (ISO format)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default: 100)',
            default: 100,
          },
        },
      },
    },
    {
      name: 'immybot_tasks_dependencies',
      description: 'Get task dependencies',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'number',
            description: 'Task ID',
          },
        },
        required: ['taskId'],
      },
    },
    {
      name: 'immybot_tasks_child_tasks',
      description: 'Get child tasks for a parent task',
      inputSchema: {
        type: 'object',
        properties: {
          parentTaskId: {
            type: 'number',
            description: 'Parent task ID',
          },
        },
        required: ['parentTaskId'],
      },
    },
    {
      name: 'immybot_tasks_logs',
      description: 'Get logs for a specific task',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'number',
            description: 'Task ID',
          },
        },
        required: ['taskId'],
      },
    },
    {
      name: 'immybot_tasks_metrics',
      description: 'Get performance metrics for a task',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'number',
            description: 'Task ID',
          },
        },
        required: ['taskId'],
      },
    },
    {
      name: 'immybot_tasks_estimated_completion',
      description: 'Get estimated completion time for a running task',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'number',
            description: 'Task ID',
          },
        },
        required: ['taskId'],
      },
    },
  ];
}

async function handleCall(
  toolName: string,
  args: Record<string, unknown>,
  extra?: RequestHandlerExtra
): Promise<CallToolResult> {
  logger.debug('Tasks tool called', { toolName, args });

  try {
    const client = await getClient();

    switch (toolName) {
      case 'immybot_tasks_list': {
        const tasks = await client.tasks.list(args as any);

        const summary = `Found ${tasks.length} tasks`;
        const detailedList = tasks.map(task =>
          `• Task ${task.id} - ${task.name || 'Unnamed'}\n` +
          `  Type: ${task.type} | Status: ${task.status} | Priority: ${task.priority || 'Normal'}\n` +
          `  Computer: ${task.computerId || 'N/A'} | Tenant: ${task.tenantId || 'N/A'}\n` +
          `  Started: ${task.startedAt || 'Not started'} | Progress: ${task.progress || 0}%`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `${summary}\n\n${detailedList}`
          }],
        };
      }

      case 'immybot_tasks_get': {
        const taskId = args.taskId as number;
        const task = await client.tasks.get(taskId);

        const details = [
          `Task: ${task.name || 'Unnamed'} (ID: ${task.id})`,
          `Type: ${task.type}`,
          `Status: ${task.status}`,
          `Priority: ${task.priority || 'Normal'}`,
          `Computer ID: ${task.computerId || 'N/A'}`,
          `Tenant ID: ${task.tenantId || 'N/A'}`,
          `Parent Task ID: ${task.parentTaskId || 'None'}`,
          `Progress: ${task.progress || 0}%`,
          `Started: ${task.startedAt || 'Not started'}`,
          `Completed: ${task.completedAt || 'Not completed'}`,
          `Duration: ${task.duration || 'N/A'}`,
          `Exit Code: ${task.exitCode !== undefined ? task.exitCode : 'N/A'}`,
          `Description: ${task.description || 'No description'}`,
          `Error Message: ${task.errorMessage || 'No errors'}`,
          `Retry Count: ${task.retryCount || 0}`,
          `Max Retries: ${task.maxRetries || 'N/A'}`,
          `Created: ${task.createdAt}`,
          `Updated: ${task.updatedAt}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      case 'immybot_tasks_running': {
        const runningTasks = await client.tasks.getRunning();

        if (runningTasks.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No running tasks found'
            }],
          };
        }

        const taskList = runningTasks.map(task =>
          `• Task ${task.id}: ${task.name || task.type}\n` +
          `  Computer: ${task.computerId} | Progress: ${task.progress || 0}%\n` +
          `  Started: ${task.startedAt} | Duration: ${task.duration || 'N/A'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Running tasks:\n\n${taskList}`
          }],
        };
      }

      case 'immybot_tasks_queued': {
        const queuedTasks = await client.tasks.getQueued();

        if (queuedTasks.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No queued tasks found'
            }],
          };
        }

        const taskList = queuedTasks.map(task =>
          `• Task ${task.id}: ${task.name || task.type}\n` +
          `  Computer: ${task.computerId} | Priority: ${task.priority || 'Normal'}\n` +
          `  Created: ${task.createdAt}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Queued tasks:\n\n${taskList}`
          }],
        };
      }

      case 'immybot_tasks_failed': {
        const failedTasks = await client.tasks.getFailed();

        if (failedTasks.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No failed tasks found'
            }],
          };
        }

        const taskList = failedTasks.map(task =>
          `• Task ${task.id}: ${task.name || task.type}\n` +
          `  Computer: ${task.computerId} | Error: ${task.errorMessage || 'Unknown error'}\n` +
          `  Failed: ${task.completedAt} | Retry Count: ${task.retryCount || 0}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Failed tasks:\n\n${taskList}`
          }],
        };
      }

      case 'immybot_tasks_for_computer': {
        const computerId = args.computerId as number;
        const tasks = await client.tasks.getForComputer(computerId);

        if (tasks.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No tasks found for computer ID ${computerId}`
            }],
          };
        }

        const taskList = tasks.map(task =>
          `• Task ${task.id}: ${task.name || task.type}\n` +
          `  Status: ${task.status} | Progress: ${task.progress || 0}%\n` +
          `  Started: ${task.startedAt || 'Not started'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Tasks for computer ID ${computerId}:\n\n${taskList}`
          }],
        };
      }

      case 'immybot_tasks_for_tenant': {
        const tenantId = args.tenantId as number;
        const tasks = await client.tasks.getForTenant(tenantId);

        if (tasks.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No tasks found for tenant ID ${tenantId}`
            }],
          };
        }

        const taskList = tasks.map(task =>
          `• Task ${task.id}: ${task.name || task.type}\n` +
          `  Computer: ${task.computerId} | Status: ${task.status}\n` +
          `  Started: ${task.startedAt || 'Not started'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Tasks for tenant ID ${tenantId}:\n\n${taskList}`
          }],
        };
      }

      case 'immybot_tasks_by_type': {
        const taskType = args.taskType as string;
        const tasks = await client.tasks.getByType(taskType);

        if (tasks.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No tasks found of type "${taskType}"`
            }],
          };
        }

        const taskList = tasks.map(task =>
          `• Task ${task.id}: ${task.name || 'Unnamed'}\n` +
          `  Computer: ${task.computerId} | Status: ${task.status}\n` +
          `  Started: ${task.startedAt || 'Not started'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Tasks of type "${taskType}":\n\n${taskList}`
          }],
        };
      }

      case 'immybot_tasks_queue_stats': {
        const stats = await client.tasks.getQueueStats();

        const details = [
          `Task Queue Statistics:`,
          `• Total Tasks: ${stats.totalTasks}`,
          `• Queued Tasks: ${stats.queuedTasks}`,
          `• Running Tasks: ${stats.runningTasks}`,
          `• Completed Tasks: ${stats.completedTasks}`,
          `• Failed Tasks: ${stats.failedTasks}`,
          `• Average Queue Time: ${stats.averageQueueTime}`,
          `• Average Execution Time: ${stats.averageExecutionTime}`,
          `• Success Rate: ${stats.successRate}%`,
          `• Queue Depth: ${stats.queueDepth}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      case 'immybot_tasks_history': {
        const tasks = await client.tasks.getHistory(args as any);

        if (tasks.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No completed tasks found in history'
            }],
          };
        }

        const taskList = tasks.map(task =>
          `• Task ${task.id}: ${task.name || task.type}\n` +
          `  Computer: ${task.computerId} | Status: ${task.status}\n` +
          `  Completed: ${task.completedAt} | Duration: ${task.duration || 'N/A'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Task execution history:\n\n${taskList}`
          }],
        };
      }

      case 'immybot_tasks_dependencies': {
        const taskId = args.taskId as number;
        const dependencies = await client.tasks.getDependencies(taskId);

        const dependsOnList = dependencies.dependsOn.length > 0
          ? dependencies.dependsOn.map(dep => `• Task ${dep.id}: ${dep.name || dep.type} (${dep.status})`).join('\n')
          : '• None';

        const dependentsList = dependencies.dependents.length > 0
          ? dependencies.dependents.map(dep => `• Task ${dep.id}: ${dep.name || dep.type} (${dep.status})`).join('\n')
          : '• None';

        const details = [
          `Dependencies for Task ${taskId}:`,
          ``,
          `Depends on:`,
          dependsOnList,
          ``,
          `Dependents (tasks waiting for this):`,
          dependentsList,
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      case 'immybot_tasks_child_tasks': {
        const parentTaskId = args.parentTaskId as number;
        const childTasks = await client.tasks.getChildTasks(parentTaskId);

        if (childTasks.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No child tasks found for parent task ${parentTaskId}`
            }],
          };
        }

        const taskList = childTasks.map(task =>
          `• Task ${task.id}: ${task.name || task.type}\n` +
          `  Status: ${task.status} | Progress: ${task.progress || 0}%\n` +
          `  Started: ${task.startedAt || 'Not started'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Child tasks for parent task ${parentTaskId}:\n\n${taskList}`
          }],
        };
      }

      case 'immybot_tasks_logs': {
        const taskId = args.taskId as number;
        const logs = await client.tasks.getLogs(taskId);

        if (logs.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No logs found for task ${taskId}`
            }],
          };
        }

        const logList = logs.slice(0, 20).map(log => // Show latest 20 logs
          `[${log.timestamp}] ${log.level}: ${log.message}`
        ).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Logs for task ${taskId} (latest 20 entries):\n\n${logList}`
          }],
        };
      }

      case 'immybot_tasks_metrics': {
        const taskId = args.taskId as number;
        const metrics = await client.tasks.getMetrics(taskId);

        const details = [
          `Performance metrics for Task ${taskId}:`,
          `• Duration: ${metrics.duration} seconds`,
          `• CPU Usage: ${metrics.cpuUsage !== undefined ? metrics.cpuUsage + '%' : 'N/A'}`,
          `• Memory Usage: ${metrics.memoryUsage !== undefined ? metrics.memoryUsage + ' MB' : 'N/A'}`,
          `• Network Usage: ${metrics.networkUsage !== undefined ? metrics.networkUsage + ' MB' : 'N/A'}`,
          `• Disk Usage: ${metrics.diskUsage !== undefined ? metrics.diskUsage + ' MB' : 'N/A'}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      case 'immybot_tasks_estimated_completion': {
        const taskId = args.taskId as number;
        const estimate = await client.tasks.getEstimatedCompletion(taskId);

        const details = [
          `Completion estimate for Task ${taskId}:`,
          `• Estimated Completion Time: ${estimate.estimatedCompletionTime}`,
          `• Confidence Level: ${estimate.confidenceLevel}%`,
          `• Based on Historical Data: ${estimate.basedOnHistoricalData ? 'Yes' : 'No'}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tasks tool: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    logger.error('Tasks tool error', { toolName, error: error.message });

    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true,
    };
  }
}

export const tasksHandler: DomainHandler = { getTools, handleCall };
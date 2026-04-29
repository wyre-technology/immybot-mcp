import { getServerRef } from './server-ref.js';
import { logger } from './logger.js';

/**
 * Elicitation helpers for interactive tool calls
 * These functions help the LLM gather missing information from users
 */

/**
 * Elicit a selection from a list of options
 */
export async function elicitSelection<T>(
  prompt: string,
  options: Array<{ label: string; value: T }>,
  allowMultiple: boolean = false
): Promise<T | T[] | null> {
  const server = getServerRef();
  if (!server) {
    logger.warn('elicitSelection called but no server reference available');
    return null;
  }

  try {
    // Format options for display
    const optionsList = options.map((opt, index) =>
      `${index + 1}. ${opt.label}`
    ).join('\n');

    const fullPrompt = `${prompt}\n\nOptions:\n${optionsList}\n\nPlease select ${allowMultiple ? 'one or more numbers' : 'a number'} (1-${options.length}):`;

    // Note: In a real implementation, this would use MCP's elicitation mechanism
    // For now, we log and return null to indicate elicitation is needed
    logger.info('Elicitation needed', {
      type: 'selection',
      prompt: fullPrompt,
      optionCount: options.length
    });

    return null;
  } catch (error) {
    logger.error('elicitSelection failed', { error, prompt });
    return null;
  }
}

/**
 * Elicit text input from the user
 */
export async function elicitText(
  prompt: string,
  placeholder?: string,
  required: boolean = false
): Promise<string | null> {
  const server = getServerRef();
  if (!server) {
    logger.warn('elicitText called but no server reference available');
    return null;
  }

  try {
    const fullPrompt = `${prompt}${placeholder ? ` (${placeholder})` : ''}${required ? ' *' : ''}:`;

    logger.info('Elicitation needed', {
      type: 'text',
      prompt: fullPrompt,
      required
    });

    return null;
  } catch (error) {
    logger.error('elicitText failed', { error, prompt });
    return null;
  }
}

/**
 * Elicit confirmation for destructive actions
 */
export async function elicitConfirmation(
  action: string,
  details?: string,
  warningLevel: 'low' | 'medium' | 'high' = 'medium'
): Promise<boolean | null> {
  const server = getServerRef();
  if (!server) {
    logger.warn('elicitConfirmation called but no server reference available');
    return null;
  }

  try {
    const warningEmoji = {
      low: '⚠️',
      medium: '🚨',
      high: '💥'
    }[warningLevel];

    const fullPrompt = `${warningEmoji} Confirm Action: ${action}${details ? `\n\nDetails: ${details}` : ''}\n\nThis action cannot be undone. Are you sure you want to proceed? (yes/no):`;

    logger.info('Confirmation needed', {
      type: 'confirmation',
      action,
      details,
      warningLevel
    });

    return null;
  } catch (error) {
    logger.error('elicitConfirmation failed', { error, action });
    return null;
  }
}

/**
 * Elicit date range for filtering operations
 */
export async function elicitDateRange(
  prompt: string = 'Select date range for filtering'
): Promise<{ startDate: string; endDate: string } | null> {
  const server = getServerRef();
  if (!server) {
    logger.warn('elicitDateRange called but no server reference available');
    return null;
  }

  try {
    const fullPrompt = `${prompt}\n\nPlease provide:\n- Start date (YYYY-MM-DD or relative like "7 days ago")\n- End date (YYYY-MM-DD or "today")`;

    logger.info('Date range elicitation needed', {
      type: 'dateRange',
      prompt: fullPrompt
    });

    return null;
  } catch (error) {
    logger.error('elicitDateRange failed', { error, prompt });
    return null;
  }
}
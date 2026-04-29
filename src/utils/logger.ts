/**
 * Structured logger for MCP server
 * All output goes to stderr to avoid interfering with MCP protocol on stdout
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getConfiguredLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  return LEVELS[level] !== undefined ? level : 'info';
}

function log(level: LogLevel, message: string, context?: unknown): void {
  if (LEVELS[level] < LEVELS[getConfiguredLevel()]) return;

  const timestamp = new Date().toISOString();
  const prefix = `${timestamp} [${level.toUpperCase()}]`;

  const logMessage = context !== undefined
    ? `${prefix} ${message} ${JSON.stringify(context)}`
    : `${prefix} ${message}`;

  console.error(logMessage);
}

export const logger = {
  debug: (msg: string, ctx?: unknown) => log('debug', msg, ctx),
  info:  (msg: string, ctx?: unknown) => log('info',  msg, ctx),
  warn:  (msg: string, ctx?: unknown) => log('warn',  msg, ctx),
  error: (msg: string, ctx?: unknown) => log('error', msg, ctx),
};
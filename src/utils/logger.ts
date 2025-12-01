/**
 * Simple logger utility for MCP Server
 * Logs to stderr to avoid interfering with stdio MCP communication
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel;
  private isStdioMode: boolean;

  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.isStdioMode = process.env.MCP_MODE === 'stdio';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    let formattedArgs = '';
    if (args.length > 0) {
      formattedArgs = ' ' + args.map(arg => {
        if (arg instanceof Error) {
          return `${arg.message}\n${arg.stack}`;
        }
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
    }

    return `${prefix} ${message}${formattedArgs}`;
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) return;

    // In stdio mode, only output to stderr and only for errors
    if (this.isStdioMode && level !== 'error') {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, ...args);
    console.error(formattedMessage);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }
}

export const logger = new Logger();


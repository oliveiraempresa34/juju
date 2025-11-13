/**
 * Logger utility - centralized logging
 * TODO: Migrate to Winston when package is installed
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogMeta {
  [key: string]: unknown;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  info(message: string, meta?: LogMeta): void {
    console.log(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: LogMeta): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, error?: Error | LogMeta, meta?: LogMeta): void {
    if (error instanceof Error) {
      console.error(this.formatMessage('error', message, { ...meta, error: error.message, stack: error.stack }));
    } else {
      console.error(this.formatMessage('error', message, error || meta));
    }
  }

  debug(message: string, meta?: LogMeta): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

export const logger = new Logger();

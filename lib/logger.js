// lib/logger.js
// Enterprise-level logging system for RapidRoutes

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const isProduction = process.env.NODE_ENV === 'production';
const currentLogLevel = isProduction ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;

class Logger {
  constructor(context = 'APP') {
    this.context = context;
  }

  error(message, error = null, metadata = {}) {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      const logEntry = {
        level: 'ERROR',
        context: this.context,
        message,
        timestamp: new Date().toISOString(),
        error: error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : null,
        metadata
      };

      console.error(JSON.stringify(logEntry, null, isProduction ? 0 : 2));
    }
  }

  warn(message, metadata = {}) {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      const logEntry = {
        level: 'WARN',
        context: this.context,
        message,
        timestamp: new Date().toISOString(),
        metadata
      };

      console.warn(JSON.stringify(logEntry, null, isProduction ? 0 : 2));
    }
  }

  info(message, metadata = {}) {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      const logEntry = {
        level: 'INFO',
        context: this.context,
        message,
        timestamp: new Date().toISOString(),
        metadata
      };

      console.log(JSON.stringify(logEntry, null, isProduction ? 0 : 2));
    }
  }

  debug(message, metadata = {}) {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      const logEntry = {
        level: 'DEBUG',
        context: this.context,
        message,
        timestamp: new Date().toISOString(),
        metadata
      };

      console.log(JSON.stringify(logEntry, null, isProduction ? 0 : 2));
    }
  }

  // CSV Export specific logging
  csvExport(operation, metadata = {}) {
    this.info(`CSV Export: ${operation}`, {
      operation,
      ...metadata
    });
  }

  // Performance monitoring
  time(label) {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        this.info(`Performance: ${label}`, { duration: `${duration}ms` });
        return duration;
      }
    };
  }
}

// Create context-specific loggers
export const createLogger = (context) => new Logger(context);

// Pre-configured loggers for common contexts
export const apiLogger = new Logger('API');
export const csvLogger = new Logger('CSV_EXPORT');
export const crawlLogger = new Logger('CRAWLER');
export const dbLogger = new Logger('DATABASE');

export default Logger;

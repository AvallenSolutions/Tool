import pino from 'pino';

// Create logger configuration
const loggerConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  
  // Use pino-pretty for development formatting
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname,reqId',
        singleLine: true
      }
    }
  }),

  // Production formatting
  ...(process.env.NODE_ENV === 'production' && {
    formatters: {
      level: (label) => ({ level: label }),
      log: (object) => ({ ...object })
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['password', 'token', 'apiKey', 'authorization', 'cookie'],
      censor: '[Redacted]'
    }
  })
};

// Create main logger
export const logger = pino(loggerConfig);

// Create request logger with correlation ID support
export const createRequestLogger = (requestId?: string) => {
  return logger.child({ reqId: requestId });
};

// Utility functions for common log patterns
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error({
    err: error,
    stack: error.stack,
    ...context
  }, error.message);
};

export const logPerformance = (operation: string, duration: number, context?: Record<string, any>) => {
  logger.info({
    operation,
    duration,
    ...context
  }, `Performance: ${operation} completed in ${duration}ms`);
};

export const logAuth = (event: string, user?: { id: string | number, email?: string }, context?: Record<string, any>) => {
  logger.info({
    event,
    userId: user?.id,
    userEmail: user?.email ? user.email.replace(/(.{3}).*@/, '$1***@') : undefined, // Partially redact email
    ...context
  }, `Auth: ${event}`);
};

export const logDatabase = (operation: string, table: string, duration?: number, context?: Record<string, any>) => {
  logger.debug({
    operation,
    table,
    duration,
    ...context
  }, `Database: ${operation} on ${table}${duration ? ` (${duration}ms)` : ''}`);
};

export const logAPI = (method: string, path: string, statusCode: number, duration: number, context?: Record<string, any>) => {
  const level = statusCode >= 400 ? 'warn' : statusCode >= 500 ? 'error' : 'info';
  logger[level]({
    method,
    path,
    statusCode,
    duration,
    ...context
  }, `API: ${method} ${path} ${statusCode} (${duration}ms)`);
};

// Export logger as default
export default logger;
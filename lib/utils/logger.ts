import winston from 'winston';

// Create custom log format that's structured and readable
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, requestId, userId, customerId, ...meta } = info;
    const logEntry: Record<string, any> = {
      timestamp,
      level,
      message,
    };
    if (requestId) logEntry.requestId = requestId;
    if (userId) logEntry.userId = userId;
    if (customerId) logEntry.customerId = customerId;
    Object.assign(logEntry, meta);
    
    return JSON.stringify(logEntry);
  })
);

// Define log levels with severity mapping
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Create transports based on environment
const transports = [
  // Console transport for development
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.simple()
    ),
  }),
];

// Add file transport for production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    // Error logs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: logFormat,
    }) as any,
    // Combined logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      format: logFormat,
    }) as any
  );
}

// Create the main logger instance
const mainLogger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'revops-automation-platform',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports,
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Logger factory for context-specific loggers
export function getLogger(context: string) {
  return {
    error: (message: string, meta?: Record<string, any>) => {
      mainLogger.error(message, { context, ...meta });
    },
    warn: (message: string, meta?: Record<string, any>) => {
      mainLogger.warn(message, { context, ...meta });
    },
    info: (message: string, meta?: Record<string, any>) => {
      mainLogger.info(message, { context, ...meta });
    },
    debug: (message: string, meta?: Record<string, any>) => {
      mainLogger.debug(message, { context, ...meta });
    },
    // Structured logging methods
    apiRequest: (method: string, path: string, meta?: Record<string, any>) => {
      mainLogger.info('API Request', { 
        context, 
        event: 'api_request',
        method, 
        path, 
        ...meta 
      });
    },
    apiResponse: (method: string, path: string, statusCode: number, responseTime: number, meta?: Record<string, any>) => {
      mainLogger.info('API Response', { 
        context, 
        event: 'api_response',
        method, 
        path, 
        statusCode,
        responseTime,
        ...meta 
      });
    },
    apiError: (method: string, path: string, error: Error, meta?: Record<string, any>) => {
      mainLogger.error('API Error', { 
        context, 
        event: 'api_error',
        method, 
        path, 
        error: error.message,
        stack: error.stack,
        ...meta 
      });
    },
    databaseQuery: (query: string, duration: number, meta?: Record<string, any>) => {
      mainLogger.debug('Database Query', { 
        context, 
        event: 'db_query',
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        duration,
        ...meta 
      });
    },
    integrationEvent: (provider: string, eventType: string, meta?: Record<string, any>) => {
      mainLogger.info('Integration Event', { 
        context, 
        event: 'integration_event',
        provider, 
        eventType,
        ...meta 
      });
    },
    aiProcessing: (model: string, promptTokens: number, responseTokens: number, duration: number, meta?: Record<string, any>) => {
      mainLogger.info('AI Processing', { 
        context, 
        event: 'ai_processing',
        model,
        promptTokens,
        responseTokens,
        duration,
        cost: calculateCost(model, promptTokens, responseTokens),
        ...meta 
      });
    },
    alertTriggered: (alertType: string, severity: string, entityId: string, meta?: Record<string, any>) => {
      mainLogger.warn('Alert Triggered', { 
        context, 
        event: 'alert_triggered',
        alertType,
        severity,
        entityId,
        ...meta 
      });
    },
    syncOperation: (provider: string, operation: string, recordsProcessed: number, duration: number, meta?: Record<string, any>) => {
      mainLogger.info('Sync Operation', { 
        context, 
        event: 'sync_operation',
        provider,
        operation,
        recordsProcessed,
        duration,
        ...meta 
      });
    },
    securityEvent: (eventType: string, ip: string, userAgent?: string, meta?: Record<string, any>) => {
      mainLogger.warn('Security Event', { 
        context, 
        event: 'security_event',
        eventType,
        ip,
        userAgent,
        ...meta 
      });
    },
  };
}

// Performance monitoring utilities
export function createPerformanceLogger(operation: string, context: string) {
  const startTime = Date.now();
  const logger = getLogger(context);

  return {
    // End timing and log the performance
    end: (meta?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      logger.info(`Performance: ${operation}`, { 
        operation, 
        duration,
        ...meta 
      });
      return duration;
    },
    // Get current duration without ending
    elapsed: () => Date.now() - startTime,
    // Log intermediate timing points
    checkpoint: (checkpoint: string, meta?: Record<string, any>) => {
      const elapsed = Date.now() - startTime;
      logger.debug(`Checkpoint: ${operation} - ${checkpoint}`, { 
        operation, 
        checkpoint,
        elapsed,
        ...meta 
      });
    },
  };
}

// Structured error logging
export function logError(error: Error, context: string, meta: Record<string, any> = {}) {
  const logger = getLogger(context);
  
  logger.error('Unhandled Error', {
    error: error.message,
    stack: error.stack,
    name: error.name,
    ...meta
  });
}

// Cost calculation for AI models
function calculateCost(model: string, promptTokens: number, responseTokens: number): number {
  // Simplified cost calculation - update with actual pricing
  const costs = {
    'claude-3-sonnet-20241022': { input: 0.003, output: 0.015 }, // per 1000 tokens
    'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    'gemini-1.5-pro': { input: 0.0035, output: 0.0105 },
  };

  const modelCost = costs[model as keyof typeof costs] || { input: 0.001, output: 0.002 };
  
  return (promptTokens / 1000) * modelCost.input + (responseTokens / 1000) * modelCost.output;
}

// Query logger for database operations
export function logQuery(query: string, params: any[], duration: number, context: string) {
  const logger = getLogger(context);
  logger.databaseQuery(query, duration, { 
    paramCount: params.length,
    queryType: query.trim().split(' ')[0]?.toUpperCase() 
  });
}

// Metrics aggregation
export class MetricsLogger {
  private context: string;
  private metrics: Map<string, number[]> = new Map();

  constructor(context: string) {
    this.context = context;
  }

  // Record a metric value
  record(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  // Get statistics for a metric
  getStats(name: string): { count: number; min: number; max: number; avg: number; median: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const min = sorted[0];
    const max = sorted[count - 1];
    const avg = values.reduce((sum, v) => sum + v, 0) / count;
    const median = sorted[Math.floor(count / 2)];

    return { count, min, max, avg, median };
  }

  // Log all metrics
  logAll(): void {
    const logger = getLogger(this.context);
    
    for (const [name, values] of this.metrics.entries()) {
      const stats = this.getStats(name);
      if (stats) {
        logger.info(`Metrics: ${name}`, stats);
      }
    }
  }

  // Reset all metrics
  reset(): void {
    this.metrics.clear();
  }
}

// Request tracer for distributed tracing
export class RequestTracer {
  private static traceContext = new Map<string, any>();

  static startTrace(requestId: string, context: Record<string, any>): void {
    this.traceContext.set(requestId, {
      ...context,
      startTime: Date.now(),
      checkpoints: new Map<string, number>(),
    });
  }

  static addCheckpoint(requestId: string, name: string, context?: Record<string, any>): void {
    const trace = this.traceContext.get(requestId);
    if (!trace) return;

    const elapsed = Date.now() - trace.startTime;
    trace.checkpoints.set(name, {
      elapsed,
      timestamp: Date.now(),
      ...context,
    });
  }

  static endTrace(requestId: string, finalContext?: Record<string, any>): void | Record<string, any> {
    const trace = this.traceContext.get(requestId);
    if (!trace) return;

    const traceData = {
      ...trace,
      totalTime: Date.now() - trace.startTime,
      endTime: Date.now(),
      ...finalContext,
    };

    // Log the trace
    const logger = getLogger('trace');
    logger.info('Request Trace Complete', traceData);

    // Clean up
    this.traceContext.delete(requestId);
    return traceData;
  }

  static getTrace(requestId: string): Record<string, any> | null {
    return this.traceContext.get(requestId) || null;
  }
}

// Export default logger for convenience
export const logger = getLogger('default');

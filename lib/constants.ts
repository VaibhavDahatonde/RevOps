// System constants and configuration

export const SYSTEM_CONFIG = {
  API_VERSION: 'v1',
  SYSTEM_NAME: 'RevOps Automation Platform',
  VERSION: '1.0.0',
  MAX_REQUEST_SIZE: '10mb',
  MAX_UPLOAD_SIZE: '100mb',
} as const;

export const DATABASE_CONFIG = {
  MAX_CONNECTIONS: 20,
  CONNECTION_TIMEOUT: 30000,
  IDLE_TIMEOUT: 60000,
  QUERY_TIMEOUT: 10000,
  BATCH_SIZE: 1000,
  MIGRATION_TIMEOUT: 300000,
} as const;

export const REDIS_CONFIG = {
  URL: process.env.REDIS_URL, // Upstash Redis URL format
  HOST: process.env.REDIS_HOST || 'localhost', // Fallback for local Redis
  PORT: parseInt(process.env.REDIS_PORT || '6379'),
  PASSWORD: process.env.REDIS_PASSWORD,
  DB: 0,
  KEY_PREFIX: 'revops:',
  DEFAULT_TTL: 3600, // 1 hour
  SESSION_TTL: 86400, // 24 hours
  QUEUE_TTL: 604800, // 7 days
  USE_UPSTASH: !!process.env.REDIS_URL, // Use Upstash if REDIS_URL is provided
} as const;

export const AI_CONFIG = {
  CLAUDE: {
    MODEL: 'claude-3-sonnet-20241022',
    MAX_TOKENS: 4000,
    TEMPERATURE: 0.1,
    TIMEOUT: 30000, // 30 seconds
  },
  GOOGLE_AI: {
    MODEL: 'gemini-1.5-pro',
    MAX_TOKENS: 4096,
    TEMPERATURE: 0.2,
  },
  RATE_LIMITS: {
    REQUESTS_PER_MINUTE: 60,
    TOKENS_PER_MINUTE: 50000,
    CONCURRENT_REQUESTS: 5,
  },
} as const;

export const QUEUE_CONFIG = {
  DEFAULT_CONCURRENCY: 50,
  MAX_CONCURRENCY: 100,
  JOB_ATTEMPTS: 3,
  BACKOFF_TYPE: 'exponential' as const,
  REMOVE_ON_COMPLETE: 1000,
  REMOVE_ON_FAIL: 1000,
  STALLED_INTERVAL: 30000,
  JOB_TIMEOUT: 300000, // 5 minutes
} as const;

export const WEBHOOK_CONFIG = {
  MAX_PAYLOAD_SIZE: '5mb',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  SIGNATURE_HEADER: 'x-signature',
  TIMESTAMP_HEADER: 'x-timestamp',
  SUPPORTED_PROVIDERS: [
    'salesforce',
    'hubspot',
    'outreach',
    'salesloft',
    'gong',
    'marketo',
    'zendesk',
    'freshdesk',
    'stripe',
    'chargebee',
    'slack',
    'microsoft-teams',
  ],
} as const;

export const SECURITY_CONFIG = {
  JWT_EXPIRES_IN: '7d',
  REFRESH_TOKEN_EXPIRES_IN: '30d',
  JWT_ALGORITHM: 'HS256',
  BCRYPT_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 900, // 15 minutes
  SESSION_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  OAUTH_EXPIRY_BUFFER: 300, // 5 minutes
} as const;

export const METRICS_CONFIG = {
  COLLECTION_INTERVAL: 60000, // 1 minute
  RETENTION_DAYS: 90,
  AGGREGATION_WINDOWS: ['1m', '5m', '15m', '1h', '1d', '7d'],
  ALERT_THRESHOLDS: {
    ERROR_RATE: 0.05, // 5%
    RESPONSE_TIME: 2000, // 2 seconds
    QUEUE_DEPTH: 10000,
    MEMORY_USAGE: 0.85, // 85%
  },
} as const;

// Entity types used throughout the system
export enum EntityType {
  DEAL = 'DEAL',
  ACCOUNT = 'ACCOUNT',
  CONTACT = 'CONTACT',
  ACTIVITY = 'ACTIVITY',
  CAMPAIGN = 'CAMPAIGN',
  SUPPORT_TICKET = 'SUPPORT_TICKET',
  INVOICE = 'INVOICE',
  SUBSCRIPTION = 'SUBSCRIPTION',
  USER = 'USER',
  CUSTOMER = 'CUSTOMER',
}

export enum ActivityType {
  EMAIL = 'EMAIL',
  CALL = 'CALL',
  MEETING = 'MEETING',
  TASK = 'TASK',
  NOTE = 'NOTE',
  WEB_VISIT = 'WEB_VISIT',
  CUSTOM_EVENT = 'CUSTOM_EVENT',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertType {
  RISK = 'RISK',
  OPPORTUNITY = 'OPPORTUNITY',
  DEADLINE = 'DEADLINE',
  SYSTEM = 'SYSTEM',
}

export enum INTEGRATION_PROVIDER {
  SALESFORCE = 'salesforce',
  HUBSPOT = 'hubspot',
  GONG = 'gong',
  STRIPE = 'stripe',
  OUTREACH = 'outreach',
  SALESLOFT = 'salesloft',
  ZENDESK = 'zendesk',
  SLACK = 'slack',
}

export enum AUTH_TYPE {
  OAUTH2 = 'oauth2',
  API_KEY = 'api_key',
  BASIC = 'basic',
}

export enum INTEGRATION_STATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
}

// Alias for backwards compatibility
export enum IntegrationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
}

export enum HygieneRuleType {
  FIELD_VALIDATION = 'FIELD_VALIDATION',
  BUSINESS_RULE = 'BUSINESS_RULE',
  DATA_QUALITY = 'DATA_QUALITY',
}

// Error codes for consistent error handling
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Integrations
  INTEGRATION_ERROR: 'INTEGRATION_ERROR',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  WEBHOOK_VERIFICATION_FAILED: 'WEBHOOK_VERIFICATION_FAILED',
  
  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  QUEUE_ERROR: 'QUEUE_ERROR',
  AI_PROCESSING_ERROR: 'AI_PROCESSING_ERROR',
  
  // Business Logic
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  SUSPENDED_ACCOUNT: 'SUSPENDED_ACCOUNT',
} as const;

// HTTP status codes mapping
export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100,
  DEFAULT_SORT: 'created_at',
  DEFAULT_ORDER: 'desc',
} as const;

// Cache keys patterns
export const CACHE_KEYS = {
  ENTITY: (entityType: string, id: string) => `entity:${entityType}:${id}`,
  METRICS: (customerId: string, type: string) => `metrics:${customerId}:${type}`,
  USER_SESSION: (userId: string) => `session:${userId}`,
  INTEGRATION_TOKEN: (integrationId: string) => `token:${integrationId}`,
  RATE_LIMIT: (customerId: string, window: string) => `rate:${customerId}:${window}`,
  WEBHOOK_EVENT: (eventId: string) => `webhook:${eventId}`,
  AI_RESPONSE: (promptHash: string) => `ai:${promptHash}`,
} as const;

// Queue names
export const QUEUE_NAMES = {
  WEBHOOK_PROCESSING: 'webhook-processing',
  BATCH_SYNC: 'batch-sync',
  AI_INSIGHTS: 'ai-insights',
  REPORT_GENERATION: 'report-generation',
  ALERT_PROCESSING: 'alert-processing',
  CLEANUP: 'cleanup',
  EMAIL_DELIVERY: 'email-delivery',
  SLACK_NOTIFICATION: 'slack-notification',
} as const;

// Event types for real-time updates
export const EVENT_TYPES = {
  ENTITY_CREATED: 'entity_created',
  ENTITY_UPDATED: 'entity_updated',
  ENTITY_DELETED: 'entity_deleted',
  METRIC_UPDATED: 'metric_updated',
  ALERT_CREATED: 'alert_created',
  INTEGRATION_STATUS_CHANGED: 'integration_status_changed',
  SYNC_PROGRESS_UPDATED: 'sync_progress_updated',
  REPORT_GENERATED: 'report_generated',
} as const;

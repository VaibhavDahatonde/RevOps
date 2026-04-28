import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ERROR_CODES, HTTP_STATUS_CODES } from '../constants';
import { getLogger } from '../utils/logger';

// Re-export for convenience
export { ERROR_CODES, HTTP_STATUS_CODES } from '../constants';

const logger = getLogger('api-middleware');

// Initialize Supabase client for auth
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface AuthenticatedUser {
  id: string;
  email: string;
  customerId: string;
  role: string;
  isActive: boolean;
}

export interface RequestContext {
  user?: AuthenticatedUser;
  ip: string;
  userAgent: string;
  requestId: string;
  startTime: number;
}

// Rate limiting using Redis (simplified for now, will use Redis later)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(options: {
  windowMs?: number;
  max?: number;
  message?: string;
}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const max = options.max || 100; // 100 requests per window default
  const message = options.message || 'Too many requests, please try again later.';

  return async (request: NextRequest, context: RequestContext): Promise<void> => {
    const key = `rate_limit:${context.user?.id || context.ip}:${context.ip}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }

    const current = rateLimitStore.get(key);
    
    if (!current || current.resetTime < now) {
      // New window or expired window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return;
    }

    if (current.count >= max) {
      throw new APIError(
        'RATE_LIMIT_EXCEEDED',
        message,
        HTTP_STATUS_CODES.TOO_MANY_REQUESTS
      );
    }

    current.count++;
  };
}

const defaultRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute
});

export async function authenticate(request: NextRequest): Promise<RequestContext> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  // Get token from Authorization header or cookie
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || 
                request.cookies.get('auth_token')?.value;

  let user: AuthenticatedUser | undefined;

  if (token) {
    try {
      // Verify JWT with Supabase
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
      
      if (error || !authUser) {
        logger.warn('Invalid authentication token', { requestId, ip });
        throw new APIError(
          'UNAUTHORIZED',
          'Invalid authentication token',
          HTTP_STATUS_CODES.UNAUTHORIZED
        );
      }

      // Use authenticated user directly - user IS the customer (1:1 relationship)
      user = {
        id: authUser.id,
        email: authUser.email || '',
        customerId: authUser.id, // 1:1 relationship: user_id === customer_id  
        role: 'USER', // Default role
        isActive: true, // Assume active if authenticated
      };

      logger.info('User authenticated', { 
        requestId, 
        userId: user.id, 
        customerId: user.customerId 
      });

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      logger.error('Authentication error', { error, requestId });
      throw new APIError(
        'INTERNAL_ERROR',
        'Authentication failed',
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  return {
    user,
    ip,
    userAgent,
    requestId,
    startTime,
  };
}

export function requireAuthentication(context: RequestContext): asserts context is RequestContext & { user: AuthenticatedUser } {
  if (!context.user) {
    throw new APIError(
      'UNAUTHORIZED',
      'Authentication required',
      HTTP_STATUS_CODES.UNAUTHORIZED
    );
  }
}

export function requireRole(requiredRole: string, anyOf: boolean = false) {
  return (context: RequestContext) => {
    requireAuthentication(context);
    
    const userRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRole = anyOf ? 
      userRoles.includes(context.user!.role) :
      context.user!.role === requiredRole;
    
    if (!hasRole) {
      logger.warn('Insufficient permissions', {
        requestId: context.requestId,
        userId: context.user!.id,
        userRole: context.user!.role,
        requiredRole,
      });
      
      throw new APIError(
        'FORBIDDEN',
        'Insufficient permissions',
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
  };
}

export function requireCustomerAccess(context: RequestContext) {
  requireAuthentication(context);
  // Additional customer-specific checks can be added here
  // For now, just ensure user is authenticated
}

export function corsMiddleware(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Customer-ID');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
}

export function errorHandler(error: unknown, context: RequestContext): NextResponse {
  const requestId = context.requestId;
  const executionTime = Date.now() - context.startTime;

  if (error instanceof APIError) {
    logger.error('API Error', {
      requestId,
      errorCode: error.code,
      message: error.message,
      userId: context.user?.id,
      customerId: context.user?.customerId,
      executionTime,
    });

    return createErrorResponse(error.code, error.message, error.statusCode, requestId);
  }

  // Handle unexpected errors
  logger.error('Unexpected error', {
    requestId,
    error: error instanceof Error ? error.message : String(error),
    userId: context.user?.id,
    customerId: context.user?.customerId,
    executionTime,
    stack: error instanceof Error ? error.stack : undefined,
  });

  return createErrorResponse(
    'INTERNAL_ERROR',
    'An unexpected error occurred',
    HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    requestId
  );
}

export function successResponse<T>(data: T, meta?: Record<string, any>): NextResponse {
  const response = {
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response);
}

export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status: HTTP_STATUS_CODES.CREATED }
  );
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  meta?: Record<string, any>
): NextResponse {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return successResponse(data, {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    },
    ...meta,
  });
}

function createErrorResponse(
  code: string,
  message: string,
  statusCode: number,
  requestId: string,
  details?: any
): NextResponse {
  const response = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    requestId,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: statusCode });
}

// Utility functions
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = request.ip || 
             realIP || 
             forwardedFor?.split(',')[0]?.trim() || 
             'unknown';
  
  return ip;
}

// API Error class
export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Validation middleware
export function validateRequest(schema: any) {
  return async (request: NextRequest, context: RequestContext): Promise<void> => {
    try {
      let body;
      
      if (request.method !== 'GET' && request.method !== 'DELETE') {
        body = await request.json();
      }

      const { error, value } = schema.validate(body || {}, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true,
      });

      if (error) {
        const details = error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        throw new APIError(
          'VALIDATION_ERROR',
          'Validation failed',
          HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          details
        );
      }

      // Attach validated data to request context (for internal processing)
      (context as any).validatedData = value;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(
        'VALIDATION_ERROR',
        'Invalid JSON in request body',
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
  };
}

// Response time monitoring
export function responseTimeMiddleware(request: NextRequest, context: RequestContext) {
  const startTime = Date.now();
  
  // Store start time in context for later use
  (context as any).startTime = startTime;
}

// Request logging
export function requestLogger(request: NextRequest, context: RequestContext) {
  const url = new URL(request.url);
  
  logger.info('API Request', {
    requestId: context.requestId,
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    ip: context.ip,
    userAgent: context.userAgent,
    userId: context.user?.id,
    customerId: context.user?.customerId,
  });
}

// Security headers middleware
export function securityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

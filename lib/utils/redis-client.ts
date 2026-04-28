import { createClient } from 'redis';
import { REDIS_CONFIG } from '../constants';
import { getLogger } from './logger';

const logger = getLogger('redis-client');

class RedisClientManager {
  private static instance: ReturnType<typeof createClient> | null = null;
  private static isConnected: boolean = false;

  static getInstance() {
    if (!RedisClientManager.instance) {
      RedisClientManager.instance = RedisClientManager.createClient();
    }
    return RedisClientManager.instance;
  }

  private static createClient() {
    let client;

    // Use Upstash Redis if REDIS_URL is provided
    if (REDIS_CONFIG.URL) {
      logger.info('Connecting to Upstash Redis', { url: REDIS_CONFIG.URL.replace(/:[^@]+@/, ':***@') });
      
      try {
        // Upstash Redis URL format: redis://user:password@host:port
        client = createClient({
          url: REDIS_CONFIG.URL,
        });
      } catch (error) {
        logger.error('Failed to create Upstash Redis client', { error });
        throw new Error('Upstash Redis connection failed');
      }
    } else {
      // Fallback to local Redis
      logger.info('Connecting to local Redis', { host: REDIS_CONFIG.HOST, port: REDIS_CONFIG.PORT });
      
      try {
        client = createClient({
          socket: {
            host: REDIS_CONFIG.HOST,
            port: REDIS_CONFIG.PORT,
          },
          password: REDIS_CONFIG.PASSWORD,
        });
      } catch (error) {
        logger.error('Failed to create local Redis client', { error });
        throw new Error('Local Redis connection failed');
      }
    }

    // Setup event listeners
    client.on('connect', () => {
      logger.info('Redis connected successfully');
      RedisClientManager.isConnected = true;
    });

    client.on('error', (error) => {
      logger.error('Redis connection error', { error });
      RedisClientManager.isConnected = false;
    });

    client.on('end', () => {
      logger.warn('Redis connection ended');
      RedisClientManager.isConnected = false;
    });

    // Connect to Redis
    client.connect().catch((error) => {
      logger.error('Failed to connect to Redis', { error });
      RedisClientManager.isConnected = false;
    });

    return client;
  }

  static async healthCheck(): Promise<{
    connected: boolean;
    source: string;
    error?: string;
  }> {
    const client = RedisClientManager.getInstance();
    
    try {
      await client.ping();
      return {
        connected: true,
        source: REDIS_CONFIG.URL ? 'Upstash' : 'Local',
      };
    } catch (error) {
      return {
        connected: false,
        source: REDIS_CONFIG.URL ? 'Upstash' : 'Local',
        error: (error as Error).message,
      };
    }
  }

  static isConnectedToRedis(): boolean {
    return RedisClientManager.isConnected;
  }

  static async disconnect(): Promise<void> {
    if (RedisClientManager.instance) {
      await RedisClientManager.instance.quit();
      RedisClientManager.instance = null;
      RedisClientManager.isConnected = false;
      logger.info('Redis disconnected');
    }
  }
}

// Export the singleton instance
export const redisClient = RedisClientManager.getInstance();

// Helper functions for common operations
export const RedisUtils = {
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    const client = RedisClientManager.getInstance();
    const fullKey = `${REDIS_CONFIG.KEY_PREFIX}${key}`;
    
    try {
      if (ttl) {
        await client.setEx(fullKey, ttl, value);
      } else {
        await client.set(fullKey, value);
      }
      return true;
    } catch (error) {
      logger.error('Redis SET failed', { key, error });
      return false;
    }
  },

  async get(key: string): Promise<string | null> {
    const client = RedisClientManager.getInstance();
    const fullKey = `${REDIS_CONFIG.KEY_PREFIX}${key}`;
    
    try {
      return await client.get(fullKey);
    } catch (error) {
      logger.error('Redis GET failed', { key, error });
      return null;
    }
  },

  async del(key: string): Promise<boolean> {
    const client = RedisClientManager.getInstance();
    const fullKey = `${REDIS_CONFIG.KEY_PREFIX}${key}`;
    
    try {
      const result = await client.del(fullKey);
      return result > 0;
    } catch (error) {
      logger.error('Redis DEL failed', { key, error });
      return false;
    }
  },

  async exists(key: string): Promise<boolean> {
    const client = RedisClientManager.getInstance();
    const fullKey = `${REDIS_CONFIG.KEY_PREFIX}${key}`;
    
    try {
      const result = await client.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS failed', { key, error });
      return false;
    }
  },

  async incr(key: string): Promise<number | null> {
    const client = RedisClientManager.getInstance();
    const fullKey = `${REDIS_CONFIG.KEY_PREFIX}${key}`;
    
    try {
      return await client.incr(fullKey);
    } catch (error) {
      logger.error('Redis INCR failed', { key, error });
      return null;
    }
  },

  async incrBy(key: string, amount: number): Promise<number | null> {
    const client = RedisClientManager.getInstance();
    const fullKey = `${REDIS_CONFIG.KEY_PREFIX}${key}`;
    
    try {
      return await client.incrBy(fullKey, amount);
    } catch (error) {
      logger.error('Redis INCRBY failed', { key, amount, error });
      return null;
    }
  },

  async ttl(key: string): Promise<number> {
    const client = RedisClientManager.getInstance();
    const fullKey = `${REDIS_CONFIG.KEY_PREFIX}${key}`;
    
    try {
      return await client.ttl(fullKey);
    } catch (error) {
      logger.error('Redis TTL failed', { key, error });
      return -1;
    }
  },

  // JSON operations (using JSON stringification)
  async setJSON(key: string, value: any, ttl?: number): Promise<boolean> {
    return this.set(key, JSON.stringify(value), ttl);
  },

  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch (error) {
      logger.error('Failed to parse JSON from Redis', { key, value, error });
      return null;
    }
  },

  // Rate limiting helper
  async rateLimitCheck(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const client = RedisClientManager.getInstance();
    const key = `rate_limit:${identifier}`;
    const fullKey = `${REDIS_CONFIG.KEY_PREFIX}${key}`;
    
    try {
      const pipeline = client.multi();
      
      // Get current count
      pipeline.get(fullKey);
      
      // Increment count
      pipeline.incr(fullKey);
      
      // Set expiration if key doesn't exist
      pipeline.expire(fullKey, Math.ceil(windowMs / 1000));
      
      const results = await pipeline.exec();
      
      const [getValue, incrValue] = results || [null, null];
      const count = (Array.isArray(incrValue) ? incrValue[1] as number : 0) || 1;
      const remaining = Math.max(0, limit - count);
      
      return {
        allowed: count <= limit,
        remaining,
        resetTime: Date.now() + parseInt((Array.isArray(getValue) ? getValue[1] as string : '0') || '0') * 1000,
      };
    } catch (error) {
      logger.error('Rate limit check failed', { identifier, limit, windowMs, error });
      return { allowed: false, remaining: 0, resetTime: Date.now() + windowMs };
    }
  },

  // Cache operations with TTL
  async cache(key: string, value: any, ttl: number = REDIS_CONFIG.DEFAULT_TTL): Promise<boolean> {
    return this.setJSON(key, value, ttl);
  },

  async getCached<T>(key: string): Promise<T | null> {
    return this.getJSON<T>(key);
  },

  // Invalidate cache pattern
  async invalidatePattern(pattern: string): Promise<number> {
    const client = RedisClientManager.getInstance();
 const fullPattern = `${REDIS_CONFIG.KEY_PREFIX}${pattern}`;
    
    try {
      const keys = await client.keys(fullPattern);
      if (keys.length === 0) return 0;
      
      return await client.del(keys);
    } catch (error) {
      logger.error('Cache invalidation failed', { pattern, error });
      return 0;
    }
  },
};

export default RedisClientManager.getInstance();
export { RedisClientManager };

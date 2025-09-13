import Redis from 'ioredis';
import { logger } from '../config/logger';

/**
 * Resilient Redis Connection Manager
 * 
 * Provides Redis connections with exponential backoff, circuit breaker pattern,
 * and feature flags for environment-specific behavior.
 */

export interface RedisConnectionConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  enabled?: boolean;
  enableCircuitBreaker?: boolean;
  maxRetries?: number;
  baseRetryDelay?: number;
  maxRetryDelay?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerResetTime?: number;
}

interface ConnectionState {
  isConnected: boolean;
  isCircuitOpen: boolean;
  retryCount: number;
  lastFailureTime: number;
  consecutiveFailures: number;
}

export class ResilientRedisManager {
  private static instances: Map<string, ResilientRedisManager> = new Map();
  private redis: Redis | null = null;
  private state: ConnectionState = {
    isConnected: false,
    isCircuitOpen: false,
    retryCount: 0,
    lastFailureTime: 0,
    consecutiveFailures: 0
  };
  
  private readonly config: Required<RedisConnectionConfig>;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lastLogTime = 0;
  private readonly LOG_THROTTLE_MS = 30000; // Only log errors every 30 seconds

  constructor(
    private readonly instanceName: string,
    config: RedisConnectionConfig = {}
  ) {
    this.config = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: config.password || process.env.REDIS_PASSWORD || '',
      db: config.db || 0,
      enabled: config.enabled ?? this.isRedisEnabled(),
      enableCircuitBreaker: config.enableCircuitBreaker ?? true,
      maxRetries: config.maxRetries ?? 5,
      baseRetryDelay: config.baseRetryDelay ?? 1000,
      maxRetryDelay: config.maxRetryDelay ?? 30000,
      circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5,
      circuitBreakerResetTime: config.circuitBreakerResetTime ?? 60000
    };

    if (this.config.enabled) {
      this.initializeConnection();
    } else {
      logger.info(
        { instance: this.instanceName }, 
        'Redis disabled by configuration - using memory-only cache'
      );
    }
  }

  /**
   * Get or create a Redis manager instance
   */
  static getInstance(instanceName: string, config?: RedisConnectionConfig): ResilientRedisManager {
    if (!ResilientRedisManager.instances.has(instanceName)) {
      ResilientRedisManager.instances.set(instanceName, new ResilientRedisManager(instanceName, config));
    }
    return ResilientRedisManager.instances.get(instanceName)!;
  }

  /**
   * Check if Redis is enabled based on environment
   */
  private isRedisEnabled(): boolean {
    const env = process.env.NODE_ENV || 'development';
    
    // Disable Redis in test environments
    if (env === 'test') return false;
    
    // Check explicit enable/disable flags
    if (process.env.REDIS_ENABLED === 'false') return false;
    if (process.env.REDIS_ENABLED === 'true') return true;
    
    // Enable in production and staging
    if (env === 'production' || env === 'staging') return true;
    
    // In development, only enable if Redis is available
    // This prevents log spam in local development
    return process.env.REDIS_HOST !== undefined;
  }

  /**
   * Initialize Redis connection with resilient error handling
   */
  private async initializeConnection(): Promise<void> {
    if (this.state.isCircuitOpen && !this.shouldTryCircuitReset()) {
      return;
    }

    try {
      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password || undefined,
        db: this.config.db,
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1, // Don't retry individual commands
        connectTimeout: 5000,
        commandTimeout: 3000,
        enableOfflineQueue: false, // Don't queue commands when disconnected
      });

      this.setupEventHandlers();
      
      // Test connection
      await this.redis.ping();
      
      this.onConnectionSuccess();
      
    } catch (error) {
      this.onConnectionFailure(error);
    }
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    if (!this.redis) return;

    this.redis.on('connect', () => {
      this.onConnectionSuccess();
    });

    this.redis.on('error', (error) => {
      this.onConnectionFailure(error);
    });

    this.redis.on('close', () => {
      this.state.isConnected = false;
      this.throttledLog('warn', 'Redis connection closed', { instance: this.instanceName });
    });

    this.redis.on('reconnecting', () => {
      this.throttledLog('info', 'Redis reconnecting', { instance: this.instanceName });
    });
  }

  /**
   * Handle successful connection
   */
  private onConnectionSuccess(): void {
    this.state.isConnected = true;
    this.state.isCircuitOpen = false;
    this.state.retryCount = 0;
    this.state.consecutiveFailures = 0;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    logger.info(
      { instance: this.instanceName }, 
      'Redis connection established successfully'
    );
  }

  /**
   * Handle connection failure with exponential backoff
   */
  private onConnectionFailure(error: unknown): void {
    this.state.isConnected = false;
    this.state.consecutiveFailures++;
    this.state.lastFailureTime = Date.now();
    
    // Open circuit breaker if enabled and threshold reached
    if (this.config.enableCircuitBreaker && 
        this.state.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      this.state.isCircuitOpen = true;
      this.throttledLog('warn', 'Redis circuit breaker opened', { 
        instance: this.instanceName,
        consecutiveFailures: this.state.consecutiveFailures 
      });
    }

    this.throttledLog('warn', 'Redis connection failed', { 
      instance: this.instanceName,
      error: error instanceof Error ? error.message : String(error),
      consecutiveFailures: this.state.consecutiveFailures
    });

    // Cleanup current connection
    if (this.redis) {
      this.redis.disconnect(false);
      this.redis = null;
    }

    // Schedule reconnection with exponential backoff
    this.scheduleReconnection();
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnection(): void {
    if (this.reconnectTimer || !this.config.enabled) return;

    const delay = Math.min(
      this.config.baseRetryDelay * Math.pow(2, this.state.retryCount),
      this.config.maxRetryDelay
    );

    this.state.retryCount++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.state.retryCount <= this.config.maxRetries) {
        this.initializeConnection();
      } else {
        this.throttledLog('error', 'Redis max retries exceeded', { 
          instance: this.instanceName,
          maxRetries: this.config.maxRetries 
        });
      }
    }, delay);
  }

  /**
   * Check if circuit breaker should reset
   */
  private shouldTryCircuitReset(): boolean {
    if (!this.state.isCircuitOpen) return true;
    
    const timeSinceLastFailure = Date.now() - this.state.lastFailureTime;
    return timeSinceLastFailure >= this.config.circuitBreakerResetTime;
  }

  /**
   * Throttled logging to prevent spam
   */
  private throttledLog(level: 'info' | 'warn' | 'error', message: string, meta: object): void {
    const now = Date.now();
    if (now - this.lastLogTime >= this.LOG_THROTTLE_MS) {
      logger[level](meta, message);
      this.lastLogTime = now;
    }
  }

  /**
   * Get Redis client if available
   */
  getClient(): Redis | null {
    if (!this.config.enabled || this.state.isCircuitOpen || !this.state.isConnected) {
      return null;
    }
    return this.redis;
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.config.enabled && this.state.isConnected && !this.state.isCircuitOpen;
  }

  /**
   * Get connection status
   */
  getStatus(): {
    enabled: boolean;
    connected: boolean;
    circuitOpen: boolean;
    consecutiveFailures: number;
    retryCount: number;
  } {
    return {
      enabled: this.config.enabled,
      connected: this.state.isConnected,
      circuitOpen: this.state.isCircuitOpen,
      consecutiveFailures: this.state.consecutiveFailures,
      retryCount: this.state.retryCount
    };
  }

  /**
   * Execute Redis operation with fallback
   */
  async execute<T>(
    operation: (redis: Redis) => Promise<T>,
    fallback?: () => Promise<T> | T
  ): Promise<T | null> {
    const client = this.getClient();
    
    if (!client) {
      if (fallback) {
        return await fallback();
      }
      return null;
    }

    try {
      return await operation(client);
    } catch (error) {
      this.onConnectionFailure(error);
      
      if (fallback) {
        return await fallback();
      }
      return null;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }

    this.state.isConnected = false;
    logger.info({ instance: this.instanceName }, 'Redis connection gracefully closed');
  }
}

// Create singleton instances for different use cases
export const redisManager = {
  monitoring: () => ResilientRedisManager.getInstance('monitoring', { db: 1 }),
  apiMetrics: () => ResilientRedisManager.getInstance('api-metrics', { db: 2 }),
  dbMetrics: () => ResilientRedisManager.getInstance('db-metrics', { db: 3 }),
  cache: () => ResilientRedisManager.getInstance('cache', { db: 0 })
};
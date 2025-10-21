const NodeCache = require('node-cache');
const logger = require('../utils/logger');

/**
 * Cache Service for Binance API responses
 * Uses in-memory cache with configurable TTL per endpoint type
 */
class CacheService {
  constructor() {
    // Initialize cache with default settings
    this.cache = new NodeCache({
      stdTTL: 60,           // Default TTL: 60 seconds
      checkperiod: 120,     // Check for expired keys every 2 minutes
      useClones: true,      // Clone cached objects to prevent modification
      deleteOnExpire: true  // Automatically delete expired keys
    });

    // Cache hit/miss statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };

    // Log stats every 5 minutes
    setInterval(() => this.logStats(), 5 * 60 * 1000);
  }

  /**
   * Define cache TTL rules for different endpoint patterns
   * Returns TTL in seconds, or 0 for no cache
   */
  getTTL(endpoint, method) {
    // Never cache private/signed endpoints
    if (this.isPrivateEndpoint(endpoint)) {
      return 0;
    }

    // Never cache POST/PUT/DELETE (mutations)
    if (method !== 'GET') {
      return 0;
    }

    // Exchange info - cache for 1 hour (rarely changes)
    if (endpoint.includes('/exchangeInfo')) {
      return 3600;
    }

    // Server time - cache for 5 seconds
    if (endpoint.includes('/time')) {
      return 5;
    }

    // 24hr ticker - cache for 10 seconds
    if (endpoint.includes('/ticker/24hr')) {
      return 10;
    }

    // Klines (candlestick) - cache based on interval
    if (endpoint.includes('/klines')) {
      return this.getKlinesCacheTTL(endpoint);
    }

    // Order book depth - cache for 2 seconds
    if (endpoint.includes('/depth')) {
      return 2;
    }

    // Recent trades - cache for 5 seconds
    if (endpoint.includes('/trades')) {
      return 5;
    }

    // Price ticker - cache for 5 seconds
    if (endpoint.includes('/ticker/price')) {
      return 5;
    }

    // Book ticker - cache for 2 seconds
    if (endpoint.includes('/ticker/bookTicker')) {
      return 2;
    }

    // Funding rate - cache for 30 seconds
    if (endpoint.includes('/fundingRate') || endpoint.includes('/premiumIndex')) {
      return 30;
    }

    // Default: no cache for unknown endpoints
    return 0;
  }

  /**
   * Get cache TTL for klines based on interval
   */
  getKlinesCacheTTL(endpoint) {
    // Extract interval from query string
    const intervalMatch = endpoint.match(/interval=(\w+)/);
    if (!intervalMatch) return 10;

    const interval = intervalMatch[1];

    // Longer intervals can be cached longer
    const intervalTTLMap = {
      '1m': 5,
      '3m': 10,
      '5m': 15,
      '15m': 30,
      '30m': 60,
      '1h': 120,
      '2h': 240,
      '4h': 300,
      '6h': 300,
      '8h': 300,
      '12h': 600,
      '1d': 600,
      '3d': 600,
      '1w': 600,
      '1M': 600
    };

    return intervalTTLMap[interval] || 10;
  }

  /**
   * Check if endpoint is private (requires signature)
   */
  isPrivateEndpoint(endpoint) {
    const privatePatterns = [
      '/account',
      '/order',
      '/myTrades',
      '/userTrades',
      '/balance',
      '/positionRisk',
      '/positionSide',
      '/positionMargin',
      '/leverage',
      '/marginType',
      '/income',
      '/commissionRate',
      '/allOrders',
      '/openOrders',
      '/sapi/',
      '/wapi/'
    ];

    return privatePatterns.some(pattern => endpoint.includes(pattern));
  }

  /**
   * Generate cache key from request
   */
  generateKey(method, endpoint, params) {
    // Sort params for consistent key generation
    const sortedParams = params ?
      Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') :
      '';

    return `${method}:${endpoint}:${sortedParams}`;
  }

  /**
   * Get cached response
   */
  get(method, endpoint, params) {
    const key = this.generateKey(method, endpoint, params);
    const value = this.cache.get(key);

    if (value !== undefined) {
      this.stats.hits++;
      logger.debug(`Cache HIT: ${key}`);
      return value;
    }

    this.stats.misses++;
    logger.debug(`Cache MISS: ${key}`);
    return null;
  }

  /**
   * Set cache with automatic TTL
   */
  set(method, endpoint, params, value) {
    const ttl = this.getTTL(endpoint, method);

    if (ttl === 0) {
      logger.debug(`Cache SKIP: ${endpoint} (not cacheable)`);
      return false;
    }

    const key = this.generateKey(method, endpoint, params);
    const success = this.cache.set(key, value, ttl);

    if (success) {
      this.stats.sets++;
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
    }

    return success;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.flushAll();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      total,
      hitRate: `${hitRate}%`,
      keys: this.cache.keys().length,
      size: this.cache.getStats()
    };
  }

  /**
   * Log cache statistics
   */
  logStats() {
    const stats = this.getStats();
    if (stats.total > 0) {
      logger.info('Cache stats', {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hitRate,
        cachedKeys: stats.keys
      });
    }
  }
}

module.exports = new CacheService();

/**
 * Simple in-memory cache for report data
 * Helps reduce database load for frequently accessed reports
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.expirations = new Map();
    this.defaultTTL = 15 * 60 * 1000; // 15 minutes in milliseconds
  }
  
  /**
   * Get a value from cache
   * @param {String} key - Cache key
   * @returns {*} Cached value or undefined if not found/expired
   */
  get(key) {
    // Check if key exists and hasn't expired
    if (this.cache.has(key) && this.expirations.get(key) > Date.now()) {
      console.log(`Cache hit for key: ${key}`);
      return this.cache.get(key);
    }
    
    // If expired, clean it up
    if (this.cache.has(key)) {
      console.log(`Cache expired for key: ${key}`);
      this.delete(key);
    }
    
    return undefined;
  }
  
  /**
   * Set a value in cache with expiration
   * @param {String} key - Cache key
   * @param {*} value - Value to cache
   * @param {Number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    console.log(`Setting cache for key: ${key}`);
    this.cache.set(key, value);
    this.expirations.set(key, Date.now() + ttl);
    
    // Schedule cleanup after TTL
    setTimeout(() => {
      this.delete(key);
    }, ttl);
  }
  
  /**
   * Delete a key from cache
   * @param {String} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    this.expirations.delete(key);
  }
  
  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.expirations.clear();
  }
  
  /**
   * Generate a cache key from parameters
   * @param {String} prefix - Key prefix (usually function/report name)
   * @param {...*} args - Arguments to include in key
   * @returns {String} Cache key
   */
  static generateKey(prefix, ...args) {
    return `${prefix}:${args.map(arg => 
      arg instanceof Date ? arg.toISOString() : 
      typeof arg === 'object' ? JSON.stringify(arg) :
      String(arg)
    ).join(':')}`;
  }
}

// Create a singleton instance
const cacheInstance = new CacheService();

export default cacheInstance;
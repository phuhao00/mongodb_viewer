import Redis from 'ioredis';
import { aiConfig } from '../config/aiConfig';

export interface CacheOptions {
  ttl?: number; // 过期时间（秒）
  tags?: string[]; // 缓存标签，用于批量清理
  compress?: boolean; // 是否压缩数据
  version?: string; // 缓存版本，用于版本控制
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

/**
 * 高级缓存管理器
 */
export class CacheManager {
  private redis: Redis | null = null;
  private memoryCache: Map<string, { value: any; expires: number }> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0
  };
  private keyPrefix: string;
  private defaultTTL: number;
  private compressionThreshold: number = 1024; // 1KB以上数据进行压缩

  constructor() {
    this.keyPrefix = aiConfig.redis.keyPrefix;
    this.defaultTTL = aiConfig.redis.ttl;
    
    if (aiConfig.features.cachingEnabled && aiConfig.redis.url) {
      this.initRedis();
    }
  }

  private async initRedis(): Promise<void> {
    // 在开发环境中，如果Redis不可用，直接使用内存缓存
    if (process.env.NODE_ENV === 'development' && !process.env.REDIS_URL) {
      console.log('开发环境：使用内存缓存替代Redis');
      this.redis = null;
      return;
    }

    try {
      this.redis = new Redis(aiConfig.redis.url, {
        maxRetriesPerRequest: 0, // 禁用重试
        lazyConnect: true,
        connectTimeout: 2000,
        enableOfflineQueue: false // 禁用离线队列
      });

      this.redis.on('error', (error) => {
        console.warn('Redis连接错误，切换到内存缓存');
        this.stats.errors++;
        this.redis = null;
      });

      this.redis.on('connect', () => {
        console.log('Redis连接成功');
      });

      // 测试连接（设置超时）
      const pingPromise = this.redis.ping();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('连接超时')), 2000)
      );
      
      await Promise.race([pingPromise, timeoutPromise]);
    } catch (error) {
      console.warn('Redis初始化失败，将使用内存缓存');
      this.redis = null;
    }
  }

  /**
   * 获取缓存
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!aiConfig.features.cachingEnabled) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key);
      let cached: string | null = null;
      
      if (this.redis) {
        cached = await this.redis.get(fullKey);
      } else {
        // 使用内存缓存
        const memoryCached = this.memoryCache.get(fullKey);
        if (memoryCached && memoryCached.expires > Date.now()) {
          cached = typeof memoryCached.value === 'string' ? memoryCached.value : JSON.stringify(memoryCached.value);
        } else if (memoryCached) {
          this.memoryCache.delete(fullKey);
        }
      }
      
      if (cached === null) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();

      // 尝试解析JSON
      try {
        const parsed = JSON.parse(cached);
        
        // 检查是否是压缩数据
        if (parsed._compressed) {
          return this.decompress(parsed.data);
        }
        
        return parsed;
      } catch {
        // 如果不是JSON，直接返回字符串
        return cached as T;
      }
    } catch (error) {
      console.error('缓存获取失败:', error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!aiConfig.features.cachingEnabled) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key);
      const ttl = options.ttl || this.defaultTTL;
      
      let dataToStore: string;
      
      if (typeof value === 'string') {
        dataToStore = value;
      } else {
        const jsonString = JSON.stringify(value);
        
        // 检查是否需要压缩
        if (options.compress && jsonString.length > this.compressionThreshold) {
          const compressed = this.compress(value);
          dataToStore = JSON.stringify({
            _compressed: true,
            data: compressed
          });
        } else {
          dataToStore = jsonString;
        }
      }

      if (this.redis) {
        await this.redis.setex(fullKey, ttl, dataToStore);
        
        // 设置标签（如果提供）
        if (options.tags && options.tags.length > 0) {
          await this.setTags(key, options.tags);
        }
        
        // 设置版本（如果提供）
        if (options.version) {
          await this.setVersion(key, options.version);
        }
      } else {
        // 使用内存缓存
        this.memoryCache.set(fullKey, {
          value: dataToStore,
          expires: Date.now() + ttl * 1000
        });
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('缓存设置失败:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<boolean> {
    if (!aiConfig.features.cachingEnabled) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key);
      let result = 0;
      
      if (this.redis) {
        result = await this.redis.del(fullKey);
        
        // 删除相关的标签和版本信息
        await this.deleteTags(key);
        await this.deleteVersion(key);
      } else {
        // 使用内存缓存
        const existed = this.memoryCache.has(fullKey);
        this.memoryCache.delete(fullKey);
        result = existed ? 1 : 0;
      }
      
      this.stats.deletes++;
      return result > 0;
    } catch (error) {
      console.error('缓存删除失败:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * 根据标签批量删除缓存
   */
  async deleteByTag(tag: string): Promise<number> {
    if (!this.redis || !aiConfig.features.cachingEnabled) {
      return 0;
    }

    try {
      const tagKey = this.buildTagKey(tag);
      const keys = await this.redis.smembers(tagKey);
      
      if (keys.length === 0) {
        return 0;
      }

      // 删除所有相关的缓存键
      const fullKeys = keys.map(key => this.buildKey(key));
      const result = await this.redis.del(...fullKeys);
      
      // 删除标签集合
      await this.redis.del(tagKey);
      
      this.stats.deletes += result;
      return result;
    } catch (error) {
      console.error('按标签删除缓存失败:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * 清空所有缓存
   */
  async flush(): Promise<boolean> {
    if (!aiConfig.features.cachingEnabled) {
      return false;
    }

    try {
      if (this.redis) {
        const pattern = `${this.keyPrefix}*`;
        const keys = await this.redis.keys(pattern);
        
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        // 清空内存缓存
        this.memoryCache.clear();
      }
      
      // 重置统计信息
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        hitRate: 0
      };
      
      return true;
    } catch (error) {
      console.error('清空缓存失败:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    if (!aiConfig.features.cachingEnabled) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key);
      
      if (this.redis) {
        const result = await this.redis.exists(fullKey);
        return result === 1;
      } else {
        // 使用内存缓存
        const cached = this.memoryCache.get(fullKey);
        if (cached && cached.expires > Date.now()) {
          return true;
        } else if (cached) {
          this.memoryCache.delete(fullKey);
        }
        return false;
      }
    } catch (error) {
      console.error('检查缓存存在性失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存TTL
   */
  async getTTL(key: string): Promise<number> {
    if (!aiConfig.features.cachingEnabled) {
      return -1;
    }

    try {
      const fullKey = this.buildKey(key);
      
      if (this.redis) {
        return await this.redis.ttl(fullKey);
      } else {
        // 使用内存缓存
        const cached = this.memoryCache.get(fullKey);
        if (cached) {
          const remaining = Math.max(0, cached.expires - Date.now());
          return Math.floor(remaining / 1000);
        }
        return -2; // 键不存在
      }
    } catch (error) {
      console.error('获取缓存TTL失败:', error);
      return -1;
    }
  }

  /**
   * 延长缓存过期时间
   */
  async extend(key: string, ttl: number): Promise<boolean> {
    if (!aiConfig.features.cachingEnabled) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key);
      
      if (this.redis) {
        const result = await this.redis.expire(fullKey, ttl);
        return result === 1;
      } else {
        // 使用内存缓存
        const cached = this.memoryCache.get(fullKey);
        if (cached) {
          cached.expires = Date.now() + ttl * 1000;
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('延长缓存过期时间失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存大小信息
   */
  async getSize(): Promise<{ keys: number; memory: string }> {
    if (!aiConfig.features.cachingEnabled) {
      return { keys: 0, memory: '0B' };
    }

    try {
      if (this.redis) {
        const pattern = `${this.keyPrefix}*`;
        const keys = await this.redis.keys(pattern);
        let memoryUsage = 0;
        if (keys.length > 0) {
          try {
            memoryUsage = await this.redis.memory('USAGE', keys[0]) as number;
          } catch {
            memoryUsage = 0;
          }
        }
        
        return {
          keys: keys.length,
          memory: this.formatBytes(memoryUsage)
        };
      } else {
        // 使用内存缓存
        const keys = Array.from(this.memoryCache.keys()).filter(key => key.startsWith(this.keyPrefix));
        const estimatedMemory = keys.length * 100; // 估算每个键100字节
        
        return {
          keys: keys.length,
          memory: this.formatBytes(estimatedMemory)
        };
      }
    } catch (error) {
      console.error('获取缓存大小失败:', error);
      return { keys: 0, memory: '0B' };
    }
  }

  // 私有方法
  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private buildTagKey(tag: string): string {
    return `${this.keyPrefix}tags:${tag}`;
  }

  private buildVersionKey(key: string): string {
    return `${this.keyPrefix}versions:${key}`;
  }

  private async setTags(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = this.buildTagKey(tag);
      await this.redis!.sadd(tagKey, key);
    }
  }

  private async deleteTags(key: string): Promise<void> {
    // 这里需要遍历所有标签来删除，实际实现中可以维护一个key->tags的映射
    // 为简化，这里暂时跳过
  }

  private async setVersion(key: string, version: string): Promise<void> {
    const versionKey = this.buildVersionKey(key);
    await this.redis!.set(versionKey, version);
  }

  private async deleteVersion(key: string): Promise<void> {
    const versionKey = this.buildVersionKey(key);
    await this.redis!.del(versionKey);
  }

  private compress(data: any): string {
    // 简单的压缩实现，实际项目中可以使用更高效的压缩算法
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private decompress(compressedData: string): any {
    try {
      const decompressed = Buffer.from(compressedData, 'base64').toString('utf-8');
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('解压缩失败:', error);
      return null;
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
  }

  /**
   * 关闭Redis连接
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

// 导出单例实例
export const cacheManager = new CacheManager();
export default cacheManager;
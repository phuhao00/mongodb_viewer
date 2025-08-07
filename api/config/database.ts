import { MongoClient, Db } from 'mongodb';
import { createClient, RedisClientType } from 'redis';

// MongoDB连接池管理
class DatabaseManager {
  private static instance: DatabaseManager;
  private connections: Map<string, MongoClient> = new Map();
  private redisClient: RedisClientType | null = null;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  // 创建MongoDB连接
  async createConnection(connectionId: string, uri: string, options: any = {}): Promise<MongoClient> {
    try {
      const client = new MongoClient(uri, {
        maxPoolSize: options.maxPoolSize || 10,
        serverSelectionTimeoutMS: options.serverSelectionTimeoutMS || 5000,
        connectTimeoutMS: options.connectTimeoutMS || 10000,
        ...options
      });

      await client.connect();
      this.connections.set(connectionId, client);
      
      console.log(`MongoDB连接已建立: ${connectionId}`);
      return client;
    } catch (error) {
      console.error(`MongoDB连接失败: ${connectionId}`, error);
      throw error;
    }
  }

  // 获取MongoDB连接
  getConnection(connectionId: string): MongoClient | null {
    return this.connections.get(connectionId) || null;
  }

  // 测试连接
  async testConnection(uri: string, options: any = {}): Promise<boolean> {
    let client: MongoClient | null = null;
    try {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        ...options
      });
      
      await client.connect();
      await client.db('admin').command({ ping: 1 });
      return true;
    } catch (error) {
      console.error('连接测试失败:', error);
      return false;
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  // 关闭连接
  async closeConnection(connectionId: string): Promise<void> {
    const client = this.connections.get(connectionId);
    if (client) {
      await client.close();
      this.connections.delete(connectionId);
      console.log(`MongoDB连接已关闭: ${connectionId}`);
    }
  }

  // 获取数据库列表
  async getDatabases(connectionId: string): Promise<any[]> {
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error('连接不存在');
    }

    const adminDb = client.db('admin');
    const result = await adminDb.command({ listDatabases: 1 });
    return result.databases;
  }

  // 获取集合列表
  async getCollections(connectionId: string, databaseName: string): Promise<any[]> {
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error('连接不存在');
    }

    const db = client.db(databaseName);
    const collections = await db.listCollections().toArray();
    return collections;
  }

  // 执行查询
  async executeQuery(
    connectionId: string, 
    databaseName: string, 
    collectionName: string, 
    query: any, 
    options: any = {}
  ): Promise<{ data: any[], count: number, executionTime: number }> {
    const startTime = Date.now();
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error('连接不存在');
    }

    const db = client.db(databaseName);
    const collection = db.collection(collectionName);
    
    const limit = options.limit || 100;
    const skip = options.skip || 0;
    
    const data = await collection.find(query).limit(limit).skip(skip).toArray();
    const count = await collection.countDocuments(query);
    
    const executionTime = Date.now() - startTime;
    
    return { data, count, executionTime };
  }

  // 执行聚合查询
  async executeAggregation(
    connectionId: string,
    databaseName: string,
    collectionName: string,
    pipeline: any[]
  ): Promise<{ data: any[], executionTime: number }> {
    const startTime = Date.now();
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error('连接不存在');
    }

    const db = client.db(databaseName);
    const collection = db.collection(collectionName);
    
    const data = await collection.aggregate(pipeline).toArray();
    const executionTime = Date.now() - startTime;
    
    return { data, executionTime };
  }

  // 初始化Redis连接
  async initRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      await this.redisClient.connect();
      console.log('Redis连接已建立');
    } catch (error) {
      console.error('Redis连接失败:', error);
    }
  }

  // 获取Redis客户端
  getRedisClient(): RedisClientType | null {
    return this.redisClient;
  }

  // 关闭所有连接
  async closeAllConnections(): Promise<void> {
    for (const [connectionId, client] of this.connections) {
      await client.close();
      console.log(`MongoDB连接已关闭: ${connectionId}`);
    }
    this.connections.clear();

    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('Redis连接已关闭');
    }
  }
}

export default DatabaseManager;
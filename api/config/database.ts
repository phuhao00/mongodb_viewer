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
  async testConnection(uri: string, options: any = {}): Promise<{ success: boolean; error?: string; canListDatabases?: boolean; message?: string }> {
    let client: MongoClient | null = null;
    try {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        ...options
      });
      
      await client.connect();
      await client.db('admin').command({ ping: 1 });
      
      // 测试listDatabases权限
      let canListDatabases = false;
      let permissionMessage = '';
      try {
        await client.db('admin').command({ listDatabases: 1 });
        canListDatabases = true;
      } catch (listError: any) {
        console.warn('listDatabases权限测试失败:', listError.message);
        // 如果是认证错误
        if (listError.code === 13 || listError.codeName === 'Unauthorized') {
          // 检查URI是否包含认证信息
          const hasAuth = uri.includes('@');
          if (hasAuth) {
            permissionMessage = '认证失败，请检查用户名、密码和认证数据库配置。';
          } else {
            permissionMessage = '连接成功！无密码连接模式下，某些操作可能需要数据库权限。如需完整功能，请配置认证信息。';
          }
        } else {
          permissionMessage = '连接成功，但当前用户权限不足以访问数据库列表。';
        }
      }
      
      return { 
        success: true, 
        canListDatabases,
        message: permissionMessage || '连接测试成功，可以访问数据库列表'
      };
    } catch (error: any) {
      console.error('连接测试失败:', error);
      
      let errorMessage = '连接失败';
      
      // 认证错误
      if (error.code === 13 || error.codeName === 'Unauthorized') {
        errorMessage = '认证失败：用户名、密码或认证数据库不正确';
      }
      // 网络连接错误
      else if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        errorMessage = '无法连接到数据库服务器，请检查主机地址和端口';
      }
      // 超时错误
      else if (error.message?.includes('timeout')) {
        errorMessage = '连接超时，请检查网络连接和服务器状态';
      }
      // DNS解析错误
      else if (error.code === 'ENOTFOUND') {
        errorMessage = '无法解析主机地址，请检查主机名是否正确';
      }
      // 其他认证相关错误
      else if (error.message?.includes('authentication')) {
        errorMessage = '认证过程中发生错误，请检查认证配置';
      }
      
      return { success: false, error: errorMessage };
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
  async getDatabases(connectionId: string): Promise<{ success: boolean; data?: any[]; error?: string; message?: string }> {
    const client = this.getConnection(connectionId);
    if (!client) {
      return { success: false, error: '连接不存在' };
    }

    try {
      // 首先尝试使用admin数据库执行listDatabases命令
      const adminDb = client.db('admin');
      const result = await adminDb.command({ listDatabases: 1 });
      return { success: true, data: result.databases };
    } catch (error: any) {
      console.error('获取数据库列表失败:', error);
      
      // 如果是认证错误，提供更详细的错误信息
      if (error.code === 13 || error.codeName === 'Unauthorized') {
        // 获取连接信息来判断是否为无密码连接
        const connection = this.connections.get(connectionId);
        // 从连接的配置中获取URI信息，如果没有则尝试从其他地方获取
        let connectionUri = '';
        if (connection && (connection as any).uri) {
          connectionUri = (connection as any).uri;
        }
        const hasAuth = connectionUri.includes('@');
        
        if (hasAuth) {
          return { success: false, error: '认证失败。请检查用户名、密码和认证数据库配置是否正确。' };
        } else {
          // 对于无密码连接，尝试探测常见数据库并提供默认选项
          const defaultDatabases = [];
          const commonDbNames = ['test', 'admin', 'local', 'mydb', 'app', 'data'];
          
          for (const dbName of commonDbNames) {
            try {
              const db = client.db(dbName);
              // 尝试获取集合列表来验证数据库是否存在
              const collections = await db.listCollections().toArray();
              defaultDatabases.push({
                name: dbName,
                sizeOnDisk: 0,
                empty: collections.length === 0
              });
            } catch (dbError) {
              // 如果无法访问该数据库，跳过
              continue;
            }
          }
          
          return { 
            success: true, 
            data: defaultDatabases,
            message: defaultDatabases.length > 0 
              ? `无密码连接成功！发现 ${defaultDatabases.length} 个可访问的数据库。` 
              : '无密码连接成功！未发现可访问的数据库，您可以手动输入数据库名称进行访问。'
          };
        }
      }
      // 如果是其他认证相关错误
      else if (error.message && error.message.includes('authentication')) {
        return { success: false, error: '认证失败。请验证用户名、密码和认证数据库是否正确。' };
      }
      // 权限不足
      else if (error.message && error.message.includes('not authorized')) {
        return { success: false, error: '当前用户没有足够权限访问数据库列表。请使用具有listDatabases权限的用户。' };
      }
      
      return { success: false, error: '获取数据库列表失败' };
    }
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
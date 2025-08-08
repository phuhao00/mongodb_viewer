import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

/**
 * AI功能相关的数据模型定义
 */

// 对话接口
export interface IConversation {
  _id?: ObjectId;
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    tags?: string[];
    language?: string;
    databaseContext?: string;
    [key: string]: any;
  };
}

// 消息接口
export interface IMessage {
  _id?: ObjectId;
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  queryData?: {
    query: any;
    collection?: string;
    database?: string;
    executionTime?: number;
  };
  attachments?: {
    type: string;
    url: string;
    metadata: any;
  }[];
  createdAt: Date;
}

// 查询结果接口
export interface IQueryResult {
  _id?: ObjectId;
  id: string;
  conversationId: string;
  messageId: string;
  query: any;
  results: any[];
  executionTime: number;
  resultCount: number;
  database: string;
  collection: string;
  createdAt: Date;
}

// AI配置接口
export interface IAIConfiguration {
  _id?: ObjectId;
  id: string;
  userId: string;
  modelName: string;
  apiKeyEncrypted?: string;
  preferences: {
    temperature?: number;
    maxTokens?: number;
    language?: string;
    responseStyle?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 用户AI使用统计
export interface IAIUsageStats {
  _id?: ObjectId;
  userId: string;
  date: string; // YYYY-MM-DD格式
  requestCount: number;
  tokensUsed: number;
  queriesGenerated: number;
  analysisPerformed: number;
  averageResponseTime: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AI数据库操作类
 */
export class AIDatabase {
  private db: Db;
  
  constructor(database: Db) {
    this.db = database;
  }
  
  // 获取集合
  get conversations(): Collection<IConversation> {
    return this.db.collection('ai_conversations');
  }
  
  get messages(): Collection<IMessage> {
    return this.db.collection('ai_messages');
  }
  
  get queryResults(): Collection<IQueryResult> {
    return this.db.collection('ai_query_results');
  }
  
  get configurations(): Collection<IAIConfiguration> {
    return this.db.collection('ai_configurations');
  }
  
  get usageStats(): Collection<IAIUsageStats> {
    return this.db.collection('ai_usage_stats');
  }
  
  /**
   * 初始化数据库索引
   */
  async initializeIndexes(): Promise<void> {
    try {
      // 对话表索引
      await this.conversations.createIndex({ userId: 1, createdAt: -1 });
      await this.conversations.createIndex({ id: 1 }, { unique: true });
      await this.conversations.createIndex({ updatedAt: -1 });
      
      // 消息表索引
      await this.messages.createIndex({ conversationId: 1, createdAt: 1 });
      await this.messages.createIndex({ id: 1 }, { unique: true });
      await this.messages.createIndex({ role: 1 });
      
      // 查询结果表索引
      await this.queryResults.createIndex({ conversationId: 1 });
      await this.queryResults.createIndex({ messageId: 1 });
      await this.queryResults.createIndex({ createdAt: -1 });
      await this.queryResults.createIndex({ executionTime: 1 });
      
      // AI配置表索引
      await this.configurations.createIndex({ userId: 1 }, { unique: true });
      await this.configurations.createIndex({ id: 1 }, { unique: true });
      
      // 使用统计表索引
      await this.usageStats.createIndex({ userId: 1, date: 1 }, { unique: true });
      await this.usageStats.createIndex({ date: -1 });
      
      console.log('AI数据库索引初始化完成');
    } catch (error) {
      console.error('AI数据库索引初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建新对话
   */
  async createConversation(conversation: Omit<IConversation, '_id'>): Promise<IConversation> {
    const result = await this.conversations.insertOne(conversation);
    return { ...conversation, _id: result.insertedId };
  }
  
  /**
   * 获取用户的对话列表
   */
  async getUserConversations(userId: string, limit: number = 20, skip: number = 0): Promise<IConversation[]> {
    return await this.conversations
      .find({ userId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
  }
  
  /**
   * 更新对话
   */
  async updateConversation(id: string, updates: Partial<IConversation>): Promise<boolean> {
    const result = await this.conversations.updateOne(
      { id },
      { $set: { ...updates, updatedAt: new Date() } }
    );
    return result.modifiedCount > 0;
  }
  
  /**
   * 删除对话及相关消息
   */
  async deleteConversation(id: string): Promise<boolean> {
    // 删除相关消息
    await this.messages.deleteMany({ conversationId: id });
    // 删除相关查询结果
    await this.queryResults.deleteMany({ conversationId: id });
    // 删除对话
    const result = await this.conversations.deleteOne({ id });
    return result.deletedCount > 0;
  }
  
  /**
   * 添加消息到对话
   */
  async addMessage(message: Omit<IMessage, '_id'>): Promise<IMessage> {
    const result = await this.messages.insertOne(message);
    
    // 更新对话的最后更新时间
    await this.updateConversation(message.conversationId, {
      updatedAt: new Date()
    } as Partial<IConversation>);
    
    return { ...message, _id: result.insertedId };
  }
  
  /**
   * 获取对话的消息列表
   */
  async getConversationMessages(conversationId: string, limit: number = 50): Promise<IMessage[]> {
    return await this.messages
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray();
  }
  
  /**
   * 保存查询结果
   */
  async saveQueryResult(queryResult: Omit<IQueryResult, '_id'>): Promise<IQueryResult> {
    const result = await this.queryResults.insertOne(queryResult);
    return { ...queryResult, _id: result.insertedId };
  }
  
  /**
   * 获取用户的AI配置
   */
  async getUserAIConfiguration(userId: string): Promise<IAIConfiguration | null> {
    return await this.configurations.findOne({ userId });
  }
  
  /**
   * 保存或更新用户AI配置
   */
  async saveUserAIConfiguration(config: Omit<IAIConfiguration, '_id'>): Promise<IAIConfiguration> {
    const existing = await this.configurations.findOne({ userId: config.userId });
    
    if (existing) {
      await this.configurations.updateOne(
        { userId: config.userId },
        { $set: { ...config, updatedAt: new Date() } }
      );
      return { ...config, _id: existing._id };
    } else {
      const result = await this.configurations.insertOne(config);
      return { ...config, _id: result.insertedId };
    }
  }
  
  /**
   * 记录AI使用统计
   */
  async recordUsageStats(userId: string, stats: Partial<IAIUsageStats>): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await this.usageStats.updateOne(
      { userId, date: today },
      {
        $inc: {
          requestCount: stats.requestCount || 1,
          tokensUsed: stats.tokensUsed || 0,
          queriesGenerated: stats.queriesGenerated || 0,
          analysisPerformed: stats.analysisPerformed || 0
        },
        $set: {
          averageResponseTime: stats.averageResponseTime || 0,
          updatedAt: new Date()
        },
        $setOnInsert: {
          userId,
          date: today,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
  }
  
  /**
   * 获取用户使用统计
   */
  async getUserUsageStats(userId: string, days: number = 30): Promise<IAIUsageStats[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    return await this.usageStats
      .find({
        userId,
        date: { $gte: startDateStr }
      })
      .sort({ date: -1 })
      .toArray();
  }
  
  /**
   * 清理过期数据
   */
  async cleanupExpiredData(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // 清理过期的查询结果
    await this.queryResults.deleteMany({
      createdAt: { $lt: cutoffDate }
    });
    
    // 清理过期的使用统计
    const statsCutoffDate = new Date();
    statsCutoffDate.setDate(statsCutoffDate.getDate() - (daysToKeep * 2));
    const statsCutoffStr = statsCutoffDate.toISOString().split('T')[0];
    
    await this.usageStats.deleteMany({
      date: { $lt: statsCutoffStr }
    });
    
    console.log(`清理了${daysToKeep}天前的过期AI数据`);
  }
}

/**
 * 创建AI数据库实例
 */
export function createAIDatabase(mongoClient: MongoClient, databaseName: string): AIDatabase {
  const db = mongoClient.db(databaseName);
  return new AIDatabase(db);
}

export default AIDatabase;
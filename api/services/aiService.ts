import OpenAI from 'openai';
import Redis from 'ioredis';
import { MongoClient } from 'mongodb';
import { aiConfig, AIProvider, getProviderDisplayName } from '../config/aiConfig';
import { cacheManager } from './cacheManager';

export interface ConversationContext {
  databaseSchema?: any;
  history?: Message[];
  userId?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  queryData?: any;
  createdAt: Date;
}

export interface AIResponse {
  response: string;
  query?: any;
  results?: any[];
  conversationId: string;
  suggestions?: string[];
}

export interface QueryResult {
  query: any;
  explanation: string;
  estimatedCount?: number;
  estimatedPerformance?: string;
}

export interface AnalysisResult {
  type: string;
  insights: any[];
  charts: any[];
  summary: string;
  recommendations: string[];
}

export class AIService {
  private client: OpenAI;
  private redis: Redis;
  private currentProvider: AIProvider;
  
  constructor(provider?: AIProvider, apiKey?: string, redisUrl?: string) {
    this.currentProvider = provider || aiConfig.currentProvider;
    const providerConfig = aiConfig.providers[this.currentProvider];
    
    this.client = new OpenAI({
      apiKey: apiKey || providerConfig.apiKey,
      baseURL: providerConfig.baseURL,
      timeout: providerConfig.timeout,
      ...(this.currentProvider === 'openai' && providerConfig.organization && {
        organization: providerConfig.organization
      })
    });
    
    if (redisUrl || aiConfig.redis.url) {
      this.redis = new Redis(redisUrl || aiConfig.redis.url);
    }
  }
  
  async processMessage(message: string, context: ConversationContext): Promise<AIResponse> {
    try {
      const providerConfig = aiConfig.providers[this.currentProvider];
      const systemPrompt = this.buildSystemPrompt(context.databaseSchema);
      const messages = this.buildMessageHistory(context.history || [], message);
      
      const response = await this.client.chat.completions.create({
        model: providerConfig.model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: providerConfig.temperature,
        max_tokens: providerConfig.maxTokens
      });
      
      const aiResponse = this.parseAIResponse(response.choices[0].message.content || '');
      
      return {
        response: aiResponse.response,
        query: aiResponse.query,
        conversationId: context.userId || 'default',
        suggestions: aiResponse.suggestions
      };
    } catch (error) {
      console.error('AI处理错误:', error);
      throw new Error(`${getProviderDisplayName(this.currentProvider)}服务暂时不可用，请稍后重试`);
    }
  }
  
  async generateQuery(description: string, collection: string, schema?: any): Promise<QueryResult> {
    try {
      const providerConfig = aiConfig.providers[this.currentProvider];
      const prompt = this.buildQueryPrompt(description, collection, schema);
      
      const response = await this.client.chat.completions.create({
        model: providerConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: Math.min(providerConfig.temperature, 0.1),
        max_tokens: Math.min(providerConfig.maxTokens, 1000)
      });
      
      const result = this.parseQueryResponse(response.choices[0].message.content || '');
      return result;
    } catch (error) {
      console.error('查询生成错误:', error);
      throw new Error('查询生成失败，请检查描述是否清晰');
    }
  }
  
  async analyzeData(data: any[], analysisType: string = 'auto'): Promise<AnalysisResult> {
    try {
      const providerConfig = aiConfig.providers[this.currentProvider];
      const dataProfile = this.profileData(data);
      const prompt = this.buildAnalysisPrompt(dataProfile, analysisType);
      
      const response = await this.client.chat.completions.create({
        model: providerConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: Math.min(providerConfig.temperature, 0.2),
        max_tokens: Math.min(providerConfig.maxTokens, 1500)
      });
      
      const analysis = this.parseAnalysisResponse(response.choices[0].message.content || '');
      return analysis;
    } catch (error) {
      console.error('数据分析错误:', error);
      throw new Error('数据分析失败，请检查数据格式');
    }
  }

  /**
   * 测试AI API连接
   */
  async testConnection(): Promise<void> {
    try {
      const providerConfig = aiConfig.providers[this.currentProvider];
      const providerName = getProviderDisplayName(this.currentProvider);
      
      const response = await this.client.chat.completions.create({
        model: providerConfig.model,
        messages: [{ role: 'user', content: 'Hello, this is a connection test.' }],
        max_tokens: 10,
        temperature: 0
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('API响应格式无效');
      }

      // 测试成功
      console.log(`${providerName} API连接测试成功`);
    } catch (error) {
      const providerName = getProviderDisplayName(this.currentProvider);
      console.error(`${providerName} API连接测试失败:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          throw new Error('API密钥无效或已过期');
        } else if (error.message.includes('429')) {
          throw new Error('API请求频率超限，请稍后重试');
        } else if (error.message.includes('timeout')) {
          throw new Error('API请求超时，请检查网络连接');
        } else {
          throw new Error(`${providerName} API连接失败: ${error.message}`);
        }
      } else {
        throw new Error(`未知的${providerName} API连接错误`);
      }
    }
  }
  
  private buildSystemPrompt(schema?: any): string {
    return `你是一个MongoDB数据库查询助手。你的任务是帮助用户通过自然语言查询MongoDB数据库。

数据库结构：${schema ? JSON.stringify(schema, null, 2) : '未提供'}

请遵循以下规则：
1. 只生成安全的查询操作（find, aggregate, count, distinct）
2. 禁止任何修改数据的操作（insert, update, delete, drop）
3. 回复格式必须是JSON对象，包含以下字段：
   - response: 对用户的友好回复
   - query: 生成的MongoDB查询对象（如果适用）
   - suggestions: 相关建议数组

示例回复：
{
  "response": "我为您生成了查询所有年龄大于25岁用户的MongoDB查询",
  "query": { "age": { "$gt": 25 } },
  "suggestions": ["您还可以按城市筛选", "可以添加排序条件"]
}`;
  }
  
  private buildMessageHistory(history: Message[], newMessage: string): any[] {
    const messages = history.slice(-5).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    messages.push({ role: 'user', content: newMessage });
    return messages;
  }
  
  private parseAIResponse(content: string): any {
    try {
      // 尝试解析JSON响应
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // 如果不是JSON格式，返回默认结构
      return {
        response: content,
        query: null,
        suggestions: []
      };
    } catch (error) {
      return {
        response: content,
        query: null,
        suggestions: []
      };
    }
  }
  
  private buildQueryPrompt(description: string, collection: string, schema?: any): string {
    return `请根据以下描述生成MongoDB查询语句：

描述：${description}
集合：${collection}
字段结构：${schema ? JSON.stringify(schema, null, 2) : '未知'}

要求：
1. 只生成查询操作，不允许修改数据
2. 返回JSON格式，包含query和explanation字段
3. query字段包含完整的MongoDB查询对象
4. explanation字段包含查询逻辑的中文解释

示例格式：
{
  "query": { "age": { "$gt": 25 } },
  "explanation": "查询年龄大于25岁的所有文档"
}`;
  }
  
  private parseQueryResponse(content: string): QueryResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          query: parsed.query || {},
          explanation: parsed.explanation || '查询已生成',
          estimatedPerformance: 'good'
        };
      }
    } catch (error) {
      console.error('解析查询响应失败:', error);
    }
    
    return {
      query: {},
      explanation: '查询生成失败，请重新描述需求',
      estimatedPerformance: 'unknown'
    };
  }
  
  private buildAnalysisPrompt(dataProfile: any, analysisType: string): string {
    return `请分析以下数据并提供洞察：

数据概况：${JSON.stringify(dataProfile, null, 2)}
分析类型：${analysisType}

请返回JSON格式的分析结果，包含：
1. insights: 数据洞察数组
2. charts: 推荐图表配置数组
3. summary: 分析摘要
4. recommendations: 建议数组

示例格式：
{
  "insights": ["用户年龄主要集中在25-35岁"],
  "charts": [{"type": "bar", "field": "age", "title": "年龄分布"}],
  "summary": "数据显示用户群体年轻化趋势明显",
  "recommendations": ["可以针对年轻用户群体制定营销策略"]
}`;
  }
  
  private parseAnalysisResponse(content: string): AnalysisResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: 'auto',
          insights: parsed.insights || [],
          charts: parsed.charts || [],
          summary: parsed.summary || '分析完成',
          recommendations: parsed.recommendations || []
        };
      }
    } catch (error) {
      console.error('解析分析响应失败:', error);
    }
    
    return {
      type: 'auto',
      insights: [],
      charts: [],
      summary: '分析失败，请检查数据格式',
      recommendations: []
    };
  }
  
  private profileData(data: any[]): any {
    if (!data || data.length === 0) {
      return { count: 0, fields: [] };
    }
    
    const sample = data[0];
    const fields = Object.keys(sample).map(key => ({
      name: key,
      type: typeof sample[key],
      hasNulls: data.some(item => item[key] == null)
    }));
    
    return {
      count: data.length,
      fields,
      sampleData: data.slice(0, 3)
    };
  }
  
  async cacheResponse(key: string, response: any, ttl: number = 3600): Promise<void> {
    try {
      await cacheManager.set(key, response, {
        ttl: ttl,
        tags: ['ai_response'],
        compress: true
      });
    } catch (error) {
      console.error('缓存失败:', error);
    }
  }

  async getCachedResponse(key: string): Promise<any | null> {
    try {
      return await cacheManager.get(key);
    } catch (error) {
      console.error('获取缓存失败:', error);
      return null;
    }
  }

  /**
   * 生成消息哈希
   */
  private generateMessageHash(messages: any[]): string {
    const content = messages.map(m => `${m.role}:${m.content}`).join('|');
    return this.generateHash(content);
  }

  /**
   * 生成数据哈希
   */
  private generateDataHash(data: any): string {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return this.generateHash(dataString.slice(0, 200)); // 只取前200个字符生成哈希
  }

  /**
   * 生成简单哈希
   */
  private generateHash(input: string): string {
    let hash = 0;
    if (input.length === 0) return hash.toString();
    
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(36);
  }
}

export default AIService;
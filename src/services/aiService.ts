import { AIResponse, QueryResult, AnalysisResult, Conversation, Message, QueryExecutionResult } from '../types/ai';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003';

export class AIServiceClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * 发送AI聊天消息
   */
  async chat(params: {
    message: string;
    conversationId?: string;
    databaseSchema?: any;
    context?: any;
  }): Promise<AIResponse> {
    const response = await fetch(`${this.baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'AI聊天请求失败');
    }
    
    const result = await response.json();
    return result.data;
  }
  
  /**
   * 生成智能查询
   */
  async generateQuery(params: {
    description: string;
    collection: string;
    schema?: any;
  }): Promise<QueryResult> {
    const response = await fetch(`${this.baseUrl}/api/ai/generate-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '查询生成失败');
    }
    
    const result = await response.json();
    return result.data;
  }
  
  /**
   * 执行数据分析
   */
  async analyzeData(params: {
    data: any[];
    analysisType?: string;
    options?: any;
  }): Promise<AnalysisResult> {
    const response = await fetch(`${this.baseUrl}/api/ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '数据分析失败');
    }
    
    const result = await response.json();
    return result.data;
  }
  
  /**
   * 获取对话列表
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await fetch(`${this.baseUrl}/api/ai/conversations`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '获取对话列表失败');
    }
    
    const result = await response.json();
    return result.data;
  }
  
  /**
   * 获取对话历史
   */
  async getConversationHistory(conversationId: string): Promise<{
    conversationId: string;
    messages: Message[];
    messageCount: number;
  }> {
    const response = await fetch(`${this.baseUrl}/api/ai/conversations/${conversationId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '获取对话历史失败');
    }
    
    const result = await response.json();
    return result.data;
  }
  
  /**
   * 删除对话
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/ai/conversations/${conversationId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '删除对话失败');
    }
  }
  
  /**
   * 执行AI生成的查询
   */
  async executeQuery(params: {
    query: any;
    connectionString: string;
    database: string;
    collection: string;
  }): Promise<QueryExecutionResult> {
    const response = await fetch(`${this.baseUrl}/api/ai/execute-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '查询执行失败');
    }
    
    const result = await response.json();
    return result.data;
  }
  
  /**
   * 检查AI服务健康状态
   */
  async checkHealth(): Promise<{
    aiServiceAvailable: boolean;
    activeConversations: number;
    timestamp: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/ai/health`);
    
    if (!response.ok) {
      throw new Error('AI服务不可用');
    }
    
    const result = await response.json();
    return result.data;
  }
}

// 创建默认实例
export const aiService = new AIServiceClient();

export default aiService;
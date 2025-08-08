/**
 * AI功能相关的TypeScript类型定义
 */

export interface Message {
  id: string;
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

export interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  messageCount: number;
  updatedAt: Date;
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
  estimatedPerformance: 'excellent' | 'good' | 'fair' | 'poor';
  warnings?: string[];
  error?: {
    message: string;
    details?: any;
  };
  success?: boolean;
}

export interface AnalysisResult {
  type: string;
  insights: {
    type: 'info' | 'warning' | 'error';
    title: string;
    description: string;
    confidence?: number;
  }[];
  charts: ChartRecommendation[];
  summary: string;
  recommendations: ChartRecommendation[];
  statistics?: Record<string, any>;
}

export interface ChartRecommendation {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  field?: string;
  title: string;
  description: string;
  confidence: number;
  config?: any;
  data?: any;
}

export interface AIServiceConfig {
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  language: string;
}

export interface ConversationContext {
  connectionId: string;
  database?: string;
  collection?: string;
  collections?: string[];
  currentCollection?: string;
  currentDatabase?: string;
  databaseSchema?: any;
  selectedCollection?: string;
  queryHistory?: QueryResult[];
  queryMode?: 'chat' | 'builder' | 'analysis';
  userRole?: 'admin' | 'user' | 'guest';
  userPreferences?: {
    language: string;
    complexity: 'simple' | 'intermediate' | 'advanced';
  };
  preferences?: {
    language?: string;
    responseFormat?: 'detailed' | 'concise';
    includeExplanations?: boolean;
  };
}

export interface AIError {
  code: string;
  message: string;
  details?: any;
}

export interface AIUsageStats {
  requestCount: number;
  tokensUsed: number;
  queriesGenerated: number;
  analysisPerformed: number;
  averageResponseTime: number;
}

export interface SmartSuggestion {
  id: string;
  type: 'query' | 'analysis' | 'optimization';
  title: string;
  description: string;
  action: () => void;
}

export interface QueryExecutionResult {
  results: any[];
  count: number;
  executionTime: number;
  warnings?: string[];
  error?: string;
}
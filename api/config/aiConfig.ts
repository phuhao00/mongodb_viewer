import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 支持的AI提供商类型
export type AIProvider = 'openai' | 'zhipu' | 'qwen' | 'kimi' | 'deepseek';

// 基础模型配置接口
export interface BaseModelConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  baseURL?: string;
  hasApiKey?: boolean;
}

// 各提供商特定配置
export interface OpenAIConfig extends BaseModelConfig {
  organization?: string;
}

export interface ZhipuConfig extends BaseModelConfig {
  // 智普AI特定配置
}

export interface QwenConfig extends BaseModelConfig {
  // 千问特定配置
}

export interface KimiConfig extends BaseModelConfig {
  // Kimi特定配置
}

export interface DeepSeekConfig extends BaseModelConfig {
  // DeepSeek特定配置
}

export interface AIConfig {
  // 当前选择的AI提供商
  currentProvider: AIProvider;
  
  // 各AI提供商配置
  providers: {
    openai: OpenAIConfig;
    zhipu: ZhipuConfig;
    qwen: QwenConfig;
    kimi: KimiConfig;
    deepseek: DeepSeekConfig;
  };
  
  // Redis缓存配置
  redis: {
    url: string;
    ttl: number; // 缓存过期时间（秒）
    keyPrefix: string;
  };
  
  // 安全配置
  security: {
    maxQueryComplexity: number;
    maxResultSize: number;
    rateLimitPerHour: number;
    enableQueryValidation: boolean;
    allowedOperations: string[];
    blockedOperations: string[];
  };
  
  // 功能开关
  features: {
    chatEnabled: boolean;
    queryGenerationEnabled: boolean;
    dataAnalysisEnabled: boolean;
    conversationHistoryEnabled: boolean;
    cachingEnabled: boolean;
  };
  
  // 性能配置
  performance: {
    maxConcurrentRequests: number;
    requestTimeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
}

/**
 * 获取AI配置
 */
export function getAIConfig(): AIConfig {
  // 确保currentProvider是有效的AIProvider值
  const validProviders: AIProvider[] = ['openai', 'zhipu', 'qwen', 'kimi', 'deepseek'];
  const envProvider = process.env.AI_PROVIDER as AIProvider;
  const currentProvider = validProviders.includes(envProvider) ? envProvider : 'openai';
  
  return {
    currentProvider,
    
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        organization: process.env.OPENAI_ORGANIZATION || '',
        hasApiKey: !!(process.env.OPENAI_API_KEY)
      },
      
      zhipu: {
        apiKey: process.env.ZHIPU_API_KEY || '',
        model: process.env.ZHIPU_MODEL || 'glm-4',
        maxTokens: parseInt(process.env.ZHIPU_MAX_TOKENS || '2000'),
        temperature: parseFloat(process.env.ZHIPU_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.ZHIPU_TIMEOUT || '30000'),
        baseURL: process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
        hasApiKey: !!(process.env.ZHIPU_API_KEY)
      },
      
      qwen: {
        apiKey: process.env.QWEN_API_KEY || '',
        model: process.env.QWEN_MODEL || 'qwen-turbo',
        maxTokens: parseInt(process.env.QWEN_MAX_TOKENS || '2000'),
        temperature: parseFloat(process.env.QWEN_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.QWEN_TIMEOUT || '30000'),
        baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
        hasApiKey: !!(process.env.QWEN_API_KEY)
      },
      
      kimi: {
        apiKey: process.env.KIMI_API_KEY || '',
        model: process.env.KIMI_MODEL || 'moonshot-v1-8k',
        maxTokens: parseInt(process.env.KIMI_MAX_TOKENS || '2000'),
        temperature: parseFloat(process.env.KIMI_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.KIMI_TIMEOUT || '30000'),
        baseURL: process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
        hasApiKey: !!(process.env.KIMI_API_KEY)
      },
      
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '2000'),
        temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.DEEPSEEK_TIMEOUT || '30000'),
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
        hasApiKey: !!(process.env.DEEPSEEK_API_KEY)
      }
    },
    
    redis: {
      url: process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING || 'redis://localhost:6379',
      ttl: parseInt(process.env.REDIS_TTL || '3600'), // 1小时
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'mongo_view:ai:'
    },
    
    security: {
      maxQueryComplexity: parseInt(process.env.AI_MAX_QUERY_COMPLEXITY || '5'),
      maxResultSize: parseInt(process.env.AI_MAX_RESULT_SIZE || '1000'),
      rateLimitPerHour: parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '50'),
      enableQueryValidation: process.env.AI_ENABLE_QUERY_VALIDATION !== 'false',
      allowedOperations: (process.env.AI_ALLOWED_OPERATIONS || 'find,aggregate,count,distinct').split(','),
      blockedOperations: (process.env.AI_BLOCKED_OPERATIONS || '$where,$eval,$function').split(',')
    },
    
    features: {
      chatEnabled: process.env.AI_CHAT_ENABLED !== 'false',
      queryGenerationEnabled: process.env.AI_QUERY_GENERATION_ENABLED !== 'false',
      dataAnalysisEnabled: process.env.AI_DATA_ANALYSIS_ENABLED !== 'false',
      conversationHistoryEnabled: process.env.AI_CONVERSATION_HISTORY_ENABLED !== 'false',
      cachingEnabled: process.env.AI_CACHING_ENABLED !== 'false'
    },
    performance: {
      maxConcurrentRequests: parseInt(process.env.AI_MAX_CONCURRENT_REQUESTS || '10'),
      requestTimeout: parseInt(process.env.AI_REQUEST_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.AI_RETRY_DELAY || '1000')
    }
  };
}

/**
 * 获取AI提供商的显示名称
 */
export function getProviderDisplayName(provider: AIProvider): string {
  const names = {
    openai: 'OpenAI',
    zhipu: '智谱AI',
    qwen: '通义千问',
    kimi: 'Kimi',
    deepseek: 'DeepSeek'
  };
  return names[provider] || provider;
}

/**
 * 获取AI提供商支持的模型列表
 */
export function getProviderModels(provider: AIProvider): string[] {
  const models = {
    openai: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'],
    zhipu: ['glm-4', 'glm-4v', 'glm-3-turbo'],
    qwen: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-max-longcontext'],
    kimi: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    deepseek: ['deepseek-chat', 'deepseek-coder']
  };
  return models[provider] || [];
}

/**
 * 验证AI配置（仅验证AI功能相关配置）
 */
export function validateAIConfig(config: AIConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 只有在启用AI功能时才验证当前提供商配置
  if (config.features.chatEnabled || config.features.queryGenerationEnabled || config.features.dataAnalysisEnabled) {
    const currentProviderConfig = config.providers[config.currentProvider];
    const providerName = getProviderDisplayName(config.currentProvider);
    
    if (!currentProviderConfig.apiKey) {
      errors.push(`${providerName} API密钥未配置`);
    }
    
    if (currentProviderConfig.maxTokens <= 0) {
      errors.push(`${providerName}最大令牌数必须大于0`);
    }
    
    if (currentProviderConfig.temperature < 0 || currentProviderConfig.temperature > 2) {
      errors.push(`${providerName}温度参数必须在0-2之间`);
    }
  }
  
  // 验证Redis配置（仅在启用缓存时）
  if (config.features.cachingEnabled && !config.redis.url) {
    errors.push('启用缓存时Redis URL必须配置');
  }
  
  if (config.redis.ttl <= 0) {
    errors.push('Redis TTL必须大于0');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 获取环境特定的配置
 */
export function getEnvironmentConfig(): Partial<AIConfig> {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        openai: {
          apiKey: process.env.OPENAI_API_KEY || '',
          model: 'gpt-3.5-turbo',
          maxTokens: 1500,
          temperature: 0.3, // 生产环境使用更保守的温度
          timeout: 20000
        },
        security: {
          maxQueryComplexity: 3,
          maxResultSize: 500,
          rateLimitPerHour: 30,
          enableQueryValidation: true,
          allowedOperations: ['find', 'aggregate', 'count'],
          blockedOperations: ['drop', 'deleteMany']
        },
        performance: {
          maxConcurrentRequests: 5,
          requestTimeout: 20000,
          retryAttempts: 2,
          retryDelay: 1000
        }
      };
    
    case 'test':
      return {
        openai: {
          apiKey: process.env.OPENAI_API_KEY || '',
          model: 'gpt-3.5-turbo',
          maxTokens: 1000,
          temperature: 0.1,
          timeout: 5000
        },
        security: {
          maxQueryComplexity: 2,
          maxResultSize: 100,
          rateLimitPerHour: 100,
          enableQueryValidation: true,
          allowedOperations: ['find', 'aggregate', 'count'],
          blockedOperations: ['drop', 'deleteMany']
        },
        features: {
          chatEnabled: true,
          queryGenerationEnabled: true,
          dataAnalysisEnabled: true,
          conversationHistoryEnabled: true,
          cachingEnabled: false // 测试环境禁用缓存
        },
        performance: {
          maxConcurrentRequests: 2,
          requestTimeout: 5000,
          retryAttempts: 1,
          retryDelay: 500
        }
      };
    
    case 'development':
    default:
      return {
        openai: {
          apiKey: process.env.OPENAI_API_KEY || '',
          model: 'gpt-4',
          maxTokens: 2000,
          temperature: 0.7,
          timeout: 30000
        },
        security: {
          maxQueryComplexity: 10,
          maxResultSize: 2000,
          rateLimitPerHour: 200,
          enableQueryValidation: false, // 开发环境可以放宽验证
          allowedOperations: ['find', 'aggregate', 'count', 'insert', 'update'],
          blockedOperations: ['drop']
        },
        performance: {
          maxConcurrentRequests: 20,
          requestTimeout: 30000,
          retryAttempts: 3,
          retryDelay: 2000
        }
      };
  }
}

/**
 * 合并配置
 */
export function mergeConfigs(baseConfig: AIConfig, envConfig: Partial<AIConfig>): AIConfig {
  return {
    openai: { ...baseConfig.openai, ...(envConfig.openai || {}) },
    redis: { ...baseConfig.redis, ...(envConfig.redis || {}) },
    security: { ...baseConfig.security, ...(envConfig.security || {}) },
    features: { ...baseConfig.features, ...(envConfig.features || {}) },
    performance: { ...baseConfig.performance, ...(envConfig.performance || {}) }
  };
}

/**
 * 验证基本配置（不包括AI功能）
 */
export function validateBasicConfig(config: AIConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 验证当前提供商是否存在
  if (!config.currentProvider || !config.providers[config.currentProvider]) {
    errors.push('当前AI提供商配置无效');
  }
  
  // 验证安全配置
  if (config.security.maxQueryComplexity <= 0) {
    errors.push('最大查询复杂度必须大于0');
  }
  
  if (config.security.maxResultSize <= 0) {
    errors.push('最大结果大小必须大于0');
  }
  
  if (config.security.rateLimitPerHour <= 0) {
    errors.push('每小时速率限制必须大于0');
  }
  
  // 验证性能配置
  if (config.performance.maxConcurrentRequests <= 0) {
    errors.push('最大并发请求数必须大于0');
  }
  
  if (config.performance.requestTimeout <= 0) {
    errors.push('请求超时时间必须大于0');
  }
  
  if (config.performance.retryAttempts < 0) {
    errors.push('重试次数不能为负数');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 检查AI功能是否可用
 */
export function isAIFunctionalityAvailable(config: AIConfig): { available: boolean; missingFeatures: string[] } {
  const missingFeatures: string[] = [];
  
  if (!config.openai.apiKey) {
    missingFeatures.push('AI聊天功能');
    missingFeatures.push('智能查询生成');
    missingFeatures.push('数据分析建议');
  }
  
  return {
    available: missingFeatures.length === 0,
    missingFeatures
  };
}

/**
 * 获取最终的AI配置
 */
export function getFinalAIConfig(): AIConfig {
  const baseConfig = getAIConfig();
  
  // 验证基本配置（必须通过）
  const basicValidation = validateBasicConfig(baseConfig);
  if (!basicValidation.isValid) {
    console.error('基本配置验证失败:', basicValidation.errors);
    throw new Error(`基本配置无效: ${basicValidation.errors.join(', ')}`);
  }
  
  // 检查AI功能可用性（不阻止启动）
  const currentProviderConfig = baseConfig.providers[baseConfig.currentProvider];
  if (!currentProviderConfig?.apiKey) {
    console.warn('AI功能不可用，缺少配置:', ['AI聊天功能', '智能查询生成', '数据分析建议']);
    console.warn('基本功能（数据库连接、查询、可视化）仍然可用');
  }
  
  return baseConfig;
}

// 导出默认配置实例
export const aiConfig = getFinalAIConfig();

export default aiConfig;
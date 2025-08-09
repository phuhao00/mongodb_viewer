import express, { Request, Response } from 'express';
import { AIService, ConversationContext, Message } from '../services/aiService.js';
import { QuerySecurityValidator } from '../services/queryValidator.js';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { aiConfig, validateAIConfig, getProviderDisplayName, getProviderModels, AIProvider } from '../config/aiConfig';
import {
  aiAuthMiddleware,
  checkAIPermission,
  aiRateLimitMiddleware,
  queryComplexityMiddleware,
  resultSizeLimitMiddleware,
  AIAuthRequest
} from '../middleware/aiAuth';

const router = express.Router();

// 状态端点不需要认证
router.get('/status', (req: Request, res: Response) => {
  try {
    const currentProviderConfig = aiConfig.providers[aiConfig.currentProvider];
    if (!currentProviderConfig) {
      return res.status(500).json({
        success: false,
        error: `不支持的AI提供商: ${aiConfig.currentProvider}`
      });
    }
    const hasApiKey = !!currentProviderConfig.apiKey;
    const providerName = getProviderDisplayName(aiConfig.currentProvider);
    
    const aiAvailability = hasApiKey ? 
      { available: true, missingFeatures: [] } : 
      {
        available: false,
        missingFeatures: [
          'AI智能聊天',
          '自然语言查询生成',
          'AI数据分析建议'
        ]
      };
    
    res.json({
      success: true,
      data: {
        aiConfigured: hasApiKey,
        aiAvailable: aiAvailability.available,
        currentProvider: aiConfig.currentProvider,
        providerName: providerName,
        availableFeatures: [
          '数据库连接管理',
          '数据查询和浏览',
          '数据可视化',
          '基本统计分析',
          ...(hasApiKey ? [
            'AI智能聊天',
            '自然语言查询生成',
            'AI数据分析建议'
          ] : [])
        ],
        missingFeatures: aiAvailability.missingFeatures,
        configuration: {
          provider: aiConfig.currentProvider,
          model: currentProviderConfig.model,
          maxTokens: currentProviderConfig.maxTokens,
          temperature: currentProviderConfig.temperature,
          cachingEnabled: aiConfig.features.cachingEnabled,
          queryValidationEnabled: aiConfig.security.enableQueryValidation
        },
        message: hasApiKey ? 
          `${providerName}功能已配置并可用` : 
          `基本功能可用，配置${providerName} API密钥以启用AI功能`
      }
    });
    
  } catch (error) {
    console.error('获取AI状态错误:', error);
    res.status(500).json({
      success: false,
      error: '获取AI状态失败'
    });
  }
});

// 获取AI配置（不包含敏感信息）
router.get('/config', (req: Request, res: Response) => {
  try {
    const config = {
      currentProvider: aiConfig.currentProvider,
      providers: Object.fromEntries(
        Object.entries(aiConfig.providers).map(([key, provider]) => [
          key,
          {
            model: provider.model,
            maxTokens: provider.maxTokens,
            temperature: provider.temperature,
            timeout: provider.timeout,
            baseURL: provider.baseURL,
            hasApiKey: !!provider.apiKey,
            ...(key === 'openai' && provider.organization && {
              organization: provider.organization
            })
          }
        ])
      ),
      features: aiConfig.features,
      security: {
        maxQueryComplexity: aiConfig.security.maxQueryComplexity,
        maxResultSize: aiConfig.security.maxResultSize,
        rateLimitPerHour: aiConfig.security.rateLimitPerHour,
        enableQueryValidation: aiConfig.security.enableQueryValidation
      },
      performance: aiConfig.performance,
      availableProviders: Object.keys(aiConfig.providers).map(provider => ({
        id: provider,
        name: getProviderDisplayName(provider as AIProvider),
        models: getProviderModels(provider as AIProvider)
      }))
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取AI配置错误:', error);
    res.status(500).json({
      success: false,
      error: '获取AI配置失败'
    });
  }
});

// 更新AI配置
router.put('/config', async (req: Request, res: Response) => {
  try {
    const { currentProvider, providers, features, security, performance } = req.body;

    // 验证输入
    if (!currentProvider && !providers && !features && !security && !performance) {
      return res.status(400).json({
        success: false,
        error: '至少需要提供一个配置项'
      });
    }

    // 更新当前提供商
    if (currentProvider && Object.keys(aiConfig.providers).includes(currentProvider)) {
      aiConfig.currentProvider = currentProvider;
      // 重置AI服务实例以使用新的提供商
      aiService = null;
    }

    // 更新提供商配置
    if (providers) {
      for (const [providerKey, providerConfig] of Object.entries(providers)) {
        if (aiConfig.providers[providerKey as AIProvider]) {
          const currentConfig = aiConfig.providers[providerKey as AIProvider];
          
          if (providerConfig.apiKey !== undefined) {
            currentConfig.apiKey = providerConfig.apiKey;
            // 如果是当前提供商，重置AI服务实例
            if (providerKey === aiConfig.currentProvider) {
              aiService = null;
            }
          }
          if (providerConfig.model) currentConfig.model = providerConfig.model;
          if (providerConfig.maxTokens) currentConfig.maxTokens = providerConfig.maxTokens;
          if (providerConfig.temperature !== undefined) currentConfig.temperature = providerConfig.temperature;
          if (providerConfig.timeout) currentConfig.timeout = providerConfig.timeout;
          if (providerConfig.baseURL) currentConfig.baseURL = providerConfig.baseURL;
          if (providerKey === 'openai' && providerConfig.organization !== undefined) {
            currentConfig.organization = providerConfig.organization;
          }
        }
      }
    }

    // 更新功能配置
    if (features) {
      Object.assign(aiConfig.features, features);
    }

    // 更新安全配置
    if (security) {
      Object.assign(aiConfig.security, security);
    }

    // 更新性能配置
    if (performance) {
      Object.assign(aiConfig.performance, performance);
    }

    // 验证更新后的配置
    const validation = validateAIConfig(aiConfig);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: '配置验证失败',
        details: validation.errors
      });
    }

    // 测试API密钥（如果提供了新的密钥）- 仅作为警告，不阻止保存
    const currentProviderConfig = aiConfig.providers[aiConfig.currentProvider];
    let apiKeyWarning = null;
    if (providers?.[aiConfig.currentProvider]?.apiKey) {
      try {
        const testService = new AIService(aiConfig.currentProvider);
        await testService.testConnection();
      } catch (error) {
        console.warn('API密钥验证失败，但配置仍将保存:', error);
        apiKeyWarning = error instanceof Error ? error.message : '未知错误';
      }
    }

    res.json({
      success: true,
      message: apiKeyWarning ? 'AI配置已保存，但API密钥验证失败' : 'AI配置更新成功',
      warning: apiKeyWarning,
      data: {
        aiConfigured: !!currentProviderConfig.apiKey,
        aiAvailable: !!currentProviderConfig.apiKey && !apiKeyWarning,
        currentProvider: aiConfig.currentProvider,
        providerName: getProviderDisplayName(aiConfig.currentProvider)
      }
    });

  } catch (error) {
    console.error('更新AI配置错误:', error);
    res.status(500).json({
      success: false,
      error: '更新AI配置失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 测试AI连接
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { provider, apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API密钥不能为空'
      });
    }

    const testProvider = provider || aiConfig.currentProvider;
    if (!Object.keys(aiConfig.providers).includes(testProvider)) {
      return res.status(400).json({
        success: false,
        error: '不支持的AI提供商'
      });
    }

    // 临时设置API密钥
    const originalApiKey = aiConfig.providers[testProvider].apiKey;
    aiConfig.providers[testProvider].apiKey = apiKey;
    
    try {
      // 创建临时AI服务实例进行测试
      const testService = new AIService(testProvider);
      await testService.testConnection();
      
      const providerName = getProviderDisplayName(testProvider);
      res.json({
        success: true,
        message: `${providerName} API密钥验证成功`,
        provider: testProvider,
        providerName: providerName
      });
    } finally {
      // 恢复原始API密钥
      aiConfig.providers[testProvider].apiKey = originalApiKey;
    }

  } catch (error) {
    console.error('测试AI连接错误:', error);
    const providerName = getProviderDisplayName(req.body.provider || aiConfig.currentProvider);
    res.status(400).json({
      success: false,
      error: `${providerName} API密钥验证失败`,
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 应用AI认证和权限中间件到其他端点
router.use(aiAuthMiddleware);
router.use(aiRateLimitMiddleware);
router.use(resultSizeLimitMiddleware);

// 初始化AI服务
let aiService: AIService | null = null;
const queryValidator = new QuerySecurityValidator();

// 延迟初始化AI服务，确保环境变量已加载
const getAIService = () => {
  if (!aiService) {
    // 检查AI功能是否可用
    const currentProviderConfig = aiConfig.providers[aiConfig.currentProvider];
    const providerName = getProviderDisplayName(aiConfig.currentProvider);
    
    if (!currentProviderConfig.apiKey) {
      throw new Error(`AI功能未配置：请设置${providerName} API密钥以启用AI聊天、查询生成和数据分析功能`);
    }
    
    // 验证AI配置
    const configValidation = validateAIConfig(aiConfig);
    if (!configValidation.isValid) {
      throw new Error(`AI配置无效: ${configValidation.errors.join(', ')}`);
    }
    
    aiService = new AIService(aiConfig.currentProvider);
  }
  return aiService;
};

// 检查AI功能是否可用的中间件
const checkAIAvailability = (req: any, res: Response, next: any) => {
  const currentProviderConfig = aiConfig.providers[aiConfig.currentProvider];
  const providerName = getProviderDisplayName(aiConfig.currentProvider);
  
  if (!currentProviderConfig.apiKey) {
    return res.status(503).json({
      success: false,
      error: 'AI功能未配置',
      message: `请配置${providerName} API密钥以启用AI功能`,
      currentProvider: aiConfig.currentProvider,
      providerName: providerName,
      availableFeatures: [
        '数据库连接管理',
        '数据查询和浏览',
        '数据可视化',
        '基本统计分析'
      ],
      missingFeatures: [
        'AI智能聊天',
        '自然语言查询生成',
        'AI数据分析建议'
      ]
    });
  }
  next();
};

// 存储对话历史（生产环境应使用数据库）
const conversations = new Map<string, Message[]>();



/**
 * AI聊天接口
 * POST /api/ai/chat
 */
router.post('/chat', checkAIAvailability, checkAIPermission('ai:chat'), async (req: AIAuthRequest, res: Response) => {
  try {
    const { message, conversationId, databaseSchema, context } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: '消息内容不能为空'
      });
    }
    
    // 获取或创建对话ID
    const convId = conversationId || uuidv4();
    
    // 获取对话历史
    const history = conversations.get(convId) || [];
    
    // 构建上下文
    const aiContext: ConversationContext = {
      databaseSchema,
      history,
      userId: convId
    };
    
    // 调用AI服务
    const aiResponse = await getAIService().processMessage(message, aiContext);
    
    // 保存对话记录
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: message,
      createdAt: new Date()
    };
    
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: aiResponse.response,
      queryData: aiResponse.query,
      createdAt: new Date()
    };
    
    history.push(userMessage, assistantMessage);
    conversations.set(convId, history.slice(-20)); // 保留最近20条消息
    
    // 如果生成了查询，验证安全性（如果启用）
    if (aiResponse.query) {
      if (aiConfig.security.enableQueryValidation) {
        const validation = queryValidator.validateQuery(aiResponse.query);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: '生成的查询包含不安全的操作',
            details: validation.errors
          });
        }
      }
      
      // 清理查询
      aiResponse.query = queryValidator.sanitizeQuery(aiResponse.query);
    }
    
    res.json({
      success: true,
      data: {
        response: aiResponse.response,
        query: aiResponse.query,
        conversationId: convId,
        suggestions: aiResponse.suggestions || []
      }
    });
    
  } catch (error) {
    console.error('AI聊天错误:', error);
    res.status(500).json({
      success: false,
      error: 'AI服务暂时不可用，请稍后重试'
    });
  }
});

/**
 * 智能查询生成
 * POST /api/ai/generate-query
 */
router.post('/generate-query', checkAIAvailability, checkAIPermission('ai:query:basic'), queryComplexityMiddleware, async (req: AIAuthRequest, res: Response) => {
  try {
    const { description, collection, schema } = req.body;
    
    if (!description || !collection) {
      return res.status(400).json({
        success: false,
        error: '查询描述和集合名称不能为空'
      });
    }
    
    // 生成查询
    const queryResult = await getAIService().generateQuery(description, collection, schema);
    
    // 验证查询安全性（如果启用）
    let validation = { isValid: true, warnings: [], errors: [] };
    if (aiConfig.security.enableQueryValidation) {
      validation = queryValidator.validateQuery(queryResult.query);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: '生成的查询不安全',
          details: validation.errors
        });
      }
    }
    
    // 清理和优化查询
    const sanitizedQuery = queryValidator.sanitizeQuery(queryResult.query);
    const performance = queryValidator.estimatePerformance(sanitizedQuery);
    
    res.json({
      success: true,
      data: {
        query: sanitizedQuery,
        explanation: queryResult.explanation,
        estimatedPerformance: performance,
        warnings: validation.warnings
      }
    });
    
  } catch (error) {
    console.error('查询生成错误:', error);
    res.status(500).json({
      success: false,
      error: '查询生成失败，请检查描述是否清晰'
    });
  }
});

/**
 * 数据分析
 * POST /api/ai/analyze
 */
router.post('/analyze', checkAIAvailability, checkAIPermission('ai:analyze'), async (req: AIAuthRequest, res: Response) => {
  try {
    const { data, analysisType = 'auto', options = {} } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: '数据必须是数组格式'
      });
    }
    
    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        error: '数据不能为空'
      });
    }
    
    if (data.length > 10000) {
      return res.status(400).json({
        success: false,
        error: '数据量过大，请限制在10000条以内'
      });
    }
    
    // 执行数据分析
    const analysisResult = await getAIService().analyzeData(data, analysisType);
    
    res.json({
      success: true,
      data: analysisResult
    });
    
  } catch (error) {
    console.error('数据分析错误:', error);
    res.status(500).json({
      success: false,
      error: '数据分析失败，请检查数据格式'
    });
  }
});

/**
 * 获取对话历史
 * GET /api/ai/conversations/:conversationId
 */
router.get('/conversations/:conversationId', (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const history = conversations.get(conversationId) || [];
    
    res.json({
      success: true,
      data: {
        conversationId,
        messages: history,
        messageCount: history.length
      }
    });
    
  } catch (error) {
    console.error('获取对话历史错误:', error);
    res.status(500).json({
      success: false,
      error: '获取对话历史失败'
    });
  }
});

/**
 * 获取所有对话列表
 * GET /api/ai/conversations
 */
router.get('/conversations', (req: Request, res: Response) => {
  try {
    const conversationList = Array.from(conversations.entries()).map(([id, messages]) => {
      const lastMessage = messages[messages.length - 1];
      const firstMessage = messages.find(msg => msg.role === 'user');
      
      return {
        id,
        title: firstMessage?.content.slice(0, 50) + '...' || '新对话',
        lastMessage: lastMessage?.content.slice(0, 100) + '...' || '',
        messageCount: messages.length,
        updatedAt: lastMessage?.createdAt || new Date()
      };
    });
    
    // 按更新时间排序
    conversationList.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    res.json({
      success: true,
      data: conversationList
    });
    
  } catch (error) {
    console.error('获取对话列表错误:', error);
    res.status(500).json({
      success: false,
      error: '获取对话列表失败'
    });
  }
});

/**
 * 删除对话
 * DELETE /api/ai/conversations/:conversationId
 */
router.delete('/conversations/:conversationId', (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    
    if (conversations.has(conversationId)) {
      conversations.delete(conversationId);
      res.json({
        success: true,
        message: '对话已删除'
      });
    } else {
      res.status(404).json({
        success: false,
        error: '对话不存在'
      });
    }
    
  } catch (error) {
    console.error('删除对话错误:', error);
    res.status(500).json({
      success: false,
      error: '删除对话失败'
    });
  }
});

/**
 * 执行AI生成的查询
 * POST /api/ai/execute-query
 */
router.post('/execute-query', async (req: Request, res: Response) => {
  try {
    const { query, connectionString, database, collection } = req.body;
    
    if (!query || !connectionString || !database || !collection) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    // 验证查询安全性（如果启用）
    let validation = { isValid: true, warnings: [], errors: [] };
    if (aiConfig.security.enableQueryValidation) {
      validation = queryValidator.validateQuery(query);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: '查询不安全',
          details: validation.errors
        });
      }
    }
    
    // 连接数据库并执行查询
    const client = new MongoClient(connectionString);
    await client.connect();
    
    try {
      const db = client.db(database);
      const coll = db.collection(collection);
      
      let results;
      const startTime = Date.now();
      
      // 根据查询类型执行不同操作
      if (query.pipeline) {
        // 聚合查询
        results = await coll.aggregate(query.pipeline).toArray();
      } else {
        // 普通查询
        const cursor = coll.find(query.filter || {});
        
        if (query.sort) cursor.sort(query.sort);
        if (query.limit) cursor.limit(query.limit);
        if (query.skip) cursor.skip(query.skip);
        
        results = await cursor.toArray();
      }
      
      const executionTime = Date.now() - startTime;
      
      res.json({
        success: true,
        data: {
          results,
          count: results.length,
          executionTime,
          warnings: validation.warnings
        }
      });
      
    } finally {
      await client.close();
    }
    
  } catch (error) {
    console.error('执行查询错误:', error);
    res.status(500).json({
      success: false,
      error: '查询执行失败: ' + (error as Error).message
    });
  }
});

/**
 * AI功能健康检查
 * GET /api/ai/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const configValidation = validateAIConfig(aiConfig);
    
    const status = {
      config: {
        valid: configValidation.isValid,
        errors: configValidation.errors
      },
      openai: {
        configured: !!aiConfig.openai.apiKey,
        model: aiConfig.openai.model,
        status: 'unknown'
      },
      redis: {
        configured: !!aiConfig.redis.url,
        cachingEnabled: aiConfig.features.cachingEnabled,
        status: 'unknown'
      },
      features: aiConfig.features,
      security: {
        queryValidationEnabled: aiConfig.security.enableQueryValidation,
        maxQueryComplexity: aiConfig.security.maxQueryComplexity,
        maxResultSize: aiConfig.security.maxResultSize
      },
      conversations: {
        active: conversations.size
      }
    };
    
    // 尝试初始化AI服务
    try {
      const service = getAIService();
      status.openai.status = 'available';
      
      // 测试Redis连接
      if (service['redis'] && aiConfig.features.cachingEnabled) {
        await service.getCachedResponse('health_check');
        status.redis.status = 'available';
      } else if (!aiConfig.features.cachingEnabled) {
        status.redis.status = 'disabled';
      }
    } catch (error) {
      status.openai.status = 'error';
      console.error('AI服务初始化失败:', error);
      if (error.message.includes('Redis') || error.message.includes('redis')) {
        status.redis.status = 'error';
      }
    }
    
    const isHealthy = status.openai.status === 'available' && configValidation.isValid;
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: {
        ...status,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('健康检查错误:', error);
    res.status(500).json({
      success: false,
      error: '健康检查失败',
      details: (error as Error).message
    });
  }
});

export default router;
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export interface AIAuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
  aiContext?: {
    maxQueryComplexity: number;
    maxResultSize: number;
    allowedCollections: string[];
    rateLimitPerHour: number;
  };
}

/**
 * AI功能权限验证中间件
 */
export const aiAuthMiddleware = (req: AIAuthRequest, res: Response, next: NextFunction) => {
  try {
    // 检查是否启用了AI功能
    if (process.env.AI_FEATURE_ENABLED !== 'true') {
      return res.status(503).json({
        success: false,
        error: 'AI功能暂时不可用'
      });
    }
    
    // 从请求头获取认证信息
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      // 如果没有token，使用匿名用户权限
      req.user = {
        id: 'anonymous',
        role: 'guest',
        permissions: ['ai:chat', 'ai:query:basic']
      };
      
      req.aiContext = {
        maxQueryComplexity: 3,
        maxResultSize: 100,
        allowedCollections: [],
        rateLimitPerHour: 10
      };
      
      return next();
    }
    
    // 验证JWT token
    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    req.user = {
      id: decoded.id || decoded.userId,
      role: decoded.role || 'user',
      permissions: decoded.permissions || ['ai:chat', 'ai:query:basic', 'ai:analyze']
    };
    
    // 根据用户角色设置AI上下文
    req.aiContext = getAIContextByRole(req.user.role);
    
    next();
    
  } catch (error) {
    console.error('AI认证中间件错误:', error);
    
    // 认证失败时使用受限权限
    req.user = {
      id: 'anonymous',
      role: 'guest',
      permissions: ['ai:chat']
    };
    
    req.aiContext = {
      maxQueryComplexity: 1,
      maxResultSize: 50,
      allowedCollections: [],
      rateLimitPerHour: 5
    };
    
    next();
  }
};

/**
 * 检查AI功能权限
 */
export const checkAIPermission = (permission: string) => {
  return (req: AIAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: '权限不足，无法访问此AI功能'
      });
    }
    next();
  };
};

/**
 * 速率限制中间件
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const aiRateLimitMiddleware = (req: AIAuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id || req.ip;
  const maxRequests = req.aiContext?.rateLimitPerHour || 10;
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  
  const userRequests = requestCounts.get(userId);
  
  if (!userRequests || now > userRequests.resetTime) {
    // 重置计数器
    requestCounts.set(userId, {
      count: 1,
      resetTime: now + hourInMs
    });
    return next();
  }
  
  if (userRequests.count >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
    });
  }
  
  userRequests.count++;
  next();
};

/**
 * 查询复杂度验证中间件
 */
export const queryComplexityMiddleware = (req: AIAuthRequest, res: Response, next: NextFunction) => {
  const { query } = req.body;
  const maxComplexity = req.aiContext?.maxQueryComplexity || 3;
  
  if (query) {
    const complexity = calculateQueryComplexity(query);
    if (complexity > maxComplexity) {
      return res.status(400).json({
        success: false,
        error: `查询过于复杂（复杂度: ${complexity}，最大允许: ${maxComplexity}）`
      });
    }
  }
  
  next();
};

/**
 * 结果大小限制中间件
 */
export const resultSizeLimitMiddleware = (req: AIAuthRequest, res: Response, next: NextFunction) => {
  const maxSize = req.aiContext?.maxResultSize || 100;
  
  // 保存原始的json方法
  const originalJson = res.json;
  
  // 重写json方法以检查结果大小
  res.json = function(data: any) {
    if (data && data.data && Array.isArray(data.data.results)) {
      if (data.data.results.length > maxSize) {
        data.data.results = data.data.results.slice(0, maxSize);
        data.data.truncated = true;
        data.data.originalCount = data.data.count;
        data.data.count = maxSize;
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * 根据用户角色获取AI上下文
 */
function getAIContextByRole(role: string) {
  switch (role) {
    case 'admin':
      return {
        maxQueryComplexity: 10,
        maxResultSize: 10000,
        allowedCollections: ['*'],
        rateLimitPerHour: 1000
      };
    
    case 'premium':
      return {
        maxQueryComplexity: 7,
        maxResultSize: 5000,
        allowedCollections: ['*'],
        rateLimitPerHour: 200
      };
    
    case 'user':
      return {
        maxQueryComplexity: 5,
        maxResultSize: 1000,
        allowedCollections: ['*'],
        rateLimitPerHour: 50
      };
    
    case 'guest':
    default:
      return {
        maxQueryComplexity: 3,
        maxResultSize: 100,
        allowedCollections: [],
        rateLimitPerHour: 10
      };
  }
}

/**
 * 计算查询复杂度
 */
function calculateQueryComplexity(query: any): number {
  let complexity = 0;
  
  // 基础复杂度
  complexity += 1;
  
  // 聚合管道复杂度
  if (query.pipeline && Array.isArray(query.pipeline)) {
    complexity += query.pipeline.length;
    
    // 特殊阶段额外复杂度
    for (const stage of query.pipeline) {
      if (stage.$lookup) complexity += 2;
      if (stage.$facet) complexity += 3;
      if (stage.$graphLookup) complexity += 4;
    }
  }
  
  // 嵌套深度复杂度
  complexity += getObjectDepth(query);
  
  // 条件数量复杂度
  complexity += Math.floor(countConditions(query) / 5);
  
  return complexity;
}

function getObjectDepth(obj: any, depth: number = 0): number {
  if (typeof obj !== 'object' || obj === null) {
    return depth;
  }
  
  let maxDepth = depth;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const currentDepth = getObjectDepth(obj[key], depth + 1);
      maxDepth = Math.max(maxDepth, currentDepth);
    }
  }
  
  return maxDepth;
}

function countConditions(obj: any): number {
  if (typeof obj !== 'object' || obj === null) {
    return 0;
  }
  
  let count = 0;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      count++;
      count += countConditions(obj[key]);
    }
  }
  
  return count;
}

export default {
  aiAuthMiddleware,
  checkAIPermission,
  aiRateLimitMiddleware,
  queryComplexityMiddleware,
  resultSizeLimitMiddleware
};
import express from 'express';
import { cacheManager } from '../services/cacheManager';
import { aiAuthMiddleware, checkAIPermission, AIAuthRequest } from '../middleware/aiAuth';

const router = express.Router();

// 应用认证中间件
router.use(aiAuthMiddleware);

/**
 * 获取缓存统计信息
 * GET /api/cache/stats
 */
router.get('/stats', checkAIPermission('ai:cache:read'), async (req: AIAuthRequest, res) => {
  try {
    const stats = cacheManager.getStats();
    const size = await cacheManager.getSize();
    
    res.json({
      success: true,
      data: {
        ...stats,
        ...size,
        hitRateFormatted: `${stats.hitRate.toFixed(2)}%`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取缓存统计失败',
      details: error.message
    });
  }
});

/**
 * 检查特定缓存是否存在
 * GET /api/cache/exists/:key
 */
router.get('/exists/:key', checkAIPermission('ai:cache:read'), async (req: AIAuthRequest, res) => {
  try {
    const { key } = req.params;
    const exists = await cacheManager.exists(key);
    const ttl = exists ? await cacheManager.getTTL(key) : -1;
    
    res.json({
      success: true,
      data: {
        key,
        exists,
        ttl,
        expiresIn: ttl > 0 ? `${ttl}秒` : ttl === -1 ? '不存在' : '永不过期'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '检查缓存失败',
      details: error.message
    });
  }
});

/**
 * 获取缓存内容
 * GET /api/cache/get/:key
 */
router.get('/get/:key', checkAIPermission('ai:cache:read'), async (req: AIAuthRequest, res) => {
  try {
    const { key } = req.params;
    const value = await cacheManager.get(key);
    
    if (value === null) {
      return res.status(404).json({
        success: false,
        error: '缓存不存在'
      });
    }
    
    res.json({
      success: true,
      data: {
        key,
        value,
        type: typeof value,
        size: JSON.stringify(value).length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取缓存失败',
      details: error.message
    });
  }
});

/**
 * 设置缓存
 * POST /api/cache/set
 */
router.post('/set', checkAIPermission('ai:cache:write'), async (req: AIAuthRequest, res) => {
  try {
    const { key, value, ttl, tags, compress } = req.body;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: '缓存键不能为空'
      });
    }
    
    const success = await cacheManager.set(key, value, {
      ttl: ttl || undefined,
      tags: tags || undefined,
      compress: compress || false
    });
    
    if (success) {
      res.json({
        success: true,
        message: '缓存设置成功'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '缓存设置失败'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '设置缓存失败',
      details: error.message
    });
  }
});

/**
 * 删除特定缓存
 * DELETE /api/cache/delete/:key
 */
router.delete('/delete/:key', checkAIPermission('ai:cache:write'), async (req: AIAuthRequest, res) => {
  try {
    const { key } = req.params;
    const success = await cacheManager.delete(key);
    
    if (success) {
      res.json({
        success: true,
        message: '缓存删除成功'
      });
    } else {
      res.status(404).json({
        success: false,
        error: '缓存不存在或删除失败'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '删除缓存失败',
      details: error.message
    });
  }
});

/**
 * 根据标签删除缓存
 * DELETE /api/cache/delete-by-tag/:tag
 */
router.delete('/delete-by-tag/:tag', checkAIPermission('ai:cache:write'), async (req: AIAuthRequest, res) => {
  try {
    const { tag } = req.params;
    const deletedCount = await cacheManager.deleteByTag(tag);
    
    res.json({
      success: true,
      message: `成功删除${deletedCount}个缓存项`,
      deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '按标签删除缓存失败',
      details: error.message
    });
  }
});

/**
 * 延长缓存过期时间
 * PUT /api/cache/extend/:key
 */
router.put('/extend/:key', checkAIPermission('ai:cache:write'), async (req: AIAuthRequest, res) => {
  try {
    const { key } = req.params;
    const { ttl } = req.body;
    
    if (!ttl || ttl <= 0) {
      return res.status(400).json({
        success: false,
        error: 'TTL必须是正数'
      });
    }
    
    const success = await cacheManager.extend(key, ttl);
    
    if (success) {
      res.json({
        success: true,
        message: '缓存过期时间延长成功'
      });
    } else {
      res.status(404).json({
        success: false,
        error: '缓存不存在或延长失败'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '延长缓存过期时间失败',
      details: error.message
    });
  }
});

/**
 * 清空所有AI相关缓存
 * DELETE /api/cache/flush
 */
router.delete('/flush', checkAIPermission('ai:cache:admin'), async (req: AIAuthRequest, res) => {
  try {
    const success = await cacheManager.flush();
    
    if (success) {
      res.json({
        success: true,
        message: '所有缓存已清空'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '清空缓存失败'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '清空缓存失败',
      details: error.message
    });
  }
});

/**
 * 缓存健康检查
 * GET /api/cache/health
 */
router.get('/health', async (req: AIAuthRequest, res) => {
  try {
    const stats = cacheManager.getStats();
    const size = await cacheManager.getSize();
    
    // 简单的健康检查逻辑
    const isHealthy = stats.errors < 10 && stats.hitRate > 10; // 错误少于10个且命中率大于10%
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        stats,
        size,
        recommendations: getHealthRecommendations(stats)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '缓存健康检查失败',
      details: error.message
    });
  }
});

/**
 * 获取健康建议
 */
function getHealthRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  if (stats.hitRate < 20) {
    recommendations.push('缓存命中率较低，考虑优化缓存策略');
  }
  
  if (stats.errors > 5) {
    recommendations.push('缓存错误较多，检查Redis连接和配置');
  }
  
  if (stats.hits + stats.misses > 10000) {
    recommendations.push('缓存访问量较大，考虑增加缓存容量');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('缓存运行状态良好');
  }
  
  return recommendations;
}

export default router;
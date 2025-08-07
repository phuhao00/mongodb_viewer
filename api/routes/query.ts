import express, { Request, Response } from 'express';
import DatabaseManager from '../config/database.js';

const router = express.Router();
const dbManager = DatabaseManager.getInstance();

// 存储查询历史（实际项目中应该存储在数据库中）
const queryHistory = new Map<string, {
  id: string;
  connectionId: string;
  database: string;
  collection: string;
  query: any;
  result: any;
  executionTime: number;
  createdAt: Date;
}>();

// 执行查询
router.post('/:connectionId', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const { database, collection, operation = 'find', query = {}, options = {} } = req.body;

    if (!database || !collection) {
      return res.status(400).json({
        success: false,
        message: '数据库名称和集合名称是必需的'
      });
    }

    let result;
    const client = dbManager.getConnection(connectionId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }

    const db = client.db(database);
    const coll = db.collection(collection);
    const startTime = Date.now();

    switch (operation) {
      case 'find':
        result = await dbManager.executeQuery(
          connectionId,
          database,
          collection,
          query,
          options
        );
        break;
      
      case 'count':
        const count = await coll.countDocuments(query);
        result = {
          data: [{ count }],
          count: 1,
          executionTime: Date.now() - startTime
        };
        break;
      
      case 'distinct':
        if (!options.field) {
          return res.status(400).json({
            success: false,
            message: 'distinct操作需要指定field参数'
          });
        }
        const distinctValues = await coll.distinct(options.field, query);
        result = {
          data: distinctValues.map(value => ({ [options.field]: value })),
          count: distinctValues.length,
          executionTime: Date.now() - startTime
        };
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: `不支持的操作类型: ${operation}`
        });
    }

    // 保存查询历史
    const historyId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    queryHistory.set(historyId, {
      id: historyId,
      connectionId,
      database,
      collection,
      query,
      result: {
        count: result.count,
        executionTime: result.executionTime
      },
      executionTime: result.executionTime,
      createdAt: new Date()
    });

    res.json({
      success: true,
      data: result.data,
      count: result.count,
      executionTime: result.executionTime
    });
  } catch (error) {
    console.error('查询执行失败:', error);
    res.status(500).json({
      success: false,
      message: '查询执行失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 执行聚合查询
router.post('/:connectionId/aggregate', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const { database, collection, pipeline = [] } = req.body;

    if (!database || !collection) {
      return res.status(400).json({
        success: false,
        message: '数据库名称和集合名称是必需的'
      });
    }

    if (!Array.isArray(pipeline)) {
      return res.status(400).json({
        success: false,
        message: '聚合管道必须是数组格式'
      });
    }

    const result = await dbManager.executeAggregation(
      connectionId,
      database,
      collection,
      pipeline
    );

    // 保存查询历史
    const historyId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    queryHistory.set(historyId, {
      id: historyId,
      connectionId,
      database,
      collection,
      query: { type: 'aggregate', pipeline },
      result: {
        count: result.data.length,
        executionTime: result.executionTime
      },
      executionTime: result.executionTime,
      createdAt: new Date()
    });

    res.json({
      success: true,
      data: result.data,
      count: result.data.length,
      executionTime: result.executionTime
    });
  } catch (error) {
    console.error('聚合查询执行失败:', error);
    res.status(500).json({
      success: false,
      message: '聚合查询执行失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取查询历史
router.get('/:connectionId/history', (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const history = Array.from(queryHistory.values())
      .filter(h => h.connectionId === connectionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map(h => ({
        id: h.id,
        database: h.database,
        collection: h.collection,
        query: h.query,
        executionTime: h.executionTime,
        createdAt: h.createdAt
      }));

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('获取查询历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取查询历史失败'
    });
  }
});

// 获取集合统计信息
router.get('/:connectionId/stats/:database/:collection', async (req: Request, res: Response) => {
  try {
    const { connectionId, database, collection } = req.params;
    
    const client = dbManager.getConnection(connectionId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }

    const db = client.db(database);
    const coll = db.collection(collection);
    
    // 获取基本统计信息
    const stats = await db.command({ collStats: collection });
    const count = await coll.countDocuments();
    const indexes = await coll.indexes();
    
    // 获取样本数据
    const sampleData = await coll.find({}).limit(5).toArray();
    
    res.json({
      success: true,
      data: {
        count,
        size: stats.size || 0,
        avgObjSize: stats.avgObjSize || 0,
        storageSize: stats.storageSize || 0,
        indexes: indexes.length,
        indexDetails: indexes,
        sampleData
      }
    });
  } catch (error) {
    console.error('获取集合统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取集合统计失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取集合索引
router.get('/:connectionId/indexes/:database/:collection', async (req: Request, res: Response) => {
  try {
    const { connectionId, database, collection } = req.params;
    
    const client = dbManager.getConnection(connectionId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }

    const db = client.db(database);
    const coll = db.collection(collection);
    const indexes = await coll.indexes();
    
    res.json({
      success: true,
      data: indexes
    });
  } catch (error) {
    console.error('获取索引失败:', error);
    res.status(500).json({
      success: false,
      message: '获取索引失败'
    });
  }
});

// 创建索引
router.post('/:connectionId/indexes/:database/:collection', async (req: Request, res: Response) => {
  try {
    const { connectionId, database, collection } = req.params;
    const { keys, options = {} } = req.body;
    
    if (!keys) {
      return res.status(400).json({
        success: false,
        message: '索引键是必需的'
      });
    }

    const client = dbManager.getConnection(connectionId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }

    const db = client.db(database);
    const coll = db.collection(collection);
    const result = await coll.createIndex(keys, options);
    
    res.json({
      success: true,
      data: { indexName: result }
    });
  } catch (error) {
    console.error('创建索引失败:', error);
    res.status(500).json({
      success: false,
      message: '创建索引失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
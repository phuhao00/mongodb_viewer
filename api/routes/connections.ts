import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import DatabaseManager from '../config/database.js';

const router = express.Router();
const dbManager = DatabaseManager.getInstance();

// 存储连接配置（实际项目中应该存储在数据库中）
const connections = new Map<string, {
  id: string;
  name: string;
  uri: string;
  options: any;
  createdAt: Date;
  updatedAt: Date;
}>();

// 创建新连接
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, uri, options = {} } = req.body;

    if (!name || !uri) {
      return res.status(400).json({
        success: false,
        message: '连接名称和URI是必需的'
      });
    }

    // 测试连接
    const isValid = await dbManager.testConnection(uri, options);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: '无法连接到MongoDB服务器'
      });
    }

    const connectionId = uuidv4();
    const connection = {
      id: connectionId,
      name,
      uri,
      options,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    connections.set(connectionId, connection);

    // 创建实际连接
    await dbManager.createConnection(connectionId, uri, options);

    res.json({
      success: true,
      connectionId,
      message: '连接创建成功'
    });
  } catch (error) {
    console.error('创建连接失败:', error);
    res.status(500).json({
      success: false,
      message: '创建连接失败'
    });
  }
});

// 获取所有连接
router.get('/', (req: Request, res: Response) => {
  try {
    const connectionList = Array.from(connections.values()).map(conn => ({
      id: conn.id,
      name: conn.name,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt
    }));

    res.json({
      success: true,
      data: connectionList
    });
  } catch (error) {
    console.error('获取连接列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取连接列表失败'
    });
  }
});

// 获取单个连接详情
router.get('/:connectionId', (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const connection = connections.get(connectionId);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }

    res.json({
      success: true,
      data: {
        id: connection.id,
        name: connection.name,
        uri: connection.uri,
        options: connection.options,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt
      }
    });
  } catch (error) {
    console.error('获取连接详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取连接详情失败'
    });
  }
});

// 测试连接
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { uri, options = {} } = req.body;

    if (!uri) {
      return res.status(400).json({
        success: false,
        message: 'URI是必需的'
      });
    }

    const result = await dbManager.testConnection(uri, options);
    
    let message = '连接失败';
    if (result.success) {
      if (result.canListDatabases) {
        message = '连接成功，可以访问数据库列表';
      } else {
        message = result.error || '连接成功，但可能需要认证才能访问数据库列表';
      }
    } else {
      message = result.error || '连接失败';
    }
    
    res.json({
      success: true,
      connected: result.success,
      canListDatabases: result.canListDatabases || false,
      message,
      error: result.error
    });
  } catch (error) {
    console.error('测试连接失败:', error);
    res.status(500).json({
      success: false,
      message: '测试连接失败'
    });
  }
});

// 更新连接
router.put('/:connectionId', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const { name, uri, options = {} } = req.body;

    if (!name || !uri) {
      return res.status(400).json({
        success: false,
        message: '连接名称和URI是必需的'
      });
    }

    const connection = connections.get(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }

    // 测试新的连接配置
    const isValid = await dbManager.testConnection(uri, options);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: '无法连接到MongoDB服务器'
      });
    }

    // 关闭旧连接
    await dbManager.closeConnection(connectionId);

    // 更新连接配置
    const updatedConnection = {
      ...connection,
      name,
      uri,
      options,
      updatedAt: new Date()
    };

    connections.set(connectionId, updatedConnection);

    // 创建新连接
    await dbManager.createConnection(connectionId, uri, options);

    res.json({
      success: true,
      message: '连接更新成功'
    });
  } catch (error) {
    console.error('更新连接失败:', error);
    res.status(500).json({
      success: false,
      message: '更新连接失败'
    });
  }
});

// 删除连接
router.delete('/:connectionId', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const connection = connections.get(connectionId);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }

    // 关闭数据库连接
    await dbManager.closeConnection(connectionId);
    
    // 删除连接配置
    connections.delete(connectionId);

    res.json({
      success: true,
      message: '连接删除成功'
    });
  } catch (error) {
    console.error('删除连接失败:', error);
    res.status(500).json({
      success: false,
      message: '删除连接失败'
    });
  }
});

// 获取数据库列表
router.get('/:connectionId/databases', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    
    if (!connections.has(connectionId)) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }

    const result = await dbManager.getDatabases(connectionId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(403).json({
        success: false,
        message: result.error || '获取数据库列表失败',
        requiresAuth: result.error?.includes('认证') || result.error?.includes('权限')
      });
    }
  } catch (error) {
    console.error('获取数据库列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据库列表失败'
    });
  }
});

// 获取集合列表
router.get('/:connectionId/databases/:databaseName/collections', async (req: Request, res: Response) => {
  try {
    const { connectionId, databaseName } = req.params;
    
    if (!connections.has(connectionId)) {
      return res.status(404).json({
        success: false,
        message: '连接不存在'
      });
    }

    const collections = await dbManager.getCollections(connectionId, databaseName);
    
    res.json({
      success: true,
      data: collections
    });
  } catch (error) {
    console.error('获取集合列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取集合列表失败'
    });
  }
});

export default router;
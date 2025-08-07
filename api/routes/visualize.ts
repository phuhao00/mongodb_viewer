import express, { Request, Response } from 'express';
import DatabaseManager from '../config/database.js';

const router = express.Router();
const dbManager = DatabaseManager.getInstance();

// 存储可视化配置（实际项目中应该存储在数据库中）
const visualizations = new Map<string, {
  id: string;
  connectionId: string;
  name: string;
  chartType: string;
  config: any;
  data: any;
  createdAt: Date;
  updatedAt: Date;
}>();

// 生成图表数据
router.post('/:connectionId', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const { database, collection, aggregation, chartType, config = {} } = req.body;

    if (!database || !collection || !chartType) {
      return res.status(400).json({
        success: false,
        message: '数据库名称、集合名称和图表类型是必需的'
      });
    }

    let pipeline = aggregation;
    
    // 根据图表类型生成默认聚合管道
    if (!pipeline || pipeline.length === 0) {
      pipeline = generateDefaultPipeline(chartType, config);
    }

    const result = await dbManager.executeAggregation(
      connectionId,
      database,
      collection,
      pipeline
    );

    // 转换数据格式以适应不同图表类型
    const chartData = transformDataForChart(result.data, chartType, config);

    res.json({
      success: true,
      chartData,
      metadata: {
        chartType,
        dataCount: result.data.length,
        executionTime: result.executionTime,
        pipeline
      }
    });
  } catch (error) {
    console.error('生成图表数据失败:', error);
    res.status(500).json({
      success: false,
      message: '生成图表数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 保存可视化配置
router.post('/:connectionId/save', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const { name, chartType, config, data } = req.body;

    if (!name || !chartType) {
      return res.status(400).json({
        success: false,
        message: '名称和图表类型是必需的'
      });
    }

    const visualizationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const visualization = {
      id: visualizationId,
      connectionId,
      name,
      chartType,
      config,
      data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    visualizations.set(visualizationId, visualization);

    res.json({
      success: true,
      visualizationId,
      message: '可视化配置保存成功'
    });
  } catch (error) {
    console.error('保存可视化配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存可视化配置失败'
    });
  }
});

// 获取可视化列表
router.get('/:connectionId/list', (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    
    const visualizationList = Array.from(visualizations.values())
      .filter(v => v.connectionId === connectionId)
      .map(v => ({
        id: v.id,
        name: v.name,
        chartType: v.chartType,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt
      }));

    res.json({
      success: true,
      data: visualizationList
    });
  } catch (error) {
    console.error('获取可视化列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取可视化列表失败'
    });
  }
});

// 获取可视化详情
router.get('/:connectionId/:visualizationId', (req: Request, res: Response) => {
  try {
    const { visualizationId } = req.params;
    const visualization = visualizations.get(visualizationId);

    if (!visualization) {
      return res.status(404).json({
        success: false,
        message: '可视化配置不存在'
      });
    }

    res.json({
      success: true,
      data: visualization
    });
  } catch (error) {
    console.error('获取可视化详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取可视化详情失败'
    });
  }
});

// 删除可视化配置
router.delete('/:connectionId/:visualizationId', (req: Request, res: Response) => {
  try {
    const { visualizationId } = req.params;
    
    if (!visualizations.has(visualizationId)) {
      return res.status(404).json({
        success: false,
        message: '可视化配置不存在'
      });
    }

    visualizations.delete(visualizationId);

    res.json({
      success: true,
      message: '可视化配置删除成功'
    });
  } catch (error) {
    console.error('删除可视化配置失败:', error);
    res.status(500).json({
      success: false,
      message: '删除可视化配置失败'
    });
  }
});

// 保存可视化配置
router.post('/:connectionId/save', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const { name, chartType, config, data, database, collection } = req.body;

    if (!name || !chartType || !config) {
      return res.status(400).json({
        success: false,
        message: '名称、图表类型和配置是必需的'
      });
    }

    const visualizationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const visualization = {
      id: visualizationId,
      connectionId,
      name,
      chartType,
      database,
      collection,
      config,
      data: data || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    visualizations.set(visualizationId, visualization);

    res.json({
      success: true,
      visualizationId,
      message: '可视化配置保存成功'
    });
  } catch (error) {
    console.error('保存可视化配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存可视化配置失败'
    });
  }
});

// 获取数据分析建议
router.get('/:connectionId/suggestions/:database/:collection', async (req: Request, res: Response) => {
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
    
    // 获取样本数据分析字段类型
    const sampleData = await coll.find({}).limit(100).toArray();
    const fieldAnalysis = analyzeFields(sampleData);
    
    // 生成可视化建议
    const suggestions = generateVisualizationSuggestions(fieldAnalysis);

    res.json({
      success: true,
      data: {
        fieldAnalysis,
        suggestions
      }
    });
  } catch (error) {
    console.error('获取分析建议失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分析建议失败'
    });
  }
});

// 生成默认聚合管道
function generateDefaultPipeline(chartType: string, config: any): any[] {
  switch (chartType) {
    case 'pie':
      return [
        { $group: { _id: `$${config.field || 'status'}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ];
    
    case 'bar':
    case 'column':
      return [
        { $group: { _id: `$${config.xField || 'category'}`, value: { $sum: 1 } } },
        { $sort: { value: -1 } },
        { $limit: 20 }
      ];
    
    case 'line':
      return [
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: `$${config.dateField || 'createdAt'}`
              }
            },
            value: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ];
    
    default:
      return [{ $limit: 100 }];
  }
}

// 转换数据格式
function transformDataForChart(data: any[], chartType: string, config: any): any {
  switch (chartType) {
    case 'pie':
      return data.map(item => ({
        name: item._id || 'Unknown',
        value: item.count || item.value || 0
      }));
    
    case 'bar':
    case 'column':
      return data.map(item => ({
        name: item._id || 'Unknown',
        value: item.value || item.count || 0
      }));
    
    case 'line':
      return data.map(item => ({
        date: item._id,
        value: item.value || item.count || 0
      }));
    
    default:
      return data;
  }
}

// 分析字段类型
function analyzeFields(data: any[]): any {
  if (data.length === 0) return {};
  
  const fieldTypes: any = {};
  const sample = data[0];
  
  Object.keys(sample).forEach(key => {
    const values = data.map(item => item[key]).filter(v => v != null);
    if (values.length === 0) return;
    
    const firstValue = values[0];
    let type = 'unknown';
    
    if (typeof firstValue === 'string') {
      if (Date.parse(firstValue)) {
        type = 'date';
      } else {
        type = 'string';
      }
    } else if (typeof firstValue === 'number') {
      type = 'number';
    } else if (typeof firstValue === 'boolean') {
      type = 'boolean';
    } else if (firstValue instanceof Date) {
      type = 'date';
    }
    
    fieldTypes[key] = {
      type,
      uniqueValues: new Set(values.slice(0, 50)).size,
      sampleValues: values.slice(0, 5)
    };
  });
  
  return fieldTypes;
}

// 生成可视化建议
function generateVisualizationSuggestions(fieldAnalysis: any): any[] {
  const suggestions = [];
  
  // 查找适合饼图的字段（字符串类型，唯一值较少）
  const categoricalFields = Object.entries(fieldAnalysis)
    .filter(([_, info]: [string, any]) => info.type === 'string' && info.uniqueValues <= 10)
    .map(([field, _]) => field);
  
  if (categoricalFields.length > 0) {
    suggestions.push({
      chartType: 'pie',
      title: '分类分布图',
      description: '显示不同类别的数据分布',
      config: { field: categoricalFields[0] }
    });
  }
  
  // 查找适合时间序列的字段
  const dateFields = Object.entries(fieldAnalysis)
    .filter(([_, info]: [string, any]) => info.type === 'date')
    .map(([field, _]) => field);
  
  if (dateFields.length > 0) {
    suggestions.push({
      chartType: 'line',
      title: '时间趋势图',
      description: '显示数据随时间的变化趋势',
      config: { dateField: dateFields[0] }
    });
  }
  
  // 数值字段的统计图
  const numericFields = Object.entries(fieldAnalysis)
    .filter(([_, info]: [string, any]) => info.type === 'number')
    .map(([field, _]) => field);
  
  if (numericFields.length > 0 && categoricalFields.length > 0) {
    suggestions.push({
      chartType: 'bar',
      title: '分类统计图',
      description: '显示不同类别的数值统计',
      config: {
        xField: categoricalFields[0],
        yField: numericFields[0]
      }
    });
  }
  
  return suggestions;
}

export default router;
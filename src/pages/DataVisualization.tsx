import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  Save, 
  Download, 
  Loader2, 
  Database,
  Plus,
  Trash2,
  Edit,
  Eye
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart as RechartsLineChart, 
  Line, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { useConnections, useDatabase, useVisualization, useUI } from '../store/useStore';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Dialog } from '../components/ui/Dialog';
import { toast } from '../components/ui/Toast';
import { cn, formatJSON } from '../lib/utils';

interface ChartConfig {
  type: 'bar' | 'line' | 'pie';
  title: string;
  xField: string;
  yField: string;
  groupField?: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  colors?: string[];
}

interface VisualizationItem {
  id: string;
  name: string;
  database: string;
  collection: string;
  config: ChartConfig;
  data: any[];
  createdAt: Date;
  updatedAt: Date;
}

const CHART_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
  '#ff00ff', '#00ffff', '#ff0000', '#0000ff', '#ffff00'
];

const DataVisualization: React.FC = () => {
  const { currentConnection, currentConnectionId, connections } = useConnections();
  const { databases } = useDatabase();
  const { visualizations, setVisualizations } = useVisualization();
  const { loading, setLoading } = useUI();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [collections, setCollections] = useState<any[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'bar',
    title: '',
    xField: '',
    yField: '',
    aggregation: 'count'
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [editingVisualization, setEditingVisualization] = useState<string | null>(null);

  const currentConn = connections.find(c => c.id === currentConnectionId);

  useEffect(() => {
    if (currentConnectionId) {
      loadVisualizations();
    }
  }, [currentConnectionId]);

  useEffect(() => {
    if (selectedDatabase && currentConnectionId) {
      loadCollections();
    }
  }, [selectedDatabase, currentConnectionId]);

  const loadVisualizations = async () => {
    if (!currentConnectionId) return;

    try {
      setLoading('visualizations', true);
      const response = await api.visualize.getAll(currentConnectionId);
      if (response.success) {
        setVisualizations(response.data);
      }
    } catch (error: any) {
      console.error('加载可视化失败:', error);
      toast.error(error.message || '加载可视化失败');
    } finally {
      setLoading('visualizations', false);
    }
  };

  const loadCollections = async () => {
    if (!currentConnectionId || !selectedDatabase) return;

    try {
      const response = await api.connections.getCollections(currentConnectionId, selectedDatabase);
      if (response.success) {
        setCollections(response.data);
      }
    } catch (error: any) {
      console.error('加载集合失败:', error);
      toast.error(error.message || '加载集合失败');
    }
  };

  const generateChartData = async () => {
    if (!currentConnectionId || !selectedDatabase || !selectedCollection || !chartConfig.xField) {
      toast.error('请完整填写图表配置');
      return;
    }

    try {
      setLoading('chartData', true);
      
      // 构建聚合管道
      const pipeline = [];
      
      if (chartConfig.aggregation === 'count') {
        pipeline.push({
          $group: {
            _id: `$${chartConfig.xField}`,
            value: { $sum: 1 }
          }
        });
      } else {
        if (!chartConfig.yField) {
          toast.error('请选择Y轴字段');
          return;
        }
        pipeline.push({
          $group: {
            _id: `$${chartConfig.xField}`,
            value: { [`$${chartConfig.aggregation}`]: `$${chartConfig.yField}` }
          }
        });
      }
      
      pipeline.push({ $sort: { _id: 1 } });
      pipeline.push({ $limit: 50 });

      const response = await api.visualize.generate(currentConnectionId, {
        database: selectedDatabase,
        collection: selectedCollection,
        aggregation: pipeline,
        chartType: chartConfig.type,
        config: chartConfig
      });

      if (response.success) {
        const formattedData = response.chartData.map((item: any) => ({
          name: item._id?.toString() || 'Unknown',
          value: item.value || 0
        }));
        setPreviewData(formattedData);
        toast.success('图表数据生成成功');
      }
    } catch (error: any) {
      console.error('生成图表数据失败:', error);
      toast.error(error.message || '生成图表数据失败');
    } finally {
      setLoading('chartData', false);
    }
  };

  const saveVisualization = async () => {
    if (!chartConfig.title || previewData.length === 0) {
      toast.error('请填写标题并生成图表数据');
      return;
    }

    try {
      setLoading('save', true);
      
      const visualizationData = {
        name: chartConfig.title,
        chartType: chartConfig.type,
        database: selectedDatabase,
        collection: selectedCollection,
        config: chartConfig,
        data: previewData
      };

      if (editingVisualization) {
        const response = await api.visualize.update(currentConnectionId!, editingVisualization, visualizationData);
        if (response.success) {
          toast.success('可视化更新成功');
          setEditingVisualization(null);
        }
      } else {
        const response = await api.visualize.save(currentConnectionId!, visualizationData);
        if (response.success) {
          toast.success('可视化保存成功');
        }
      }
      
      setShowCreateDialog(false);
      resetForm();
      await loadVisualizations();
    } catch (error: any) {
      console.error('保存可视化失败:', error);
      toast.error(error.message || '保存可视化失败');
    } finally {
      setLoading('save', false);
    }
  };

  const deleteVisualization = async (id: string) => {
    if (!confirm('确定要删除这个可视化吗？')) {
      return;
    }

    try {
      const response = await api.visualize.delete(currentConnectionId!, id);
      if (response.success) {
        toast.success('可视化删除成功');
        await loadVisualizations();
      }
    } catch (error: any) {
      console.error('删除可视化失败:', error);
      toast.error(error.message || '删除可视化失败');
    }
  };

  const editVisualization = (visualization: any) => {
    setEditingVisualization(visualization.id);
    setSelectedDatabase(visualization.database);
    setSelectedCollection(visualization.collection);
    setChartConfig(visualization.config);
    setPreviewData(visualization.data);
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    setSelectedDatabase('');
    setSelectedCollection('');
    setChartConfig({
      type: 'bar',
      title: '',
      xField: '',
      yField: '',
      aggregation: 'count'
    });
    setPreviewData([]);
    setEditingVisualization(null);
  };

  const renderChart = (config: ChartConfig, data: any[]) => {
    const colors = config.colors || CHART_COLORS;
    
    switch (config.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  if (!currentConnection) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            未选择连接
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            请先在连接管理页面选择一个MongoDB连接
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">数据可视化</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            创建和管理数据图表
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建图表
        </Button>
      </div>

      {/* 可视化列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading.visualizations ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : visualizations.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              暂无可视化
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              创建您的第一个数据图表
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              创建图表
            </Button>
          </div>
        ) : (
          visualizations.map((visualization) => (
            <Card key={visualization.id} className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {visualization.name}
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editVisualization(visualization)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteVisualization(visualization.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {visualization.database}.{visualization.collection}
              </div>
              
              <div className="h-48">
                {renderChart(visualization.config, visualization.data)}
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                创建时间: {new Date(visualization.createdAt).toLocaleDateString()}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 创建/编辑图表对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog} className="max-w-4xl">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingVisualization ? '编辑图表' : '创建新图表'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 左侧配置 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">图表标题</label>
                <Input
                  value={chartConfig.title}
                  onChange={(e) => setChartConfig({ ...chartConfig, title: e.target.value })}
                  placeholder="输入图表标题"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">数据库</label>
                  <select
                    value={selectedDatabase}
                    onChange={(e) => setSelectedDatabase(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">选择数据库</option>
                    {databases.map((db) => (
                      <option key={db.name} value={db.name}>
                        {db.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">集合</label>
                  <select
                    value={selectedCollection}
                    onChange={(e) => setSelectedCollection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={!selectedDatabase}
                  >
                    <option value="">选择集合</option>
                    {collections.map((collection) => (
                      <option key={collection.name} value={collection.name}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">图表类型</label>
                  <select
                    value={chartConfig.type}
                    onChange={(e) => setChartConfig({ ...chartConfig, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="bar">柱状图</option>
                    <option value="line">折线图</option>
                    <option value="pie">饼图</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">聚合方式</label>
                  <select
                    value={chartConfig.aggregation}
                    onChange={(e) => setChartConfig({ ...chartConfig, aggregation: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="count">计数</option>
                    <option value="sum">求和</option>
                    <option value="avg">平均值</option>
                    <option value="min">最小值</option>
                    <option value="max">最大值</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">X轴字段</label>
                  <Input
                    value={chartConfig.xField}
                    onChange={(e) => setChartConfig({ ...chartConfig, xField: e.target.value })}
                    placeholder="字段名称"
                  />
                </div>
                
                {chartConfig.aggregation !== 'count' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Y轴字段</label>
                    <Input
                      value={chartConfig.yField}
                      onChange={(e) => setChartConfig({ ...chartConfig, yField: e.target.value })}
                      placeholder="数值字段名称"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={generateChartData}
                  disabled={loading.chartData}
                  className="flex items-center gap-2"
                >
                  {loading.chartData ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  预览数据
                </Button>
              </div>
            </div>
            
            {/* 右侧预览 */}
            <div>
              <h3 className="text-sm font-medium mb-4">图表预览</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-80">
                {previewData.length > 0 ? (
                  renderChart(chartConfig, previewData)
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                      <p>点击预览数据生成图表</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={saveVisualization}
              disabled={loading.save || !chartConfig.title || previewData.length === 0}
              className="flex-1"
            >
              {loading.save ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editingVisualization ? '更新图表' : '保存图表'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default DataVisualization;
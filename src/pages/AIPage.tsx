import React, { useState, useEffect } from 'react';
import { Bot, Database, BarChart3, MessageSquare, Settings, RefreshCw } from 'lucide-react';
import AIChat from '../components/AIChat';
import SmartQueryBuilder from '../components/SmartQueryBuilder';
import AIAnalysisPanel from '../components/AIAnalysisPanel';
import { useAIStore } from '../stores/aiStore';
import { AIServiceClient } from '../services/aiService';
import { toast } from 'sonner';

interface AIPageProps {
  connections?: any[];
  onQueryExecute?: (query: any, collection: string, connectionId: string) => Promise<any>;
}

type TabType = 'chat' | 'builder' | 'analysis';

const AIPage: React.FC<AIPageProps> = ({ connections = [], onQueryExecute }) => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [collections, setCollections] = useState<string[]>([]);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [aiServiceHealth, setAiServiceHealth] = useState<boolean | null>(null);
  
  const { setContext, clearMessages } = useAIStore();
  const aiService = new AIServiceClient();
  
  useEffect(() => {
    checkAIServiceHealth();
  }, []);
  
  useEffect(() => {
    if (connections.length > 0 && !selectedConnection) {
      setSelectedConnection(connections[0].id);
    }
  }, [connections, selectedConnection]);
  
  useEffect(() => {
    if (selectedConnection) {
      loadCollections();
    }
  }, [selectedConnection]);
  
  const checkAIServiceHealth = async () => {
    try {
      const response = await aiService.checkHealth();
      setAiServiceHealth(response.aiServiceAvailable);
      if (!response.aiServiceAvailable) {
        toast.error('AI服务连接失败，请检查配置');
      }
    } catch (error) {
      setAiServiceHealth(false);
      console.error('AI service health check failed:', error);
    }
  };
  
  const loadCollections = async () => {
    if (!selectedConnection) return;
    
    setIsLoadingCollections(true);
    try {
      // 这里应该调用实际的API来获取集合列表
      // 暂时使用模拟数据
      const mockCollections = ['users', 'products', 'orders', 'reviews', 'categories'];
      setCollections(mockCollections);
      
      // 更新AI上下文
      setContext({
        connectionId: selectedConnection,
        // collections: mockCollections,
        currentCollection: mockCollections[0] || '',
        queryMode: activeTab === 'builder' ? 'builder' : 'chat'
      });
    } catch (error) {
      console.error('Load collections error:', error);
      toast.error('加载集合列表失败');
    } finally {
      setIsLoadingCollections(false);
    }
  };
  
  const handleQueryGenerated = async (query: any, collection?: string) => {
    if (!onQueryExecute || !selectedConnection) {
      toast.error('无法执行查询：缺少连接信息');
      return;
    }
    
    try {
      const targetCollection = collection || collections[0];
      if (!targetCollection) {
        toast.error('请选择目标集合');
        return;
      }
      
      const results = await onQueryExecute(query, targetCollection, selectedConnection);
      setQueryResults(Array.isArray(results) ? results : [results]);
      
      // 切换到分析标签页
      setActiveTab('analysis');
      
      toast.success(`查询执行成功，返回 ${Array.isArray(results) ? results.length : 1} 条结果`);
    } catch (error) {
      console.error('Query execution error:', error);
      toast.error('查询执行失败');
    }
  };
  
  const handleChartCreate = (chartConfig: any) => {
    // 这里可以集成到现有的图表系统
    console.log('Create chart:', chartConfig);
    toast.success('图表创建功能将在后续版本中实现');
  };
  
  const tabs = [
    {
      id: 'chat' as TabType,
      name: 'AI对话',
      icon: MessageSquare,
      description: '通过自然语言与AI对话查询数据'
    },
    {
      id: 'builder' as TabType,
      name: '智能构建器',
      icon: Settings,
      description: '使用AI生成和优化MongoDB查询'
    },
    {
      id: 'analysis' as TabType,
      name: '数据分析',
      icon: BarChart3,
      description: 'AI驱动的数据洞察和图表推荐'
    }
  ];
  
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 页面头部 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                AI数据助手
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                通过人工智能简化数据查询和分析
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* AI服务状态 */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                aiServiceHealth === null
                  ? 'bg-gray-400'
                  : aiServiceHealth
                  ? 'bg-green-500'
                  : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                AI服务: {aiServiceHealth === null ? '检查中' : aiServiceHealth ? '正常' : '异常'}
              </span>
              <button
                onClick={checkAIServiceHealth}
                className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="检查AI服务状态"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            {/* 连接选择 */}
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-500" />
              <select
                value={selectedConnection}
                onChange={(e) => setSelectedConnection(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                disabled={isLoadingCollections}
              >
                <option value="">选择数据库连接</option>
                {connections.map(conn => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name || conn.host}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* 标签页导航 */}
        <div className="mt-6">
          <nav className="flex space-x-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      
      {/* 主要内容区域 */}
      <div className="flex-1 p-6 overflow-hidden">
        {!selectedConnection ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                请选择数据库连接
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                选择一个数据库连接以开始使用AI功能
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {activeTab === 'chat' && (
              <div className="h-full">
                <AIChat
                  className="h-full"
                  onQueryGenerated={(query) => handleQueryGenerated(query)}
                />
              </div>
            )}
            
            {activeTab === 'builder' && (
              <div className="h-full overflow-y-auto">
                <SmartQueryBuilder
                  collections={collections}
                  onQueryExecute={(query, collection) => handleQueryGenerated(query, collection)}
                />
              </div>
            )}
            
            {activeTab === 'analysis' && (
              <div className="h-full overflow-y-auto">
                <AIAnalysisPanel
                  data={queryResults}
                  collection={collections[0]}
                  onChartCreate={handleChartCreate}
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 底部状态栏 */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>当前标签页: {tabs.find(t => t.id === activeTab)?.name}</span>
            {selectedConnection && (
              <span>连接: {connections.find(c => c.id === selectedConnection)?.name || '未知'}</span>
            )}
            {collections.length > 0 && (
              <span>集合数量: {collections.length}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {queryResults.length > 0 && (
              <span>分析数据: {queryResults.length} 条记录</span>
            )}
            <button
              onClick={clearMessages}
              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
            >
              清除对话历史
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPage;
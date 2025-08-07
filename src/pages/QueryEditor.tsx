import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Save, 
  History, 
  Download, 
  Loader2, 
  Database,
  Clock,
  FileText
} from 'lucide-react';
import { Editor } from '@monaco-editor/react';
import { useConnections, useDatabase, useQuery, useTheme, useUI } from '../store/useStore';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Dialog } from '../components/ui/Dialog';
import { toast } from '../components/ui/Toast';
import { cn, formatJSON } from '../lib/utils';

interface QueryResult {
  results: any[];
  executionTime: number;
  totalCount?: number;
  error?: string;
}

const QueryEditor: React.FC = () => {
  const { currentConnection, currentConnectionId, connections } = useConnections();
  const { databases, currentDatabase, setCurrentDatabase } = useDatabase();
  const { queryHistory, addToHistory } = useQuery();
  const { theme } = useTheme();
  const { loading, setLoading } = useUI();
  
  const [selectedDatabase, setSelectedDatabase] = useState(currentDatabase || '');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [operation, setOperation] = useState('find');
  const [query, setQuery] = useState('{}');
  const [options, setOptions] = useState('{ "limit": 20 }');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);

  const currentConn = connections.find(c => c.id === currentConnectionId);

  // 加载数据库列表
  useEffect(() => {
    if (currentConnection && databases.length === 0) {
      loadDatabases();
    }
  }, [currentConnection]);

  // 加载集合列表
  useEffect(() => {
    if (selectedDatabase && currentConnection) {
      loadCollections();
    }
  }, [selectedDatabase, currentConnection]);

  const loadDatabases = async () => {
    if (!currentConnection) return;

    try {
      const response = await api.connections.getDatabases(currentConnectionId);
      if (response.success) {
        // 这里应该更新数据库列表，但由于我们使用的是全局状态，
        // 可能需要在store中添加相应的方法
      }
    } catch (error: any) {
      console.error('加载数据库失败:', error);
      toast.error(error.message || '加载数据库失败');
    }
  };

  const loadCollections = async () => {
    if (!currentConnection || !selectedDatabase) return;

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

  const executeQuery = async () => {
    if (!currentConnection || !selectedDatabase || !selectedCollection) {
      toast.error('请选择连接、数据库和集合');
      return;
    }

    let parsedQuery, parsedOptions;
    try {
      parsedQuery = JSON.parse(query);
      parsedOptions = JSON.parse(options);
    } catch (error) {
      toast.error('查询或选项格式不正确，请检查JSON语法');
      return;
    }

    try {
      setLoading('query', true);
      const startTime = Date.now();
      
      let response;
    if (operation === 'aggregate') {
      // 对于聚合操作，需要将查询转换为管道
      const pipeline = Array.isArray(parsedQuery) ? parsedQuery : [{ $match: parsedQuery }];
      response = await api.query.aggregate(currentConnectionId, {
        database: selectedDatabase,
        collection: selectedCollection,
        operation,
        pipeline
      });
    } else {
      // 对于普通查询操作
      response = await api.query.execute(currentConnectionId, {
        database: selectedDatabase,
        collection: selectedCollection,
        operation,
        query: parsedQuery,
        options: parsedOptions
      });
    }

      const executionTime = Date.now() - startTime;

      if (response.success) {
        const result: QueryResult = {
          results: response.data || [],
          executionTime
        };
        setQueryResult(result);
        
        // 添加到查询历史
        addToHistory({
          id: Date.now().toString(),
          database: selectedDatabase,
          collection: selectedCollection,
          operation,
          query: parsedQuery,
          options: parsedOptions,
          executedAt: new Date(),
          executionTime,
          results: response.data || [],
          createdAt: new Date().toISOString()
        });
        
        toast.success(`查询执行成功，耗时 ${executionTime}ms`);
      } else {
        setQueryResult({
          results: [],
          executionTime,
          error: response.error || '查询执行失败'
        });
        toast.error(response.error || '查询执行失败');
      }
    } catch (error: any) {
      console.error('执行查询失败:', error);
      const executionTime = Date.now() - Date.now();
      setQueryResult({
        results: [],
        executionTime,
        error: error.message || '查询执行失败'
      });
      toast.error(error.message || '查询执行失败');
    } finally {
      setLoading('query', false);
    }
  };

  const loadHistoryQuery = (historyItem: any) => {
    setSelectedDatabase(historyItem.database);
    setSelectedCollection(historyItem.collection);
    setOperation(historyItem.operation);
    setQuery(formatJSON(historyItem.query));
    setOptions(formatJSON(historyItem.options));
    setShowHistory(false);
    toast.success('历史查询已加载');
  };

  const exportResults = () => {
    if (!queryResult || queryResult.results.length === 0) {
      toast.error('没有可导出的结果');
      return;
    }

    const dataStr = JSON.stringify(queryResult.results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `query_results_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('结果已导出');
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
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            查询编辑器
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              历史记录
            </Button>
            <Button
              variant="outline"
              onClick={exportResults}
              disabled={!queryResult || queryResult.results.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出结果
            </Button>
            <Button
              onClick={executeQuery}
              disabled={loading.query || !selectedDatabase || !selectedCollection}
              className="flex items-center gap-2"
            >
              {loading.query ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              执行查询
            </Button>
          </div>
        </div>

        {/* 查询配置 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">数据库</label>
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
            <label className="block text-sm font-medium mb-1">集合</label>
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
          
          <div>
            <label className="block text-sm font-medium mb-1">操作</label>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="find">find</option>
              <option value="aggregate">aggregate</option>
              <option value="count">count</option>
              <option value="distinct">distinct</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-end pb-2">
            连接: {currentConnection?.name}
          </div>
        </div>
      </div>

      {/* 编辑器和结果区域 */}
      <div className="flex-1 flex">
        {/* 左侧编辑器 */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">查询</h3>
            <div className="h-48">
              <Editor
                height="100%"
                defaultLanguage="json"
                value={query}
                onChange={(value) => setQuery(value || '{}')}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollbar: {
                    vertical: 'auto',
                    horizontal: 'auto'
                  }
                }}
              />
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">选项</h3>
            <div className="h-32">
              <Editor
                height="100%"
                defaultLanguage="json"
                value={options}
                onChange={(value) => setOptions(value || '{}')}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on'
                }}
              />
            </div>
          </div>
        </div>

        {/* 右侧结果 */}
        <div className="w-1/2 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">查询结果</h3>
              {queryResult && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {queryResult.error ? (
                    <span className="text-red-600">执行失败</span>
                  ) : (
                    <span>
                      {queryResult.results.length} 条记录，耗时 {queryResult.executionTime}ms
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            {loading.query ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : queryResult ? (
              queryResult.error ? (
                <div className="text-red-600 dark:text-red-400">
                  <h4 className="font-medium mb-2">执行错误:</h4>
                  <pre className="text-sm whitespace-pre-wrap">{queryResult.error}</pre>
                </div>
              ) : queryResult.results.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-4" />
                  <p>查询无结果</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {queryResult.results.map((result, index) => (
                    <Card key={index} className="p-4">
                      <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-auto">
                        {formatJSON(result)}
                      </pre>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Play className="w-12 h-12 mx-auto mb-4" />
                <p>点击执行查询按钮开始查询</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 历史记录对话框 */}
      <Dialog open={showHistory} onOpenChange={setShowHistory} className="max-w-4xl">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">查询历史</h2>
          
          <div className="max-h-96 overflow-auto space-y-2">
            {queryHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-4" />
                <p>暂无查询历史</p>
              </div>
            ) : (
              queryHistory.map((item) => (
                <Card key={item.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => loadHistoryQuery(item)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.database}.{item.collection} - {item.operation}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(item.executedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatJSON(item.query).substring(0, 100)}...
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    耗时: {item.executionTime}ms
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default QueryEditor;
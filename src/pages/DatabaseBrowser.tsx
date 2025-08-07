import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Folder, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Loader2,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { useConnections, useDatabase, useUI } from '../store/useStore';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { toast } from '../components/ui/Toast';
import { cn, formatNumber } from '../lib/utils';

interface DatabaseInfo {
  name: string;
  sizeOnDisk: number;
  empty: boolean;
  collections?: CollectionInfo[];
}

interface CollectionInfo {
  name: string;
  type: string;
  options: any;
  info: {
    readOnly: boolean;
    uuid?: string;
  };
  idIndex: any;
  stats?: {
    count: number;
    size: number;
    avgObjSize: number;
    storageSize: number;
    indexes: number;
  };
}

const DatabaseBrowser: React.FC = () => {
  const { currentConnection, currentConnectionId, connections } = useConnections();
  const { databases, setDatabases, currentDatabase, setCurrentDatabase } = useDatabase();
  const { loading, setLoading } = useUI();
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [collectionData, setCollectionData] = useState<any[]>([]);
  const [collectionStats, setCollectionStats] = useState<any>(null);

  const currentConn = connections.find(c => c.id === currentConnectionId);

  useEffect(() => {
    if (currentConnectionId) {
      loadDatabases();
    }
  }, [currentConnectionId]);

  const loadDatabases = async () => {
    if (!currentConnectionId) {
      toast.error('请先选择一个连接');
      return;
    }

    try {
      setLoading('databases', true);
      const response = await api.connections.getDatabases(currentConnectionId);
      if (response.success) {
        setDatabases(response.data);
      }
    } catch (error: any) {
      console.error('加载数据库失败:', error);
      toast.error(error.message || '加载数据库失败');
    } finally {
      setLoading('databases', false);
    }
  };

  const loadCollections = async (databaseName: string) => {
    if (!currentConnectionId) return;

    try {
      setLoading('collections', true);
      const response = await api.connections.getCollections(currentConnectionId, databaseName);
      if (response.success) {
        const updatedDatabases = databases.map(db => 
          db.name === databaseName 
            ? { ...db, collections: response.data }
            : db
        );
        setDatabases(updatedDatabases);
      }
    } catch (error: any) {
      console.error('加载集合失败:', error);
      toast.error(error.message || '加载集合失败');
    } finally {
      setLoading('collections', false);
    }
  };

  const loadCollectionData = async (databaseName: string, collectionName: string) => {
    if (!currentConnectionId) return;

    try {
      setLoading('collectionData', true);
      
      // 加载集合数据
      const dataResponse = await api.query.execute(currentConnectionId, {
        database: databaseName,
        collection: collectionName,
        operation: 'find',
        query: {},
        options: { limit: 50 }
      });

      // 加载集合统计信息
      const statsResponse = await api.query.getCollectionStats(
        currentConnectionId,
        databaseName,
        collectionName
      );

      if (dataResponse.success) {
        setCollectionData(dataResponse.data || []);
      }

      if (statsResponse.success) {
        setCollectionStats(statsResponse.data);
      }

      setSelectedCollection(collectionName);
      setCurrentDatabase(databaseName);
    } catch (error: any) {
      console.error('加载集合数据失败:', error);
      toast.error(error.message || '加载集合数据失败');
    } finally {
      setLoading('collectionData', false);
    }
  };

  const toggleDatabase = async (databaseName: string) => {
    const newExpanded = new Set(expandedDatabases);
    
    if (expandedDatabases.has(databaseName)) {
      newExpanded.delete(databaseName);
    } else {
      newExpanded.add(databaseName);
      // 如果数据库还没有加载集合，则加载
      const database = databases.find(db => db.name === databaseName);
      if (database && !database.collections) {
        await loadCollections(databaseName);
      }
    }
    
    setExpandedDatabases(newExpanded);
  };

  const filteredDatabases = databases.filter(db => 
    db.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="flex h-full">
      {/* 左侧数据库树 */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              数据库浏览
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadDatabases}
              disabled={loading.databases}
            >
              {loading.databases ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            连接: {currentConnection?.name}
          </div>
          
          <Input
            placeholder="搜索数据库..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
        </div>

        <div className="overflow-auto flex-1">
          {loading.databases ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : filteredDatabases.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              暂无数据库
            </div>
          ) : (
            <div className="p-2">
              {filteredDatabases.map((database) => (
                <div key={database.name} className="mb-2">
                  <button
                    onClick={() => toggleDatabase(database.name)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {expandedDatabases.has(database.name) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <Database className="w-4 h-4 text-blue-600" />
                    <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                      {database.name}
                    </span>
                  </button>
                  
                  {expandedDatabases.has(database.name) && database.collections && (
                    <div className="ml-6 mt-1 space-y-1">
                      {database.collections.map((collection) => (
                        <button
                          key={collection.name}
                          onClick={() => loadCollectionData(database.name, collection.name)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg transition-colors text-sm',
                            selectedCollection === collection.name && currentDatabase === database.name
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                          )}
                        >
                          <FileText className="w-4 h-4" />
                          <span className="flex-1">{collection.name}</span>
                          {collection.stats && (
                            <span className="text-xs text-gray-500">
                              {formatNumber(collection.stats.count)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右侧内容区域 */}
      <div className="flex-1 flex flex-col">
        {selectedCollection ? (
          <>
            {/* 集合信息头部 */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentDatabase}.{selectedCollection}
                  </h3>
                  {collectionStats && (
                    <div className="flex gap-6 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>文档数: {formatNumber(collectionStats.count || 0)}</span>
                      <span>大小: {formatNumber(collectionStats.size || 0)} bytes</span>
                      <span>索引数: {collectionStats.nindexes || 0}</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => loadCollectionData(currentDatabase!, selectedCollection)}
                  disabled={loading.collectionData}
                >
                  {loading.collectionData ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  刷新
                </Button>
              </div>
            </div>

            {/* 集合数据 */}
            <div className="flex-1 overflow-auto p-6">
              {loading.collectionData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : collectionData.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    集合为空
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    该集合中暂无文档数据
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {collectionData.map((doc, index) => (
                    <Card key={index} className="p-4">
                      <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-auto">
                        {JSON.stringify(doc, null, 2)}
                      </pre>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                选择集合
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                从左侧选择一个集合来查看其数据
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseBrowser;
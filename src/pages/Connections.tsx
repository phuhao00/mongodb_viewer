import React, { useState, useEffect } from 'react';
import { Plus, Database, Trash2, TestTube, Loader2 } from 'lucide-react';
import { useConnections, useUI } from '../store/useStore';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Dialog } from '../components/ui/Dialog';
import { toast } from '../components/ui/Toast';

interface ConnectionFormData {
  name: string;
  uri: string;
  options: {
    maxPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    connectTimeoutMS?: number;
  };
}

const Connections: React.FC = () => {
  const { connections, setConnections, addConnection, removeConnection, setCurrentConnection } = useConnections();
  const { loading, setLoading } = useUI();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    uri: 'mongodb://localhost:27017',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    }
  });

  // 加载连接列表
  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading('connections', true);
      const response = await api.connections.getAll();
      if (response.success) {
        setConnections(response.data);
      }
    } catch (error) {
      console.error('加载连接失败:', error);
      toast.error('加载连接失败');
    } finally {
      setLoading('connections', false);
    }
  };

  // 创建连接
  const handleCreateConnection = async () => {
    if (!formData.name.trim() || !formData.uri.trim()) {
      toast.error('请填写连接名称和URI');
      return;
    }

    try {
      setLoading('connections', true);
      const response = await api.connections.create({
        name: formData.name,
        uri: formData.uri,
        options: formData.options
      });

      if (response.success) {
        toast.success('连接创建成功');
        setShowCreateDialog(false);
        setFormData({
          name: '',
          uri: 'mongodb://localhost:27017',
          options: {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000
          }
        });
        await loadConnections();
      }
    } catch (error: any) {
      console.error('创建连接失败:', error);
      toast.error(error.message || '创建连接失败');
    } finally {
      setLoading('connections', false);
    }
  };

  // 测试连接
  const handleTestConnection = async (uri: string, options: any) => {
    try {
      setTestingConnection(uri);
      const response = await api.connections.test({ uri, options });
      
      if (response.success && response.connected) {
        toast.success('连接测试成功');
      } else {
        toast.error('连接测试失败');
      }
    } catch (error: any) {
      console.error('测试连接失败:', error);
      toast.error(error.message || '测试连接失败');
    } finally {
      setTestingConnection(null);
    }
  };

  // 删除连接
  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('确定要删除这个连接吗？')) {
      return;
    }

    try {
      const response = await api.connections.delete(connectionId);
      if (response.success) {
        toast.success('连接删除成功');
        removeConnection(connectionId);
      }
    } catch (error: any) {
      console.error('删除连接失败:', error);
      toast.error(error.message || '删除连接失败');
    }
  };

  // 选择连接
  const handleSelectConnection = (connectionId: string) => {
    setCurrentConnection(connectionId);
    toast.success('连接已选择');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">连接管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            管理您的MongoDB数据库连接
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建连接
        </Button>
      </div>

      {/* 连接列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading.connections ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : connections.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              暂无连接
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              创建您的第一个MongoDB连接开始使用
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              创建连接
            </Button>
          </div>
        ) : (
          connections.map((connection) => (
            <Card key={connection.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {connection.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(connection.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteConnection(connection.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectConnection(connection.id)}
                  className="flex-1"
                >
                  选择连接
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTestConnection(connection.uri || '', {})}
                  disabled={testingConnection === connection.uri}
                >
                  {testingConnection === connection.uri ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 创建连接对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">创建新连接</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">连接名称</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入连接名称"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">连接URI</label>
              <Input
                value={formData.uri}
                onChange={(e) => setFormData({ ...formData, uri: e.target.value })}
                placeholder="mongodb://localhost:27017"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">最大连接池大小</label>
                <Input
                  type="number"
                  value={formData.options.maxPoolSize}
                  onChange={(e) => setFormData({
                    ...formData,
                    options: { ...formData.options, maxPoolSize: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">连接超时(ms)</label>
                <Input
                  type="number"
                  value={formData.options.connectTimeoutMS}
                  onChange={(e) => setFormData({
                    ...formData,
                    options: { ...formData.options, connectTimeoutMS: parseInt(e.target.value) }
                  })}
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={() => handleTestConnection(formData.uri, formData.options)}
              variant="outline"
              disabled={testingConnection === formData.uri}
              className="flex items-center gap-2"
            >
              {testingConnection === formData.uri ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4" />
              )}
              测试连接
            </Button>
            <Button
              onClick={handleCreateConnection}
              disabled={loading.connections}
              className="flex-1"
            >
              {loading.connections ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              创建连接
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default Connections;
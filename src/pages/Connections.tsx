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
  host: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  authDatabase?: string;
  useAuth: boolean;
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

  // 构建MongoDB URI
  const buildMongoURI = (data: ConnectionFormData): string => {
    let uri = 'mongodb://';
    
    if (data.useAuth && data.username && data.password) {
      uri += `${encodeURIComponent(data.username)}:${encodeURIComponent(data.password)}@`;
    }
    
    uri += `${data.host}:${data.port}`;
    
    if (data.database) {
      uri += `/${data.database}`;
    }
    
    const params = [];
    if (data.useAuth && data.authDatabase) {
      params.push(`authSource=${data.authDatabase}`);
    }
    
    if (params.length > 0) {
      uri += `?${params.join('&')}`;
    }
    
    return uri;
  };

  // 重置表单数据
  const resetFormData = () => {
    setFormData({
      name: '',
      host: 'localhost',
      port: 27017,
      database: '',
      username: '',
      password: '',
      authDatabase: 'admin',
      useAuth: false,
      uri: 'mongodb://localhost:27017',
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000
      }
    });
  };
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    host: 'localhost',
    port: 27017,
    database: '',
    username: '',
    password: '',
    authDatabase: 'admin',
    useAuth: false,
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
    if (!formData.name.trim() || !formData.host.trim()) {
      toast.error('请填写连接名称和主机地址');
      return;
    }

    if (formData.useAuth && (!formData.username || !formData.password)) {
      toast.error('启用认证时，用户名和密码不能为空');
      return;
    }

    try {
      setLoading('connections', true);
      const uri = buildMongoURI(formData);
      const response = await api.connections.create({
        name: formData.name,
        uri: uri,
        options: formData.options
      });

      if (response.success) {
        toast.success('连接创建成功');
        setShowCreateDialog(false);
        resetFormData();
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
        if (response.canListDatabases) {
          toast.success(response.message || '连接测试成功，可以访问数据库列表');
        } else {
          // 检查是否为无密码连接
          const isPasswordless = !formData.useAuth;
          if (isPasswordless) {
             toast.success(response.message || '无密码连接成功！某些功能可能受限，如需完整功能请配置认证信息。');
          } else {
            toast.warning(response.message || '连接成功，但认证配置可能有问题');
          }
        }
      } else {
        const errorMessage = response.error || response.message || '连接测试失败';
        toast.error(errorMessage);
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
        <div className="p-6 max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">创建新连接</h2>
            <div className="text-sm text-gray-500">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                支持MongoDB 3.6+
              </span>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 text-blue-600 mt-0.5">
                💡
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">连接提示：</p>
                <ul className="space-y-1 text-xs">
                  <li>• 对于本地MongoDB：通常使用 localhost:27017</li>
                  <li>• 对于MongoDB Atlas：从集群页面复制连接字符串</li>
                  <li>• 启用认证时，确保用户具有相应的数据库权限</li>
                  <li>• 认证数据库通常是 'admin' 或用户所属的数据库</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">连接名称</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入连接名称"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">主机地址</label>
                <Input
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="localhost"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">端口</label>
                <Input
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 27017 })}
                  placeholder="27017"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">数据库名称（可选）</label>
              <Input
                value={formData.database}
                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                placeholder="留空连接到默认数据库"
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useAuth"
                    checked={formData.useAuth}
                    onChange={(e) => setFormData({ ...formData, useAuth: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="useAuth" className="text-sm font-medium">
                    启用身份认证
                  </label>
                </div>
                <div className="text-xs text-gray-500">
                  {formData.useAuth ? '🔒 安全连接' : '🔓 无认证连接'}
                </div>
              </div>
              
              {!formData.useAuth && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 text-yellow-600 mt-0.5">
                      ⚠️
                    </div>
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <p className="font-medium mb-1">无认证连接</p>
                      <p className="text-xs">仅适用于开发环境或未启用认证的MongoDB实例。生产环境建议启用认证。</p>
                    </div>
                  </div>
                </div>
              )}

              {formData.useAuth && (
                 <div className="space-y-4 pl-6 border-l-2 border-blue-100">
                   <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                     <div className="flex items-start gap-2">
                       <div className="w-4 h-4 text-green-600 mt-0.5">
                         🔐
                       </div>
                       <div className="text-sm text-green-800 dark:text-green-200">
                         <p className="font-medium mb-1">认证配置</p>
                         <p className="text-xs">请输入具有数据库访问权限的用户凭据。认证数据库是存储用户凭据的数据库。</p>
                       </div>
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium mb-2">
                         用户名 <span className="text-red-500">*</span>
                       </label>
                       <Input
                         value={formData.username}
                         onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                         placeholder="输入用户名"
                         className={!formData.username && formData.useAuth ? 'border-red-300' : ''}
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-2">
                         密码 <span className="text-red-500">*</span>
                       </label>
                       <Input
                         type="password"
                         value={formData.password}
                         onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                         placeholder="输入密码"
                         className={!formData.password && formData.useAuth ? 'border-red-300' : ''}
                       />
                     </div>
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-2">
                       认证数据库
                       <span className="text-xs text-gray-500 ml-2">(默认: admin)</span>
                     </label>
                     <Input
                       value={formData.authDatabase}
                       onChange={(e) => setFormData({ ...formData, authDatabase: e.target.value })}
                       placeholder="admin"
                     />
                     <p className="text-xs text-gray-500 mt-1">
                       通常是 'admin'，或者是创建用户时指定的数据库
                     </p>
                   </div>
                 </div>
               )}
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3">高级选项</h3>
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

            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">生成的连接URI:</label>
              <code className="text-xs text-gray-800 dark:text-gray-200 break-all">
                {buildMongoURI(formData)}
              </code>
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
              onClick={() => {
                const uri = buildMongoURI(formData);
                handleTestConnection(uri, formData.options);
              }}
              variant="outline"
              disabled={testingConnection !== null}
              className="flex items-center gap-2"
            >
              {testingConnection !== null ? (
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
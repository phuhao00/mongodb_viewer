import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, Settings } from 'lucide-react';

interface SystemStatusData {
  aiConfigured: boolean;
  aiAvailable: boolean;
  availableFeatures: string[];
  missingFeatures: string[];
  configuration: {
    model: string;
    maxTokens: number;
    temperature: number;
    cachingEnabled: boolean;
    queryValidationEnabled: boolean;
  };
  message: string;
}

interface SystemStatusProps {
  className?: string;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        setError(null);
      } else {
        setError(data.error || '获取系统状态失败');
      }
    } catch (err) {
      setError('无法连接到服务器');
      console.error('获取系统状态错误:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">检查系统状态...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
        <button
          onClick={fetchSystemStatus}
          className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
        >
          重试
        </button>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>系统状态</span>
          </h3>
          <button
            onClick={fetchSystemStatus}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            刷新
          </button>
        </div>

        {/* 状态消息 */}
        <div className={`flex items-start space-x-2 p-3 rounded-md mb-4 ${
          status.aiAvailable 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          {status.aiAvailable ? (
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
          ) : (
            <Info className="h-4 w-4 text-yellow-500 mt-0.5" />
          )}
          <div>
            <p className={`text-sm font-medium ${
              status.aiAvailable ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {status.message}
            </p>
            {!status.aiConfigured && (
              <p className="text-xs text-yellow-700 mt-1">
                在 .env 文件中设置 OPENAI_API_KEY 以启用AI功能
              </p>
            )}
          </div>
        </div>

        {/* 可用功能 */}
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-700 mb-2">可用功能</h4>
          <div className="space-y-1">
            {status.availableFeatures.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-xs text-gray-600">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 缺失功能 */}
        {status.missingFeatures.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-700 mb-2">需要配置的功能</h4>
            <div className="space-y-1">
              {status.missingFeatures.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-gray-500">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 配置信息 */}
        <div className="border-t pt-3">
          <h4 className="text-xs font-medium text-gray-700 mb-2">配置信息</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">AI模型:</span>
              <span className="ml-1 text-gray-700">{status.configuration.model}</span>
            </div>
            <div>
              <span className="text-gray-500">缓存:</span>
              <span className={`ml-1 ${
                status.configuration.cachingEnabled ? 'text-green-600' : 'text-gray-500'
              }`}>
                {status.configuration.cachingEnabled ? '已启用' : '已禁用'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">最大令牌:</span>
              <span className="ml-1 text-gray-700">{status.configuration.maxTokens}</span>
            </div>
            <div>
              <span className="text-gray-500">查询验证:</span>
              <span className={`ml-1 ${
                status.configuration.queryValidationEnabled ? 'text-green-600' : 'text-gray-500'
              }`}>
                {status.configuration.queryValidationEnabled ? '已启用' : '已禁用'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;
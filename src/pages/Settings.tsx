import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Monitor, 
  Database,
  Palette,
  Globe,
  Bell,
  Shield,
  Info
} from 'lucide-react';
import { useTheme, useSettings } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { toast } from '../components/ui/Toast';
import { cn } from '../lib/utils';

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSaveSettings = () => {
    updateSettings(localSettings);
    toast.success('设置已保存');
  };

  const handleResetSettings = () => {
    const defaultSettings = {
      language: 'zh-CN',
      autoRefresh: true,
      refreshInterval: 30,
      maxQueryResults: 100,
      enableNotifications: true,
      defaultPageSize: 20,
      connectionTimeout: 10000,
      queryTimeout: 30000
    };
    setLocalSettings(defaultSettings);
    updateSettings(defaultSettings);
    toast.success('设置已重置为默认值');
  };

  const themeOptions = [
    { value: 'light', label: '浅色模式', icon: Sun },
    { value: 'dark', label: '深色模式', icon: Moon },
    { value: 'system', label: '跟随系统', icon: Monitor }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">设置</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          配置应用程序的外观和行为
        </p>
      </div>

      <div className="space-y-6">
        {/* 外观设置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  外观设置
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  自定义应用程序的外观和主题
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  主题模式
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value as any)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                          theme === option.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        <Icon className={cn(
                          'w-6 h-6',
                          theme === option.value
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400'
                        )} />
                        <span className={cn(
                          'text-sm font-medium',
                          theme === option.value
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300'
                        )}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 数据库设置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Database className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  数据库设置
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  配置数据库连接和查询相关设置
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  默认页面大小
                </label>
                <Input
                  type="number"
                  value={localSettings.defaultPageSize}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    defaultPageSize: parseInt(e.target.value) || 20
                  })}
                  min="1"
                  max="1000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  最大查询结果数
                </label>
                <Input
                  type="number"
                  value={localSettings.maxQueryResults}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    maxQueryResults: parseInt(e.target.value) || 100
                  })}
                  min="1"
                  max="10000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  连接超时时间 (毫秒)
                </label>
                <Input
                  type="number"
                  value={localSettings.connectionTimeout}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    connectionTimeout: parseInt(e.target.value) || 10000
                  })}
                  min="1000"
                  max="60000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  查询超时时间 (毫秒)
                </label>
                <Input
                  type="number"
                  value={localSettings.queryTimeout}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    queryTimeout: parseInt(e.target.value) || 30000
                  })}
                  min="1000"
                  max="300000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 通用设置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  通用设置
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  语言、通知和其他通用配置
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    语言
                  </label>
                  <select
                    value={localSettings.language}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      language: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    自动刷新间隔 (秒)
                  </label>
                  <Input
                    type="number"
                    value={localSettings.refreshInterval}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      refreshInterval: parseInt(e.target.value) || 30
                    })}
                    min="5"
                    max="300"
                    disabled={!localSettings.autoRefresh}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      启用自动刷新
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      自动刷新数据库连接状态和数据
                    </p>
                  </div>
                  <button
                    onClick={() => setLocalSettings({
                      ...localSettings,
                      autoRefresh: !localSettings.autoRefresh
                    })}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      localSettings.autoRefresh
                        ? 'bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        localSettings.autoRefresh ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      启用通知
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      显示操作成功和错误通知
                    </p>
                  </div>
                  <button
                    onClick={() => setLocalSettings({
                      ...localSettings,
                      enableNotifications: !localSettings.enableNotifications
                    })}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      localSettings.enableNotifications
                        ? 'bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        localSettings.enableNotifications ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 关于信息 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <Info className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  关于
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  应用程序信息和版本
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">应用名称:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">MongoDB View</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">版本:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">构建时间:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">技术栈:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  React + TypeScript + MongoDB
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <Button
            onClick={handleSaveSettings}
            className="flex-1"
          >
            保存设置
          </Button>
          <Button
            variant="outline"
            onClick={handleResetSettings}
            className="flex-1"
          >
            重置为默认
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
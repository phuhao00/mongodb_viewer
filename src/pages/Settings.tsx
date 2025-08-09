import React, { useState, useEffect } from 'react';
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
  Info,
  Brain,
  Key,
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useTheme, useSettings } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { toast } from '../components/ui/Toast';
import { cn } from '../lib/utils';
import { api } from '../services/api';

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  
  // AI配置状态
  const [aiConfig, setAiConfig] = useState({
    currentProvider: 'openai',
    providers: {
      openai: {
        model: 'gpt-3.5-turbo',
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000,
        baseURL: 'https://api.openai.com/v1',
        hasApiKey: false,
        organization: ''
      },
      zhipu: {
        model: 'glm-4',
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000,
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        hasApiKey: false
      },
      qwen: {
        model: 'qwen-turbo',
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000,
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        hasApiKey: false
      },
      kimi: {
        model: 'moonshot-v1-8k',
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000,
        baseURL: 'https://api.moonshot.cn/v1',
        hasApiKey: false
      },
      deepseek: {
        model: 'deepseek-chat',
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000,
        baseURL: 'https://api.deepseek.com/v1',
        hasApiKey: false
      }
    },
    features: {
      chatEnabled: true,
      queryGenerationEnabled: true,
      dataAnalysisEnabled: true,
      conversationHistoryEnabled: true,
      cachingEnabled: true
    },
    security: {
      maxQueryComplexity: 5,
      maxResultSize: 1000,
      rateLimitPerHour: 50,
      enableQueryValidation: true
    },
    performance: {
      maxConcurrentRequests: 10,
      requestTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    availableProviders: []
  });
  
  const [aiStatus, setAiStatus] = useState({
    aiConfigured: false,
    aiAvailable: false,
    currentProvider: 'openai',
    providerName: 'OpenAI',
    availableFeatures: [],
    missingFeatures: [],
    message: ''
  });
  
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSavingAiConfig, setIsSavingAiConfig] = useState(false);
  const [tempApiKeys, setTempApiKeys] = useState<{[key: string]: string}>({});

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

  // 加载AI配置
  const loadAiConfig = async () => {
    try {
      const [configResponse, statusResponse] = await Promise.all([
        api.ai.getConfig(),
        api.ai.getStatus()
      ]);

      if (configResponse.success) {
        setAiConfig(configResponse.data);
        
        // 初始化临时API密钥
        const tempKeys: {[key: string]: string} = {};
        Object.keys(configResponse.data.providers).forEach(provider => {
          tempKeys[provider] = configResponse.data.providers[provider].hasApiKey ? '••••••••••••••••' : '';
        });
        setTempApiKeys(tempKeys);
      }

      if (statusResponse.success) {
        setAiStatus(statusResponse.data);
      }
    } catch (error) {
      console.error('加载AI配置失败:', error);
      toast.error('加载AI配置失败');
    }
  };

  // 测试AI连接
  const handleTestAiConnection = async (provider?: string) => {
    const targetProvider = provider || aiConfig.currentProvider;
    const apiKey = tempApiKeys[targetProvider];
    
    if (!apiKey || apiKey.includes('•')) {
      toast.error('请输入有效的API密钥');
      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await api.ai.testConnection({ 
        provider: targetProvider,
        apiKey 
      });
      if (response.success) {
        toast.success(`${response.providerName} API密钥验证成功`);
      } else {
        toast.error(response.message || 'API密钥验证失败');
      }
    } catch (error) {
      console.error('测试AI连接失败:', error);
      toast.error(error instanceof Error ? error.message : '测试连接失败');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // 保存AI配置
  const handleSaveAiConfig = async () => {
    setIsSavingAiConfig(true);
    try {
      const updateData: any = {
        currentProvider: aiConfig.currentProvider,
        features: aiConfig.features,
        security: aiConfig.security,
        performance: aiConfig.performance,
        providers: {}
      };

      // 更新所有提供商的配置
      Object.keys(aiConfig.providers).forEach(provider => {
        const providerConfig = aiConfig.providers[provider];
        updateData.providers[provider] = {
          model: providerConfig.model,
          maxTokens: providerConfig.maxTokens,
          temperature: providerConfig.temperature,
          timeout: providerConfig.timeout,
          baseURL: providerConfig.baseURL
        };

        // 如果是OpenAI，添加组织ID
        if (provider === 'openai' && providerConfig.organization) {
          updateData.providers[provider].organization = providerConfig.organization;
        }

        // 只有在API密钥发生变化时才更新
        const tempKey = tempApiKeys[provider];
        if (tempKey && !tempKey.includes('•')) {
          updateData.providers[provider].apiKey = tempKey;
        }
      });

      const response = await api.ai.updateConfig(updateData);
      if (response.success) {
        if (response.warning) {
          toast.warning(response.message || 'AI配置已保存，但API密钥验证失败');
        } else {
          toast.success('AI配置保存成功');
        }
        await loadAiConfig(); // 重新加载配置
      } else {
        toast.error(response.message || 'AI配置保存失败');
      }
    } catch (error) {
      console.error('保存AI配置失败:', error);
      toast.error(error instanceof Error ? error.message : '保存AI配置失败');
    } finally {
      setIsSavingAiConfig(false);
    }
  };

  // 组件挂载时加载AI配置
  useEffect(() => {
    loadAiConfig();
  }, []);

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
                  <Select
                     value={localSettings.language}
                     onChange={(value) => setLocalSettings({
                       ...localSettings,
                       language: value
                     })}
                     options={[
                       { value: 'zh-CN', label: '简体中文' },
                       { value: 'en-US', label: 'English' }
                     ]}
                   />
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

        {/* AI助手配置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  AI助手配置
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  配置AI提供商API密钥和功能设置
                </p>
              </div>
              <div className="flex items-center gap-2">
                {aiStatus.aiAvailable ? (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs">已配置 ({aiStatus.providerName})</span>
                  </div>
                ) : aiStatus.aiConfigured ? (
                  <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs">需要验证</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs">未配置</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* AI提供商选择 */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  AI提供商选择
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {aiConfig.availableProviders.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setAiConfig({
                        ...aiConfig,
                        currentProvider: provider.id
                      })}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                        aiConfig.currentProvider === provider.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <span className={cn(
                        'text-sm font-medium',
                        aiConfig.currentProvider === provider.id
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300'
                      )}>
                        {provider.name}
                      </span>
                      {aiConfig.providers[provider.id]?.hasApiKey && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 当前提供商配置 */}
              {aiConfig.currentProvider && aiConfig.providers[aiConfig.currentProvider] && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {aiConfig.availableProviders.find(p => p.id === aiConfig.currentProvider)?.name} 配置
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        API密钥
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          value={tempApiKeys[aiConfig.currentProvider] || ''}
                          onChange={(e) => setTempApiKeys({
                            ...tempApiKeys,
                            [aiConfig.currentProvider]: e.target.value
                          })}
                          placeholder={`输入您的${aiConfig.availableProviders.find(p => p.id === aiConfig.currentProvider)?.name} API密钥`}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => handleTestAiConnection(aiConfig.currentProvider)}
                          disabled={isTestingConnection || !tempApiKeys[aiConfig.currentProvider] || tempApiKeys[aiConfig.currentProvider]?.includes('•')}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <TestTube className="w-4 h-4" />
                          {isTestingConnection ? '测试中...' : '测试'}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        请输入您的API密钥以启用AI功能
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        模型
                      </label>
                      <Select
                         value={aiConfig.providers[aiConfig.currentProvider].model}
                         onChange={(value) => setAiConfig({
                           ...aiConfig,
                           providers: {
                             ...aiConfig.providers,
                             [aiConfig.currentProvider]: {
                               ...aiConfig.providers[aiConfig.currentProvider],
                               model: value
                             }
                           }
                         })}
                         options={aiConfig.availableProviders.find(p => p.id === aiConfig.currentProvider)?.models.map(model => ({
                           value: model,
                           label: model
                         })) || []}
                       />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        最大Token数
                      </label>
                      <Input
                        type="number"
                        value={aiConfig.providers[aiConfig.currentProvider].maxTokens}
                        onChange={(e) => setAiConfig({
                          ...aiConfig,
                          providers: {
                            ...aiConfig.providers,
                            [aiConfig.currentProvider]: {
                              ...aiConfig.providers[aiConfig.currentProvider],
                              maxTokens: parseInt(e.target.value) || 2000
                            }
                          }
                        })}
                        min="100"
                        max="8000"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        温度 (0-1)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        value={aiConfig.providers[aiConfig.currentProvider].temperature}
                        onChange={(e) => setAiConfig({
                          ...aiConfig,
                          providers: {
                            ...aiConfig.providers,
                            [aiConfig.currentProvider]: {
                              ...aiConfig.providers[aiConfig.currentProvider],
                              temperature: parseFloat(e.target.value) || 0.7
                            }
                          }
                        })}
                        min="0"
                        max="1"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        超时时间 (毫秒)
                      </label>
                      <Input
                        type="number"
                        value={aiConfig.providers[aiConfig.currentProvider].timeout}
                        onChange={(e) => setAiConfig({
                          ...aiConfig,
                          providers: {
                            ...aiConfig.providers,
                            [aiConfig.currentProvider]: {
                              ...aiConfig.providers[aiConfig.currentProvider],
                              timeout: parseInt(e.target.value) || 30000
                            }
                          }
                        })}
                        min="5000"
                        max="120000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Base URL
                      </label>
                      <Input
                        type="text"
                        value={aiConfig.providers[aiConfig.currentProvider].baseURL}
                        onChange={(e) => setAiConfig({
                          ...aiConfig,
                          providers: {
                            ...aiConfig.providers,
                            [aiConfig.currentProvider]: {
                              ...aiConfig.providers[aiConfig.currentProvider],
                              baseURL: e.target.value
                            }
                          }
                        })}
                        placeholder="API基础URL"
                      />
                    </div>

                    {/* OpenAI特有的组织ID字段 */}
                    {aiConfig.currentProvider === 'openai' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          组织ID (可选)
                        </label>
                        <Input
                          type="text"
                          value={aiConfig.providers.openai.organization || ''}
                          onChange={(e) => setAiConfig({
                            ...aiConfig,
                            providers: {
                              ...aiConfig.providers,
                              openai: {
                                ...aiConfig.providers.openai,
                                organization: e.target.value
                              }
                            }
                          })}
                          placeholder="OpenAI组织ID"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 功能开关 */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  功能开关
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        AI聊天
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        启用AI聊天功能
                      </p>
                    </div>
                    <button
                      onClick={() => setAiConfig({
                        ...aiConfig,
                        features: { ...aiConfig.features, chatEnabled: !aiConfig.features.chatEnabled }
                      })}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        aiConfig.features.chatEnabled
                          ? 'bg-blue-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          aiConfig.features.chatEnabled ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        查询生成
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        AI辅助生成MongoDB查询
                      </p>
                    </div>
                    <button
                      onClick={() => setAiConfig({
                        ...aiConfig,
                        features: { ...aiConfig.features, queryGenerationEnabled: !aiConfig.features.queryGenerationEnabled }
                      })}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        aiConfig.features.queryGenerationEnabled
                          ? 'bg-blue-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          aiConfig.features.queryGenerationEnabled ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        数据分析
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        AI数据分析和洞察
                      </p>
                    </div>
                    <button
                      onClick={() => setAiConfig({
                        ...aiConfig,
                        features: { ...aiConfig.features, dataAnalysisEnabled: !aiConfig.features.dataAnalysisEnabled }
                      })}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        aiConfig.features.dataAnalysisEnabled
                          ? 'bg-blue-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          aiConfig.features.dataAnalysisEnabled ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        对话历史
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        保存AI对话历史
                      </p>
                    </div>
                    <button
                      onClick={() => setAiConfig({
                        ...aiConfig,
                        features: { ...aiConfig.features, conversationHistoryEnabled: !aiConfig.features.conversationHistoryEnabled }
                      })}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        aiConfig.features.conversationHistoryEnabled
                          ? 'bg-blue-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          aiConfig.features.conversationHistoryEnabled ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* 安全设置 */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  安全设置
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      最大查询复杂度
                    </label>
                    <Input
                      type="number"
                      value={aiConfig.security.maxQueryComplexity}
                      onChange={(e) => setAiConfig({
                        ...aiConfig,
                        security: { ...aiConfig.security, maxQueryComplexity: parseInt(e.target.value) || 5 }
                      })}
                      min="1"
                      max="10"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      最大结果大小
                    </label>
                    <Input
                      type="number"
                      value={aiConfig.security.maxResultSize}
                      onChange={(e) => setAiConfig({
                        ...aiConfig,
                        security: { ...aiConfig.security, maxResultSize: parseInt(e.target.value) || 1000 }
                      })}
                      min="100"
                      max="10000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      每小时请求限制
                    </label>
                    <Input
                      type="number"
                      value={aiConfig.security.rateLimitPerHour}
                      onChange={(e) => setAiConfig({
                        ...aiConfig,
                        security: { ...aiConfig.security, rateLimitPerHour: parseInt(e.target.value) || 50 }
                      })}
                      min="10"
                      max="1000"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        查询验证
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        启用查询安全验证
                      </p>
                    </div>
                    <button
                      onClick={() => setAiConfig({
                        ...aiConfig,
                        security: { ...aiConfig.security, enableQueryValidation: !aiConfig.security.enableQueryValidation }
                      })}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        aiConfig.security.enableQueryValidation
                          ? 'bg-blue-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          aiConfig.security.enableQueryValidation ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* AI状态信息 */}
              {aiStatus.message && (
                <div className={cn(
                  'p-3 rounded-lg border',
                  aiStatus.aiAvailable
                    ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400'
                )}>
                  <p className="text-sm">{aiStatus.message}</p>
                  {aiStatus.availableFeatures.length > 0 && (
                    <p className="text-xs mt-1">
                      可用功能: {aiStatus.availableFeatures.join(', ')}
                    </p>
                  )}
                  {aiStatus.missingFeatures.length > 0 && (
                    <p className="text-xs mt-1">
                      缺失功能: {aiStatus.missingFeatures.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* AI配置保存按钮 */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveAiConfig}
                  disabled={isSavingAiConfig}
                  className="flex items-center gap-2"
                >
                  {isSavingAiConfig ? '保存中...' : '保存AI配置'}
                </Button>
                <Button
                  onClick={loadAiConfig}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  重新加载
                </Button>
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
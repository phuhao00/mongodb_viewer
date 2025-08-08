import React, { useEffect, useRef } from 'react';
import { Send, Bot, User, Copy, Play, Loader2, AlertCircle } from 'lucide-react';
import { useAIStore } from '../stores/aiStore';
import { Message } from '../types/ai';
import { toast } from 'sonner';

interface AIChatProps {
  className?: string;
  onQueryGenerated?: (query: any) => void;
}

const AIChat: React.FC<AIChatProps> = ({ className = '', onQueryGenerated }) => {
  const {
    messages,
    inputValue,
    isLoading,
    error,
    setInputValue,
    sendMessage,
    clearError,
  } = useAIStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // 聚焦输入框
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);
  
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    await sendMessage(inputValue);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('已复制到剪贴板');
    } catch (error) {
      toast.error('复制失败');
    }
  };
  
  const executeQuery = (query: any) => {
    if (onQueryGenerated) {
      onQueryGenerated(query);
      toast.success('查询已应用到查询编辑器');
    }
  };
  
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    return (
      <div
        key={message.id}
        className={`flex gap-3 p-4 ${
          isUser ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800/50'
        }`}
      >
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isUser ? '您' : 'AI助手'}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(message.createdAt).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
              {message.content}
            </p>
          </div>
          
          {/* 查询数据展示 */}
          {message.queryData && (
            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  生成的查询
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(message.queryData?.query, null, 2))}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    title="复制查询"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {onQueryGenerated && (
                    <button
                      onClick={() => executeQuery(message.queryData?.query)}
                      className="p-1 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
                      title="执行查询"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <pre className="text-xs bg-gray-200 dark:bg-gray-600 p-2 rounded overflow-x-auto">
                <code>{JSON.stringify(message.queryData.query, null, 2)}</code>
              </pre>
              {message.queryData.collection && (
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  集合: {message.queryData.collection}
                  {message.queryData.executionTime && (
                    <span className="ml-2">执行时间: {message.queryData.executionTime}ms</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">{error.message}</span>
            <button
              onClick={clearError}
              className="ml-auto text-red-500 hover:text-red-700 dark:hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              AI数据库助手
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              我可以帮您用自然语言查询MongoDB数据库、生成统计分析和创建可视化图表。
              请告诉我您想要查询什么数据。
            </p>
            <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-md">
              <button
                onClick={() => setInputValue('显示所有用户数据')}
                className="p-3 text-left bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="font-medium text-sm">显示所有用户数据</div>
                <div className="text-xs text-gray-500">查看用户集合中的所有文档</div>
              </button>
              <button
                onClick={() => setInputValue('统计每个城市的用户数量')}
                className="p-3 text-left bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="font-medium text-sm">统计每个城市的用户数量</div>
                <div className="text-xs text-gray-500">按城市分组统计用户分布</div>
              </button>
              <button
                onClick={() => setInputValue('查找最近一周的订单')}
                className="p-3 text-left bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="font-medium text-sm">查找最近一周的订单</div>
                <div className="text-xs text-gray-500">按时间范围筛选订单数据</div>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {messages.map(renderMessage)}
            {isLoading && (
              <div className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-800/50">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      AI助手
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">正在思考...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* 输入区域 */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题或查询需求..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 self-end"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          按 Enter 发送，Shift + Enter 换行
        </div>
      </div>
    </div>
  );
};

export default AIChat;
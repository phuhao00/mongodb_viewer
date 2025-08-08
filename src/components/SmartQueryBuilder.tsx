import React, { useState, useEffect } from 'react';
import { Wand2, Play, Copy, Save, History, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAIStore } from '../stores/aiStore';
import { AIServiceClient } from '../services/aiService';
import { toast } from 'sonner';

interface SmartQueryBuilderProps {
  onQueryExecute?: (query: any, collection: string) => void;
  initialQuery?: string;
  collections?: string[];
}

interface QuerySuggestion {
  id: string;
  description: string;
  query: any;
  collection: string;
  confidence: number;
}

const SmartQueryBuilder: React.FC<SmartQueryBuilderProps> = ({
  onQueryExecute,
  initialQuery = '',
  collections = []
}) => {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [generatedQuery, setGeneratedQuery] = useState(initialQuery);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);
  const [queryHistory, setQueryHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  
  const { setContext } = useAIStore();
  const aiService = new AIServiceClient();
  
  useEffect(() => {
    if (collections.length > 0 && !selectedCollection) {
      setSelectedCollection(collections[0]);
    }
  }, [collections, selectedCollection]);
  
  useEffect(() => {
    // 设置AI上下文
    setContext({
      collections,
      currentCollection: selectedCollection,
      queryMode: 'builder'
    });
  }, [collections, selectedCollection, setContext]);
  
  const generateQuery = async () => {
    if (!naturalLanguageInput.trim() || !selectedCollection) {
      toast.error('请输入查询描述并选择集合');
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await aiService.generateQuery({
         description: naturalLanguageInput,
         collection: selectedCollection
       });
      
      if (response.success && response.query) {
        setGeneratedQuery(JSON.stringify(response.query, null, 2));
        validateQuery(response.query);
        
        // 添加到历史记录
        const historyItem = {
          id: Date.now().toString(),
          naturalLanguage: naturalLanguageInput,
          query: response.query,
          collection: selectedCollection,
          timestamp: new Date().toISOString()
        };
        setQueryHistory(prev => [historyItem, ...prev.slice(0, 9)]); // 保留最近10条
        
        toast.success('查询生成成功');
      } else {
        toast.error(response.error?.message || '查询生成失败');
      }
    } catch (error: any) {
      console.error('Generate query error:', error);
      toast.error('查询生成失败');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const validateQuery = (query: any) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // 基本JSON验证
      if (typeof query !== 'object') {
        errors.push('查询必须是有效的JSON对象');
      }
      
      // 检查危险操作
      const queryStr = JSON.stringify(query);
      if (queryStr.includes('$where')) {
        errors.push('不允许使用 $where 操作符');
      }
      
      if (queryStr.includes('eval')) {
        errors.push('不允许使用 eval 函数');
      }
      
      // 性能警告
      if (!query._id && Object.keys(query).length === 0) {
        warnings.push('空查询可能返回大量数据，建议添加筛选条件');
      }
      
      if (queryStr.includes('$regex') && !queryStr.includes('$options')) {
        warnings.push('正则表达式查询建议添加索引或限制结果数量');
      }
      
      setValidationResult({
        isValid: errors.length === 0,
        errors,
        warnings
      });
    } catch (error: any) {
      setValidationResult({
        isValid: false,
        errors: ['查询格式无效'],
        warnings: []
      });
    }
  };
  
  const executeQuery = () => {
    if (!generatedQuery.trim() || !selectedCollection) {
      toast.error('请生成查询并选择集合');
      return;
    }
    
    try {
      const query = JSON.parse(generatedQuery);
      if (onQueryExecute) {
        onQueryExecute(query, selectedCollection);
        toast.success('查询已执行');
      }
    } catch (error: any) {
      toast.error('查询格式无效，请检查JSON语法');
    }
  };
  
  const copyQuery = async () => {
    try {
      await navigator.clipboard.writeText(generatedQuery);
      toast.success('查询已复制到剪贴板');
    } catch (error: any) {
      toast.error('复制失败');
    }
  };
  
  const loadHistoryItem = (item: any) => {
    setNaturalLanguageInput(item.naturalLanguage);
    setGeneratedQuery(JSON.stringify(item.query, null, 2));
    setSelectedCollection(item.collection);
    validateQuery(item.query);
    setShowHistory(false);
  };
  
  const getSampleQueries = () => {
    return [
      {
        description: '查找所有活跃用户',
        input: '查找状态为活跃的所有用户'
      },
      {
        description: '统计每个分类的产品数量',
        input: '按产品分类统计数量，并按数量降序排列'
      },
      {
        description: '查找最近30天的订单',
        input: '查找创建时间在最近30天内的订单'
      },
      {
        description: '查找价格在100-500之间的产品',
        input: '查找价格在100到500之间的产品，按价格升序排列'
      }
    ];
  };
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Wand2 className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          智能查询构建器
        </h3>
      </div>
      
      {/* 集合选择 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          目标集合
        </label>
        <select
          value={selectedCollection}
          onChange={(e) => setSelectedCollection(e.target.value)}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">选择集合</option>
          {collections.map(collection => (
            <option key={collection} value={collection}>{collection}</option>
          ))}
        </select>
      </div>
      
      {/* 自然语言输入 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          描述您的查询需求
        </label>
        <div className="relative">
          <textarea
            value={naturalLanguageInput}
            onChange={(e) => setNaturalLanguageInput(e.target.value)}
            placeholder="例如：查找年龄大于25岁的所有用户，按注册时间降序排列"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
            rows={3}
          />
          <button
            onClick={generateQuery}
            disabled={isGenerating || !naturalLanguageInput.trim() || !selectedCollection}
            className="absolute bottom-2 right-2 px-3 py-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
          >
            {isGenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Wand2 className="w-3 h-3" />
            )}
            生成
          </button>
        </div>
      </div>
      
      {/* 示例查询 */}
      {!naturalLanguageInput && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            示例查询
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {getSampleQueries().map((sample, index) => (
              <button
                key={index}
                onClick={() => setNaturalLanguageInput(sample.input)}
                className="p-2 text-left bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {sample.description}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {sample.input}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* 生成的查询 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            生成的MongoDB查询
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="查询历史"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={copyQuery}
              disabled={!generatedQuery}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
              title="复制查询"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <textarea
          value={generatedQuery}
          onChange={(e) => {
            setGeneratedQuery(e.target.value);
            try {
              const query = JSON.parse(e.target.value);
              validateQuery(query);
            } catch {
              setValidationResult({
                isValid: false,
                errors: ['JSON格式无效'],
                warnings: []
              });
            }
          }}
          placeholder="生成的查询将显示在这里..."
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
          rows={8}
        />
      </div>
      
      {/* 验证结果 */}
      {validationResult && (
        <div className="mb-4">
          {validationResult.errors.length > 0 && (
            <div className="mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">错误</span>
              </div>
              <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validationResult.warnings.length > 0 && (
            <div className="mb-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">警告</span>
              </div>
              <ul className="text-sm text-yellow-600 dark:text-yellow-400 list-disc list-inside">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validationResult.isValid && validationResult.warnings.length === 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">查询验证通过</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={executeQuery}
          disabled={!generatedQuery || !validationResult?.isValid}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          执行查询
        </button>
      </div>
      
      {/* 查询历史 */}
      {showHistory && queryHistory.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">查询历史</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {queryHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className="p-3 bg-white dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {item.naturalLanguage}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {item.collection} • {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartQueryBuilder;
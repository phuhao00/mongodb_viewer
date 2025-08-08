import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Download, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { AIServiceClient } from '../services/aiService';
import { AnalysisResult, ChartRecommendation } from '../types/ai';
import { toast } from 'sonner';

interface AIAnalysisPanelProps {
  data?: any[];
  collection?: string;
  onChartCreate?: (chartConfig: any) => void;
}

interface AnalysisState {
  isAnalyzing: boolean;
  result: AnalysisResult | null;
  error: string | null;
}

const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  data = [],
  collection = '',
  onChartCreate
}) => {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isAnalyzing: false,
    result: null,
    error: null
  });
  
  const [selectedInsight, setSelectedInsight] = useState<number>(0);
  const aiService = new AIServiceClient();
  
  useEffect(() => {
    if (data.length > 0) {
      analyzeData();
    }
  }, [data, collection]);
  
  const analyzeData = async () => {
    if (!data.length) {
      setAnalysisState({
        isAnalyzing: false,
        result: null,
        error: '没有数据可供分析'
      });
      return;
    }
    
    setAnalysisState(prev => ({ ...prev, isAnalyzing: true, error: null }));
    
    try {
      const response = await aiService.analyzeData({
        data: data.slice(0, 100), // 限制分析数据量
        analysisType: 'comprehensive'
      });
      
      if (response) {
        setAnalysisState({
          isAnalyzing: false,
          result: response,
          error: null
        });
      } else {
        setAnalysisState({
          isAnalyzing: false,
          result: null,
          error: '分析失败'
        });
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      setAnalysisState({
        isAnalyzing: false,
        result: null,
        error: '分析过程中发生错误'
      });
    }
  };
  
  const createChart = (recommendation: ChartRecommendation) => {
    if (onChartCreate) {
      const chartConfig: any = {
        type: recommendation.type,
        title: recommendation.title,
        data: recommendation.data,
        config: recommendation.config
      };
      onChartCreate(chartConfig);
      toast.success(`已创建${recommendation.title}图表`);
    }
  };
  
  const exportAnalysis = () => {
    if (!analysisState.result) return;
    
    const exportData = {
      collection,
      timestamp: new Date().toISOString(),
      summary: analysisState.result.summary,
      insights: analysisState.result.insights,
      statistics: analysisState.result.statistics,
      recommendations: analysisState.result.recommendations
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${collection}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('分析结果已导出');
  };
  
  const getChartIcon = (type: string) => {
    switch (type) {
      case 'bar':
      case 'column':
        return <BarChart3 className="w-4 h-4" />;
      case 'pie':
      case 'doughnut':
        return <PieChart className="w-4 h-4" />;
      case 'line':
      case 'area':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };
  
  const formatStatValue = (value: any) => {
    if (typeof value === 'number') {
      if (value > 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value > 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      } else if (value % 1 !== 0) {
        return value.toFixed(2);
      }
    }
    return value?.toString() || 'N/A';
  };
  
  if (!data.length) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            AI数据分析
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            执行查询后，AI将自动分析数据并提供洞察
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* 头部 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              AI数据分析
            </h3>
            {collection && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                {collection}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={analyzeData}
              disabled={analysisState.isAnalyzing}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
              title="重新分析"
            >
              <RefreshCw className={`w-4 h-4 ${analysisState.isAnalyzing ? 'animate-spin' : ''}`} />
            </button>
            {analysisState.result && (
              <button
                onClick={exportAnalysis}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="导出分析结果"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* 内容区域 */}
      <div className="p-6">
        {analysisState.isAnalyzing && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">AI正在分析数据...</p>
          </div>
        )}
        
        {analysisState.error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">{analysisState.error}</span>
          </div>
        )}
        
        {analysisState.result && (
          <div className="space-y-6">
            {/* 概要 */}
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">分析概要</h4>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {analysisState.result.summary}
              </p>
            </div>
            
            {/* 统计信息 */}
            {analysisState.result.statistics && (
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">关键统计</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(analysisState.result.statistics).map(([key, value]) => (
                    <div key={key} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                        {formatStatValue(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 洞察 */}
            {analysisState.result.insights && analysisState.result.insights.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">数据洞察</h4>
                <div className="space-y-3">
                  {analysisState.result.insights.map((insight, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-l-4 ${
                        insight.type === 'warning'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400'
                          : insight.type === 'error'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-400'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                            {insight.title}
                          </h5>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {insight.description}
                          </p>
                          {insight.confidence && (
                            <div className="mt-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                置信度: {Math.round(insight.confidence * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 图表推荐 */}
            {analysisState.result.recommendations && analysisState.result.recommendations.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">推荐图表</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysisState.result.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getChartIcon(rec.type)}
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">
                            {rec.title}
                          </h5>
                        </div>
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                          {Math.round(rec.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {rec.description}
                      </p>
                      <button
                        onClick={() => createChart(rec)}
                        className="w-full px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                      >
                        创建图表
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysisPanel;
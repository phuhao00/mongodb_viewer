import React from 'react';
import { Database, BarChart3, Search, MessageSquare } from 'lucide-react';
import SystemStatus from '../components/SystemStatus';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            MongoDB 可视化工具
          </h1>
          <p className="text-gray-600">
            连接、查询、分析和可视化您的 MongoDB 数据
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 系统状态 */}
          <div className="lg:col-span-1">
            <SystemStatus className="mb-6" />
          </div>

          {/* 功能卡片 */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 数据库连接 */}
              <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Database className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">数据库连接</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  管理和配置您的 MongoDB 连接，支持多个数据库实例。
                </p>
                <a
                  href="/connections"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  管理连接 →
                </a>
              </div>

              {/* 数据查询 */}
              <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Search className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">数据查询</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  使用强大的查询编辑器执行 MongoDB 查询和聚合操作。
                </p>
                <a
                  href="/query"
                  className="inline-flex items-center text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  开始查询 →
                </a>
              </div>

              {/* 数据可视化 */}
              <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">数据可视化</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  将查询结果转换为图表和可视化图形，便于数据分析。
                </p>
                <a
                  href="/visualize"
                  className="inline-flex items-center text-purple-600 hover:text-purple-800 text-sm font-medium"
                >
                  创建图表 →
                </a>
              </div>

              {/* AI 助手 */}
              <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">AI 智能助手</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  使用自然语言与数据对话，自动生成查询和分析建议。
                </p>
                <a
                  href="/ai"
                  className="inline-flex items-center text-orange-600 hover:text-orange-800 text-sm font-medium"
                >
                  开始对话 →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 快速开始指南 */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">快速开始</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">连接数据库</h3>
                <p className="text-gray-600 text-sm">
                  配置您的 MongoDB 连接字符串，建立与数据库的连接。
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">2</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">浏览数据</h3>
                <p className="text-gray-600 text-sm">
                  使用数据库浏览器查看集合结构和数据内容。
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-semibold text-sm">3</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">分析可视化</h3>
                <p className="text-gray-600 text-sm">
                  执行查询并创建图表，深入分析您的数据。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
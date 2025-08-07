// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// 通用请求函数
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// 连接管理API
export const connectionsAPI = {
  // 获取所有连接
  getAll: () => request<{ success: boolean; data: any[] }>('/connections'),
  
  // 创建新连接
  create: (data: { name: string; uri: string; options?: any }) =>
    request<{ success: boolean; connectionId: string; message: string }>('/connections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 测试连接
  test: (data: { uri: string; options?: any }) =>
    request<{ success: boolean; connected: boolean; message: string }>('/connections/test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 删除连接
  delete: (connectionId: string) =>
    request<{ success: boolean; message: string }>(`/connections/${connectionId}`, {
      method: 'DELETE',
    }),
  
  // 获取数据库列表
  getDatabases: (connectionId: string) =>
    request<{ success: boolean; data: any[] }>(`/connections/${connectionId}/databases`),
  
  // 获取集合列表
  getCollections: (connectionId: string, databaseName: string) =>
    request<{ success: boolean; data: any[] }>(
      `/connections/${connectionId}/databases/${databaseName}/collections`
    ),
};

// 查询API
export const queryAPI = {
  // 执行查询
  execute: (connectionId: string, data: {
    database: string;
    collection: string;
    operation: string;
    query?: any;
    options?: any;
  }) =>
    request<{
      success: boolean;
      data: any[];
      count: number;
      executionTime: number;
      error?: string;
    }>(`/query/${connectionId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 执行聚合查询
  aggregate: (connectionId: string, data: {
    database: string;
    collection: string;
    operation: string;
    pipeline: any[];
  }) =>
    request<{
      success: boolean;
      data: any[];
      count: number;
      executionTime: number;
      error?: string;
    }>(`/query/${connectionId}/aggregate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 获取查询历史
  getHistory: (connectionId: string, limit?: number) =>
    request<{ success: boolean; data: any[] }>(
      `/query/${connectionId}/history${limit ? `?limit=${limit}` : ''}`
    ),
  
  // 获取集合统计
  getStats: (connectionId: string, database: string, collection: string) =>
    request<{ success: boolean; data: any }>(
      `/query/${connectionId}/stats/${database}/${collection}`
    ),
  
  // 获取集合统计（别名）
  getCollectionStats: (connectionId: string, database: string, collection: string) =>
    request<{ success: boolean; data: any }>(
      `/query/${connectionId}/stats/${database}/${collection}`
    ),
  
  // 获取索引
  getIndexes: (connectionId: string, database: string, collection: string) =>
    request<{ success: boolean; data: any[] }>(
      `/query/${connectionId}/indexes/${database}/${collection}`
    ),
  
  // 创建索引
  createIndex: (connectionId: string, database: string, collection: string, data: {
    keys: any;
    options?: any;
  }) =>
    request<{ success: boolean; data: { indexName: string } }>(
      `/query/${connectionId}/indexes/${database}/${collection}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  // 创建文档
  createDocument: (connectionId: string, database: string, collection: string, document: any) =>
    request<{ success: boolean; data: { insertedId: string } }>(
      `/query/${connectionId}/document/${database}/${collection}`,
      {
        method: 'POST',
        body: JSON.stringify({ document }),
      }
    ),

  // 更新文档
  updateDocument: (connectionId: string, database: string, collection: string, documentId: string, document: any) =>
    request<{ success: boolean; data: { modifiedCount: number } }>(
      `/query/${connectionId}/document/${database}/${collection}/${documentId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ document }),
      }
    ),

  // 删除文档
  deleteDocument: (connectionId: string, database: string, collection: string, documentId: string) =>
    request<{ success: boolean; data: { deletedCount: number } }>(
      `/query/${connectionId}/document/${database}/${collection}/${documentId}`,
      {
        method: 'DELETE',
      }
    ),
};

// 可视化API
export const visualizeAPI = {
  // 生成图表数据
  generate: (connectionId: string, data: {
    database: string;
    collection: string;
    aggregation?: any[];
    chartType: string;
    config?: any;
  }) =>
    request<{
      success: boolean;
      chartData: any;
      metadata: any;
    }>(`/visualize/${connectionId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 保存可视化配置
  save: (connectionId: string, data: {
    name: string;
    chartType: string;
    config: any;
    data?: any;
  }) =>
    request<{
      success: boolean;
      visualizationId: string;
      message: string;
    }>(`/visualize/${connectionId}/save`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 获取可视化列表
  getList: (connectionId: string) =>
    request<{ success: boolean; data: any[] }>(`/visualize/${connectionId}/list`),
  
  // 获取可视化详情
  getDetail: (connectionId: string, visualizationId: string) =>
    request<{ success: boolean; data: any }>(
      `/visualize/${connectionId}/${visualizationId}`
    ),
  
  // 更新可视化
  update: (connectionId: string, visualizationId: string, data: {
    name: string;
    chartType: string;
    config: any;
    data?: any;
  }) =>
    request<{ success: boolean; message: string }>(
      `/visualize/${connectionId}/${visualizationId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),
  
  // 获取所有可视化
  getAll: (connectionId: string) =>
    request<{ success: boolean; data: any[] }>(`/visualize/${connectionId}`),
  
  // 删除可视化
  delete: (connectionId: string, visualizationId: string) =>
    request<{ success: boolean; message: string }>(
      `/visualize/${connectionId}/${visualizationId}`,
      { method: 'DELETE' }
    ),
  
  // 获取分析建议
  getSuggestions: (connectionId: string, database: string, collection: string) =>
    request<{
      success: boolean;
      data: {
        fieldAnalysis: any;
        suggestions: any[];
      };
    }>(`/visualize/${connectionId}/suggestions/${database}/${collection}`),
};

// 健康检查API
export const healthAPI = {
  check: () => request<{ success: boolean; message: string }>('/health'),
};

// 导出所有API
export const api = {
  connections: connectionsAPI,
  query: queryAPI,
  visualize: visualizeAPI,
  health: healthAPI,
};

export default api;
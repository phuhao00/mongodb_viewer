import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 连接状态接口
interface Connection {
  id: string;
  name: string;
  uri?: string;
  createdAt: string;
  updatedAt: string;
}

// 数据库信息接口
interface Database {
  name: string;
  sizeOnDisk?: number;
  empty?: boolean;
  collections?: Collection[];
}

// 集合信息接口
interface Collection {
  name: string;
  type: string;
  options?: any;
  stats?: {
    count: number;
    size: number;
    avgObjSize: number;
    storageSize: number;
    indexes: number;
    totalIndexSize: number;
  };
}

// 查询历史接口
interface QueryHistory {
  id: string;
  database: string;
  collection: string;
  operation: string;
  query: any;
  options: any;
  executedAt: Date;
  executionTime: number;
  results?: any[];
  createdAt: string;
}

// 可视化接口
interface Visualization {
  id: string;
  name: string;
  database: string;
  collection: string;
  type: string;
  config: any;
  data: any[];
  createdAt: Date;
  updatedAt: Date;
}

// 设置接口
interface Settings {
  language: string;
  autoRefresh: boolean;
  refreshInterval: number;
  maxQueryResults: number;
  enableNotifications: boolean;
  defaultPageSize: number;
  connectionTimeout: number;
  queryTimeout: number;
}

// 主题类型
type Theme = 'light' | 'dark' | 'system';

// 主题状态
interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}

// 设置状态
interface SettingsState {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
}

// 应用状态接口
interface AppState {
  // 主题相关
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // 连接管理
  connections: Connection[];
  currentConnectionId: string | null;
  setConnections: (connections: Connection[]) => void;
  setCurrentConnection: (connectionId: string | null) => void;
  addConnection: (connection: Connection) => void;
  removeConnection: (connectionId: string) => void;
  
  // 数据库浏览
  databases: Database[];
  currentDatabase: string | null;
  collections: Collection[];
  currentCollection: string | null;
  setDatabases: (databases: Database[]) => void;
  setCurrentDatabase: (database: string | null) => void;
  setCollections: (collections: Collection[]) => void;
  setCurrentCollection: (collection: string | null) => void;
  
  // 查询相关
  queryHistory: QueryHistory[];
  currentQuery: string;
  queryResults: any[];
  queryLoading: boolean;
  setQueryHistory: (history: QueryHistory[]) => void;
  addQueryHistory: (query: QueryHistory) => void;
  setCurrentQuery: (query: string) => void;
  setQueryResults: (results: any[]) => void;
  setQueryLoading: (loading: boolean) => void;
  
  // 可视化相关
  visualizations: any[];
  currentVisualization: any | null;
  setVisualizations: (visualizations: any[]) => void;
  setCurrentVisualization: (visualization: any | null) => void;
  addVisualization: (visualization: any) => void;
  removeVisualization: (visualizationId: string) => void;
  
  // UI状态
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // 加载状态
  loading: {
    connections: boolean;
    databases: boolean;
    collections: boolean;
    collectionData: boolean;
    query: boolean;
    visualization: boolean;
    visualizations: boolean;
    chartData: boolean;
    save: boolean;
  };
  setLoading: (key: string, value: boolean) => void;
}

// 创建store
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 主题相关
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      
      // 连接管理
      connections: [],
      currentConnectionId: null,
      setConnections: (connections) => set({ connections }),
      setCurrentConnection: (connectionId) => {
        set({ 
          currentConnectionId: connectionId,
          // 切换连接时重置相关状态
          databases: [],
          currentDatabase: null,
          collections: [],
          currentCollection: null,
          queryResults: [],
          currentQuery: ''
        });
      },
      addConnection: (connection) => {
        const { connections } = get();
        set({ connections: [...connections, connection] });
      },
      removeConnection: (connectionId) => {
        const { connections, currentConnectionId } = get();
        const newConnections = connections.filter(c => c.id !== connectionId);
        const newCurrentId = currentConnectionId === connectionId ? null : currentConnectionId;
        set({ 
          connections: newConnections, 
          currentConnectionId: newCurrentId,
          databases: newCurrentId ? get().databases : [],
          currentDatabase: newCurrentId ? get().currentDatabase : null
        });
      },
      
      // 数据库浏览
      databases: [],
      currentDatabase: null,
      collections: [],
      currentCollection: null,
      setDatabases: (databases) => set({ databases }),
      setCurrentDatabase: (database) => {
        set({ 
          currentDatabase: database,
          collections: [],
          currentCollection: null
        });
      },
      setCollections: (collections) => set({ collections }),
      setCurrentCollection: (collection) => set({ currentCollection: collection }),
      
      // 查询相关
      queryHistory: [],
      currentQuery: '',
      queryResults: [],
      queryLoading: false,
      setQueryHistory: (history) => set({ queryHistory: history }),
      addQueryHistory: (query) => {
        const { queryHistory } = get();
        set({ queryHistory: [query, ...queryHistory.slice(0, 49)] }); // 保留最近50条
      },
      setCurrentQuery: (query) => set({ currentQuery: query }),
      setQueryResults: (results) => set({ queryResults: results }),
      setQueryLoading: (loading) => set({ queryLoading: loading }),
      
      // 可视化相关
      visualizations: [],
      currentVisualization: null,
      setVisualizations: (visualizations) => set({ visualizations }),
      setCurrentVisualization: (visualization) => set({ currentVisualization: visualization }),
      addVisualization: (visualization) => {
        const { visualizations } = get();
        set({ visualizations: [...visualizations, visualization] });
      },
      removeVisualization: (visualizationId) => {
        const { visualizations } = get();
        set({ visualizations: visualizations.filter(v => v.id !== visualizationId) });
      },
      
      // UI状态
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      // 加载状态
      loading: {
        connections: false,
        databases: false,
        collections: false,
        collectionData: false,
        query: false,
        visualization: false,
        visualizations: false,
        chartData: false,
        save: false
      },
      setLoading: (key, value) => {
        const { loading } = get();
        set({ loading: { ...loading, [key]: value } });
      }
    }),
    {
      name: 'mongo-view-storage',
      partialize: (state) => ({
        theme: state.theme,
        connections: state.connections,
        currentConnectionId: state.currentConnectionId,
        sidebarCollapsed: state.sidebarCollapsed,
        queryHistory: state.queryHistory.slice(0, 20) // 只持久化最近20条查询历史
      })
    }
  )
);

// 创建主题store
const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        // 应用主题到DOM
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // system theme
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (isDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
      toggleTheme: () => {
        const { theme } = get();
        const newTheme = theme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      }
    }),
    {
      name: 'theme-storage'
    }
  )
);

// 创建设置store
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        language: 'zh-CN',
        autoRefresh: true,
        refreshInterval: 30,
        maxQueryResults: 100,
        enableNotifications: true,
        defaultPageSize: 20,
        connectionTimeout: 10000,
        queryTimeout: 30000
      },
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }));
      }
    }),
    {
      name: 'settings-storage'
    }
  )
);

// 选择器hooks
export const useTheme = () => {
  const themeStore = useThemeStore();
  return {
    theme: themeStore.theme,
    setTheme: themeStore.setTheme,
    toggleTheme: themeStore.toggleTheme
  };
};
export const useConnections = () => {
  const state = useStore();
  const currentConnection = state.connections.find(conn => conn.id === state.currentConnectionId);
  return {
    connections: state.connections,
    currentConnectionId: state.currentConnectionId,
    currentConnection,
    setConnections: state.setConnections,
    setCurrentConnection: state.setCurrentConnection,
    addConnection: state.addConnection,
    removeConnection: state.removeConnection
  };
};
export const useDatabases = () => {
  const databases = useStore(state => state.databases);
  const currentDatabase = useStore(state => state.currentDatabase);
  const collections = useStore(state => state.collections);
  const currentCollection = useStore(state => state.currentCollection);
  const setDatabases = useStore(state => state.setDatabases);
  const setCurrentDatabase = useStore(state => state.setCurrentDatabase);
  const setCollections = useStore(state => state.setCollections);
  const setCurrentCollection = useStore(state => state.setCurrentCollection);
  
  return {
    databases,
    currentDatabase,
    collections,
    currentCollection,
    setDatabases,
    setCurrentDatabase,
    setCollections,
    setCurrentCollection
  };
};

export const useDatabase = () => {
  const databases = useStore(state => state.databases);
  const currentDatabase = useStore(state => state.currentDatabase);
  const setDatabases = useStore(state => state.setDatabases);
  const setCurrentDatabase = useStore(state => state.setCurrentDatabase);
  
  return {
    databases,
    currentDatabase,
    setDatabases,
    setCurrentDatabase
  };
};
export const useQuery = () => {
  const queryHistory = useStore(state => state.queryHistory);
  const currentQuery = useStore(state => state.currentQuery);
  const queryResults = useStore(state => state.queryResults);
  const queryLoading = useStore(state => state.queryLoading);
  const setQueryHistory = useStore(state => state.setQueryHistory);
  const addQueryHistory = useStore(state => state.addQueryHistory);
  const setCurrentQuery = useStore(state => state.setCurrentQuery);
  const setQueryResults = useStore(state => state.setQueryResults);
  const setQueryLoading = useStore(state => state.setQueryLoading);
  
  return {
    queryHistory,
    currentQuery,
    queryResults,
    queryLoading,
    setQueryHistory,
    addQueryHistory,
    addToHistory: addQueryHistory,
    setCurrentQuery,
    setQueryResults,
    setQueryLoading
  };
};
export const useVisualization = () => {
  const visualizations = useStore(state => state.visualizations);
  const currentVisualization = useStore(state => state.currentVisualization);
  const setVisualizations = useStore(state => state.setVisualizations);
  const setCurrentVisualization = useStore(state => state.setCurrentVisualization);
  const addVisualization = useStore(state => state.addVisualization);
  const removeVisualization = useStore(state => state.removeVisualization);
  
  return {
    visualizations,
    currentVisualization,
    setVisualizations,
    setCurrentVisualization,
    addVisualization,
    removeVisualization
  };
};
export const useUI = () => {
  const sidebarCollapsed = useStore(state => state.sidebarCollapsed);
  const setSidebarCollapsed = useStore(state => state.setSidebarCollapsed);
  const loading = useStore(state => state.loading);
  const setLoading = useStore(state => state.setLoading);
  
  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    loading,
    setLoading
  };
};
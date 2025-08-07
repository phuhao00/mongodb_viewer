import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Database, 
  Search, 
  BarChart3, 
  Settings, 
  Moon, 
  Sun,
  Menu,
  X
} from 'lucide-react';
import { useTheme, useUI, useStore } from '../store/useStore';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  {
    name: '连接管理',
    href: '/connections',
    icon: Database
  },
  {
    name: '数据库浏览',
    href: '/database',
    icon: Search
  },
  {
    name: '查询编辑器',
    href: '/query',
    icon: Search
  },
  {
    name: '数据可视化',
    href: '/visualization',
    icon: BarChart3
  },
  {
    name: '设置',
    href: '/settings',
    icon: Settings
  }
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { sidebarCollapsed, setSidebarCollapsed } = useUI();
  const currentConnectionId = useStore(state => state.currentConnectionId);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          !sidebarCollapsed ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                MongoDB View
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(true)}
              className="lg:hidden"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                  onClick={() => setSidebarCollapsed(true)}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Theme toggle */}
          <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              onClick={toggleTheme}
              className="w-full justify-start gap-3"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-5 h-5" />
                  浅色模式
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5" />
                  深色模式
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(false)}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                MongoDB 可视化工具
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
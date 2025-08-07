import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Edit3 } from 'lucide-react';
import { Button } from './ui/Button';
import { toast } from './ui/Toast';
import { cn } from '../lib/utils';

interface TreeNodeProps {
  data: any;
  keyName?: string;
  level?: number;
  onEdit?: (path: string[], value: any) => void;
  path?: string[];
}

interface TreeViewProps {
  data: any;
  onEdit?: (path: string[], value: any) => void;
  className?: string;
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
  data, 
  keyName, 
  level = 0, 
  onEdit,
  path = [] 
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // 默认展开前两层
  
  const getDataType = (value: any): string => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'unknown';
  };

  const getValueColor = (type: string): string => {
    switch (type) {
      case 'string': return 'text-green-600 dark:text-green-400';
      case 'number': return 'text-blue-600 dark:text-blue-400';
      case 'boolean': return 'text-purple-600 dark:text-purple-400';
      case 'null': return 'text-gray-500 dark:text-gray-400';
      default: return 'text-gray-900 dark:text-white';
    }
  };

  const formatValue = (value: any, type: string): string => {
    if (type === 'string') return `"${value}"`;
    if (type === 'null') return 'null';
    return String(value);
  };

  const copyToClipboard = (value: any) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      toast.success('已复制到剪贴板');
    }).catch(() => {
      toast.error('复制失败');
    });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(path, data);
    }
  };

  const dataType = getDataType(data);
  const isExpandable = dataType === 'object' || dataType === 'array';
  const currentPath = keyName ? [...path, keyName] : path;

  if (!isExpandable) {
    // 叶子节点
    return (
      <div 
        className="flex items-center gap-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 group"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {keyName && (
            <>
              <span className="text-blue-600 dark:text-blue-400">"{keyName}"</span>
              <span className="text-gray-500 mx-1">:</span>
            </>
          )}
        </span>
        <span className={cn('text-sm font-mono', getValueColor(dataType))}>
          {formatValue(data, dataType)}
        </span>
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto">
          <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(data)}
              className="h-6 w-6 p-0"
            >
            <Copy className="w-3 h-3" />
          </Button>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-6 w-6 p-0"
            >
              <Edit3 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 容器节点（对象或数组）
  const itemCount = Array.isArray(data) ? data.length : Object.keys(data).length;
  
  return (
    <div>
      <div 
        className="flex items-center gap-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 cursor-pointer group"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="flex items-center justify-center w-4 h-4">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          )}
        </button>
        
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {keyName && (
            <>
              <span className="text-blue-600 dark:text-blue-400">"{keyName}"</span>
              <span className="text-gray-500 mx-1">:</span>
            </>
          )}
        </span>
        
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {dataType === 'array' ? '[' : '{'}
          {!isExpanded && (
            <span className="mx-1">
              {itemCount} {dataType === 'array' ? 'items' : 'keys'}
            </span>
          )}
          {dataType === 'array' ? ']' : '}'}
        </span>
        
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(data);
            }}
            className="h-6 w-6 p-0"
          >
            <Copy className="w-3 h-3" />
          </Button>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              className="h-6 w-6 p-0"
            >
              <Edit3 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div>
          {Array.isArray(data) ? (
            data.map((item, index) => (
              <TreeNode
                key={index}
                data={item}
                keyName={String(index)}
                level={level + 1}
                onEdit={onEdit}
                path={currentPath}
              />
            ))
          ) : (
            Object.entries(data).map(([key, value]) => (
              <TreeNode
                key={key}
                data={value}
                keyName={key}
                level={level + 1}
                onEdit={onEdit}
                path={currentPath}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

const TreeView: React.FC<TreeViewProps> = ({ data, onEdit, className }) => {
  if (!data) {
    return (
      <div className={cn('p-4 text-center text-gray-500 dark:text-gray-400', className)}>
        暂无数据
      </div>
    );
  }

  return (
    <div className={cn('font-mono text-sm bg-white dark:bg-gray-900 border rounded-lg', className)}>
      <div className="p-2">
        <TreeNode data={data} onEdit={onEdit} />
      </div>
    </div>
  );
};

export default TreeView;
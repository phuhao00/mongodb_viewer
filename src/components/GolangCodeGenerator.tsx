import React, { useState, useEffect } from 'react';
import { Code, Copy, Download, Settings, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { toast } from './ui/Toast';
import { cn } from '../lib/utils';
import { useConnections } from '../store/useStore';
import { queryAPI } from '../services/api';

interface GolangCodeGeneratorProps {
  database: string;
  collection: string;
  onClose: () => void;
}

interface FieldInfo {
  name: string;
  type: string;
  isArray: boolean;
  isOptional: boolean;
  jsonTag: string;
  bsonTag: string;
}

interface GeneratorOptions {
  packageName: string;
  structName: string;
  includeJSON: boolean;
  includeBSON: boolean;
  includeValidation: boolean;
  includeComments: boolean;
}

const GolangCodeGenerator: React.FC<GolangCodeGeneratorProps> = ({
  database,
  collection,
  onClose
}) => {
  const [options, setOptions] = useState<GeneratorOptions>({
    packageName: 'models',
    structName: toPascalCase(collection),
    includeJSON: true,
    includeBSON: true,
    includeValidation: false,
    includeComments: true
  });
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [fields, setFields] = useState<FieldInfo[]>([]);
  
  const { currentConnectionId } = useConnections();
  
  // 获取集合数据用于分析结构
  const fetchCollectionData = async () => {
    if (!currentConnectionId) return;
    
    setLoading(true);
    try {
      const response = await queryAPI.execute(currentConnectionId, {
        database,
        collection,
        operation: 'find',
        query: {},
        options: { limit: 50 } // 限制数量以提高性能
      });
      
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error fetching collection data:', error);
      toast.error('获取集合数据失败');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCollectionData();
  }, [currentConnectionId, database, collection]);

  // 转换为PascalCase
  function toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  // 转换为camelCase
  function toCamelCase(str: string): string {
    const pascal = toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  // 分析数据结构
  const analyzeStructure = (data: any[]): FieldInfo[] => {
    const fieldMap = new Map<string, FieldInfo>();
    
    data.forEach(doc => {
      analyzeObject(doc, fieldMap);
    });
    
    return Array.from(fieldMap.values()).sort((a, b) => {
      // _id 字段排在最前面
      if (a.name === '_id') return -1;
      if (b.name === '_id') return 1;
      return a.name.localeCompare(b.name);
    });
  };

  const analyzeObject = (obj: any, fieldMap: Map<string, FieldInfo>, prefix = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      const goFieldName = toPascalCase(key);
      
      if (!fieldMap.has(fieldName)) {
        fieldMap.set(fieldName, {
          name: goFieldName,
          type: getGoType(value),
          isArray: Array.isArray(value),
          isOptional: false,
          jsonTag: key,
          bsonTag: key
        });
      } else {
        // 更新类型信息，处理类型不一致的情况
        const existing = fieldMap.get(fieldName)!;
        const newType = getGoType(value);
        if (existing.type !== newType && existing.type !== 'interface{}') {
          existing.type = 'interface{}';
        }
      }
    });
  };

  const getGoType = (value: any): string => {
    if (value === null || value === undefined) {
      return 'interface{}';
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]interface{}';
      const firstType = getGoType(value[0]);
      return `[]${firstType}`;
    }
    
    switch (typeof value) {
      case 'string':
        // 检查是否是ObjectId
        if (value.match(/^[0-9a-fA-F]{24}$/)) {
          return 'primitive.ObjectID';
        }
        // 检查是否是时间格式
        if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
          return 'time.Time';
        }
        return 'string';
      case 'number':
        return Number.isInteger(value) ? 'int64' : 'float64';
      case 'boolean':
        return 'bool';
      case 'object':
        // 检查是否是MongoDB的特殊类型
        if (value.$oid) return 'primitive.ObjectID';
        if (value.$date) return 'time.Time';
        if (value.$numberLong) return 'int64';
        if (value.$numberDouble) return 'float64';
        return 'interface{}';
      default:
        return 'interface{}';
    }
  };

  const generateStruct = (): string => {
    let code = '';
    
    // Package declaration
    code += `package ${options.packageName}\n\n`;
    
    // Imports
    const imports = new Set<string>();
    if (fields.some(f => f.type.includes('primitive.ObjectID'))) {
      imports.add('go.mongodb.org/mongo-driver/bson/primitive');
    }
    if (fields.some(f => f.type.includes('time.Time'))) {
      imports.add('time');
    }
    if (options.includeBSON) {
      imports.add('go.mongodb.org/mongo-driver/bson');
    }
    
    if (imports.size > 0) {
      code += 'import (\n';
      imports.forEach(imp => {
        code += `\t"${imp}"\n`;
      });
      code += ')\n\n';
    }
    
    // Struct comment
    if (options.includeComments) {
      code += `// ${options.structName} represents a document in the ${collection} collection\n`;
    }
    
    // Struct definition
    code += `type ${options.structName} struct {\n`;
    
    fields.forEach(field => {
      if (options.includeComments && field.name !== 'ID') {
        code += `\t// ${field.name} field\n`;
      }
      
      code += `\t${field.name} ${field.type}`;
      
      // Tags
      const tags = [];
      if (options.includeJSON) {
        tags.push(`json:"${field.jsonTag}"`);
      }
      if (options.includeBSON) {
        tags.push(`bson:"${field.bsonTag}"`);
      }
      if (options.includeValidation && field.name !== 'ID') {
        tags.push('validate:"required"');
      }
      
      if (tags.length > 0) {
        code += ` \`${tags.join(' ')}\``;
      }
      
      code += '\n';
    });
    
    code += '}\n\n';
    
    // Helper methods
    if (options.includeComments) {
      code += `// Collection returns the MongoDB collection name\n`;
    }
    code += `func (${toCamelCase(options.structName)} *${options.structName}) Collection() string {\n`;
    code += `\treturn "${collection}"\n`;
    code += '}\n\n';
    
    if (options.includeComments) {
      code += `// Database returns the MongoDB database name\n`;
    }
    code += `func (${toCamelCase(options.structName)} *${options.structName}) Database() string {\n`;
    code += `\treturn "${database}"\n`;
    code += '}\n';
    
    return code;
  };

  useEffect(() => {
    if (data && data.length > 0) {
      const analyzedFields = analyzeStructure(data);
      setFields(analyzedFields);
    }
  }, [data]);

  useEffect(() => {
    if (fields.length > 0) {
      const code = generateStruct();
      setGeneratedCode(code);
    }
  }, [fields, options]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      toast.success('代码已复制到剪贴板');
    }).catch(() => {
      toast.error('复制失败');
    });
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${options.structName.toLowerCase()}.go`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('代码文件已下载');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-6xl max-h-[90vh] m-4 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Golang 代码生成器
            </h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 左侧配置面板 */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 p-4 overflow-auto">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  包名
                </label>
                <Input
                  value={options.packageName}
                  onChange={(e) => setOptions(prev => ({ ...prev, packageName: e.target.value }))}
                  placeholder="package name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  结构体名称
                </label>
                <Input
                  value={options.structName}
                  onChange={(e) => setOptions(prev => ({ ...prev, structName: e.target.value }))}
                  placeholder="struct name"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  选项
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.includeJSON}
                    onChange={(e) => setOptions(prev => ({ ...prev, includeJSON: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">包含 JSON 标签</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.includeBSON}
                    onChange={(e) => setOptions(prev => ({ ...prev, includeBSON: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">包含 BSON 标签</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.includeValidation}
                    onChange={(e) => setOptions(prev => ({ ...prev, includeValidation: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">包含验证标签</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.includeComments}
                    onChange={(e) => setOptions(prev => ({ ...prev, includeComments: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">包含注释</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  字段信息 ({fields.length})
                </label>
                <div className="space-y-1 max-h-40 overflow-auto">
                  {fields.map((field, index) => (
                    <div key={index} className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="font-medium">{field.name}</div>
                      <div className="text-gray-500">{field.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 右侧代码展示 */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white">生成的代码</h4>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy className="w-4 h-4 mr-2" />
                  复制
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCode}>
                  <Download className="w-4 h-4 mr-2" />
                  下载
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400">正在分析集合结构...</span>
                </div>
              ) : (
                <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {generatedCode}
                </pre>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GolangCodeGenerator;
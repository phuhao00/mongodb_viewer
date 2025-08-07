import React, { useState, useEffect } from 'react';
import { Edit3, Save, X, Trash2, Plus } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { toast } from './ui/Toast';
import { cn } from '../lib/utils';

interface DocumentEditorProps {
  document: any;
  onSave: (updatedDoc: any) => Promise<void>;
  onDelete?: (docId: string) => Promise<void>;
  onCancel: () => void;
  isNew?: boolean;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  onSave,
  onDelete,
  onCancel,
  isNew = false
}) => {
  const [editedDoc, setEditedDoc] = useState<string>('');
  const [isValid, setIsValid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const formatted = JSON.stringify(document, null, 2);
      setEditedDoc(formatted);
      setIsValid(true);
      setError(null);
    } catch (err) {
      setError('文档格式错误');
      setIsValid(false);
    }
  }, [document]);

  const validateJSON = (jsonString: string) => {
    try {
      JSON.parse(jsonString);
      setIsValid(true);
      setError(null);
      return true;
    } catch (err: any) {
      setIsValid(false);
      setError(`JSON格式错误: ${err.message}`);
      return false;
    }
  };

  const handleDocumentChange = (value: string) => {
    setEditedDoc(value);
    validateJSON(value);
  };

  const handleSave = async () => {
    if (!isValid) {
      toast.error('请修复JSON格式错误后再保存');
      return;
    }

    try {
      setIsSaving(true);
      const parsedDoc = JSON.parse(editedDoc);
      await onSave(parsedDoc);
      toast.success(isNew ? '文档创建成功' : '文档保存成功');
      onCancel();
    } catch (err: any) {
      console.error('保存文档失败:', err);
      toast.error(err.message || '保存文档失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !document._id) return;

    if (!confirm('确定要删除这个文档吗？此操作不可撤销。')) {
      return;
    }

    try {
      await onDelete(document._id);
      toast.success('文档删除成功');
      onCancel();
    } catch (err: any) {
      console.error('删除文档失败:', err);
      toast.error(err.message || '删除文档失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-6xl max-h-[95vh] m-4 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isNew ? '新建文档' : '编辑文档'}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 编辑器 */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full flex flex-col">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <textarea
              value={editedDoc}
              onChange={(e) => handleDocumentChange(e.target.value)}
              className={cn(
                'flex-1 w-full p-4 border rounded-lg font-mono text-sm resize-none min-h-[500px]',
                'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                'border-gray-300 dark:border-gray-600',
                'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                !isValid && 'border-red-300 dark:border-red-600'
              )}
              placeholder="输入JSON格式的文档数据..."
              spellCheck={false}
            />
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {!isNew && onDelete && (
              <Button
                variant="outline"
                onClick={handleDelete}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid || isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isNew ? '创建' : '保存'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DocumentEditor;
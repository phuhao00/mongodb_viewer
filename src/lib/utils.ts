import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 格式化字节大小
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 格式化数字
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

// 深拷贝对象
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T;
  }

  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  return obj;
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 生成随机ID
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// 验证MongoDB URI
export function isValidMongoURI(uri: string): boolean {
  const mongoURIRegex = /^mongodb(?:\+srv)?:\/\/(?:[^:]+:[^@]*@)?[^\/?]+(?:\/[^?]*)?(?:\?.*)?$/;
  return mongoURIRegex.test(uri);
}

// 格式化JSON
export function formatJSON(obj: any, indent = 2): string {
  try {
    return JSON.stringify(obj, null, indent);
  } catch (error) {
    return String(obj);
  }
}

// 解析JSON
export function parseJSON(str: string): any {
  try {
    return JSON.parse(str);
  } catch (error) {
    return null;
  }
}

// 获取对象类型
export function getObjectType(obj: any): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (Array.isArray(obj)) return 'array';
  if (obj instanceof Date) return 'date';
  if (obj instanceof RegExp) return 'regexp';
  return typeof obj;
}

// 截断文本
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
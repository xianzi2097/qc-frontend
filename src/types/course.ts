/**
 * 课程相关的共享类型定义
 */

// 课程类型
export interface Course {
  name: string;
  type: string;
  description: string;
  material_count: number;
  teacher?: string;
}

// 教师类型
export interface Teacher {
  id: number;
  username: string;
}

// 素材类型
export interface Material {
  name: string;
  has_main?: boolean;
  has_student?: boolean;
  sb3_count?: number;
  files?: { name: string; size: number }[];
  file_count?: number;
  url: string;
}

// 课程类型常量 - 统一的 emoji 映射
export const TYPE_ICON: Record<string, string> = {
  scratch: '🧩',
  python: '🍁',
  cpp: '⚙️',
};

// 课程类型选项 - 用于下拉选择等
export const TYPE_OPTIONS = [
  { value: 'scratch', label: '🧩 Scratch' },
  { value: 'python', label: '🍁 Python' },
  { value: 'cpp', label: '⚙️ C++' },
];

// 文件扩展名到图标的映射（用于文件列表显示）
// 注意：这个映射在 CoursePlaza.tsx 中使用，保留在此处
export const FILE_ICON_EXTENSIONS = ['html', 'htm', 'py', 'cpp', 'txt', 'md', 'pdf', 'png', 'jpg', 'jpeg', 'gif'];

// 工具函数：获取文件扩展名
export function getFileExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

// 工具函数：格式化文件大小
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
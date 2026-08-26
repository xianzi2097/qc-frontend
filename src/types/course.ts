/**
 * 课程相关的共享类型定义
 */

// 课程类型
export interface Course {
  id: string;
  name: string;
  type: string;
  format?: string;
  description: string;
  tags?: string[];
  material_count: number;
  teacher?: string;
  teacher_key?: string;
  featured?: boolean;  // 精选课程（显示在「精选课程」栏目，从「在线课程」隐藏）
  publish?: { status?: string; error?: string; published_at?: string };
}

// 文件树节点（后台资源管理器）
export interface TreeNode {
  name: string;
  type: 'dir' | 'file';
  children?: TreeNode[];
  size?: number;
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

// 课程类型常量 - Lucide 图标映射
import type { LucideIcon } from 'lucide-react';
import { Puzzle, Code2, Cog } from 'lucide-react';

export const TYPE_LUCIDE: Record<string, LucideIcon> = {
  scratch: Puzzle,
  python: Code2,
  cpp: Cog,
};

// 课程类型选项
export const TYPE_OPTIONS = [
  { value: 'scratch', label: 'Scratch', Icon: Puzzle, color: '#f97316' },  // 橙色
  { value: 'python', label: 'Python', Icon: Code2, color: '#22c55e' },      // 绿色
  { value: 'cpp', label: 'C++', Icon: Cog, color: '#94a3b8' },            // 金属灰
];

// 打开方式（format）
import { Monitor, FolderOpen, BookOpen } from 'lucide-react';

export const FORMAT_OPTIONS = [
  { value: 'scratch', label: 'Scratch', Icon: Monitor },
  {value: 'folder', label: '文件夹', Icon: FolderOpen },
  { value: 'ebook', label: '电子书', Icon: BookOpen },
];

export const FORMAT_LABEL: Record<string, string> = {
  scratch: 'Scratch',
  folder: '文件夹',
  ebook: '电子书',
};

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
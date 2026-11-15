/**
 * 课程相关的共享类型定义
 */

/** 资产分类（V2 bucket 四值，取代旧 shelf/category 词汇） */
export type Bucket = 'courses' | 'books' | 'reference' | 'download';

// 资产类型（课程/书架/资料/软件共用一行形状，M5b-6）
export interface Course {
  id: string;
  name: string;
  type: string;
  format?: string;
  description: string;
  tags?: string[];
  bucket: Bucket;
  teacher?: string;        // = V2 owner_name（前端沿用 teacher 叫法，零组件改动）
  publish?: { state?: string; message?: string; error?: string; published_at?: string };
  shareable?: boolean;     // D34：课程下载开关（后台编辑里切，公开可见）
}

/** 课程所在书架（bucket 直给，二值语义：books=收纳 / courses=正在教） */
export const shelfOf = (c: Course): 'books' | 'courses' =>
  c.bucket === 'books' ? 'books' : 'courses';

// 文件树节点（V2 单层平铺；children 由前端逐层懒加载后填入）
export interface TreeNode {
  name: string;
  type: 'dir' | 'file';
  children?: TreeNode[];
  size?: number;
  mtime?: string;
}

// 教师类型
export interface Teacher {
  id: number;
  username: string;
}

// 课件（V2 /lessons 一行：目录名 + sb3 存在性，树另走 files?path=）
export interface Material {
  name: string;
  has_main?: boolean;
  has_student?: boolean;
  sb3_count?: number;
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
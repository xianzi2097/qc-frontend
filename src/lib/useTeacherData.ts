import { useState, useEffect, useCallback } from 'react';
import type { ApiClass } from '../components/teacher/types';
import { apiV2 } from './api';

interface TeacherData {
  classes: ApiClass[];
  loading: boolean;
  error: string;
  refresh: () => void;
}

/** V2 班级列表行与详情（§3.3：列表只有 student_count，学生在详情里） */
interface ClassListItem { id: string; name: string }
interface ClassDetail extends ClassListItem {
  students: { id: string; username: string; avatar_path?: string }[];
}

/** 教师看板数据 hook — 统一获取，支持手动刷新（V2：列表 + 逐班详情合并） */
export function useTeacherData(): TeacherData {
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    apiV2<{ items: ClassListItem[] }>('/api/classes')
      .then(async list => {
        // 全量拉详情（班少，spec §455 一次拉尽，点谁零请求）
        const details = await Promise.all(
          list.items.map(c => apiV2<ClassDetail>(`/api/classes/${c.id}`).catch(() => null)),
        );
        const transformed: ApiClass[] = details
          .filter((d): d is ClassDetail => d !== null)
          .map(d => ({
            class_name: d.name,
            students: d.students.map(s => ({
              id: s.id,
              username: s.username || '',
              name: s.username,        // V2 公开字段无 name → 显示名=username
              avatar_path: s.avatar_path || '',
              descriptors: {} as Record<string, unknown>,
            })),
          }));
        setClasses(transformed);
        setError('');
      })
      .catch(() => setError('无法连接后端服务器'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { classes, loading, error, refresh: fetchData };
}

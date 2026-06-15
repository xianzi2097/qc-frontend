import { useState, useEffect, useCallback } from 'react';
import type { ApiClass } from '../components/teacher/types';

interface TeacherData {
  classes: ApiClass[];
  loading: boolean;
  error: string;
  refresh: () => void;
}

/** 教师看板数据 hook — 统一获取，支持手动刷新 */
export function useTeacherData(username: string): TeacherData {
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/classes?username=${username}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          // 转换 classes.json 格式 → ApiClass 格式
          const transformed: ApiClass[] = (data.classes || []).map((c: any) => ({
            class_name: c.name,
            students: (c.students || []).map((s: any) => ({
              id: s.id,
              username: '',
              nickname: s.name,
              avatar_path: '',
              descriptors: {} as Record<string, unknown>,
            })),
          }));
          setClasses(transformed);
          setError('');
        } else {
          setError(data.detail || '加载失败');
        }
      })
      .catch(() => setError('无法连接后端服务器'))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { classes, loading, error, refresh: fetchData };
}

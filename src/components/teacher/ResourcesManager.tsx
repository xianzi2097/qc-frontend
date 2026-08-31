import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Plus, RefreshCw, Folder, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/useAuth';
import ResourceDetail from './ResourceDetail';

interface Resource {
  id: string;
  name: string;
  category: string;
  description: string;
  teacher: string;
  url: string;
  created_at: string;
}

const CATEGORIES = [
  { value: 'reference', label: '参考资料' },
  { value: 'download', label: '软件下载' },
];

export default function ResourcesManager() {
  const { token } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('reference');
  const [creating, setCreating] = useState(false);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/resources');
      const data = await res.json();
      setResources(data.resources || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/resources?name=${encodeURIComponent(newName.trim())}&category=${newCategory}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setShowCreate(false);
        setNewName('');
        fetchResources();
        if (data.resource) {
          setSelectedResource({
            ...data.resource,
            description: '',
            teacher: '',
            url: `/resources/${data.resource.id}/`,
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch { /* ignore */ }
    setCreating(false);
  };

  if (selectedResource) {
    return (
      <ResourceDetail
        resource={selectedResource}
        onBack={() => setSelectedResource(null)}
        onRefresh={fetchResources}
      />
    );
  }

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      <div className="flex items-center justify-between px-1 mb-4">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <FolderOpen className="text-brand-orange" size={20} /> 资源管理
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={fetchResources} className="p-2 text-slate-400 hover:text-white transition-colors" title="刷新">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all">
            <Plus size={16} /> 新建资源
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-600 rounded-2xl flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" /> 加载中...
          </div>
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <FolderOpen size={40} strokeWidth={1.2} className="mb-3 opacity-40" />
            <p className="text-sm">暂无资源</p>
            <p className="text-xs text-slate-600 mt-1">点击「新建资源」创建第一个资源</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {resources.map(r => (
              <button key={r.id} onClick={() => setSelectedResource(r)}
                      className="flex flex-col items-start gap-2 p-4 border border-slate-700 rounded-xl bg-slate-800/50 hover:border-brand-orange/50 hover:bg-slate-800 transition-all text-left group">
                <div className="flex items-center gap-2 w-full">
                  <Folder size={18} className="text-slate-400 group-hover:text-brand-orange transition-colors" />
                  <span className="text-sm font-medium text-slate-200 truncate flex-1">{r.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.category === 'download' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    {r.category === 'download' ? '软件下载' : '参考资料'}
                  </span>
                </div>
                {r.description && <p className="text-xs text-slate-500 line-clamp-2">{r.description}</p>}
                <div className="text-xs text-slate-600 w-full">
                  {r.teacher && <span>{r.teacher} · </span>}
                  {r.created_at && <span>{r.created_at.slice(0, 10)}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
             onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="bg-slate-900 border border-slate-600 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">新建资源</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">资源名称</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && handleCreate()}
                       placeholder="例：Python 参考资料、Scratch 安装包"
                       className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange"
                       autoFocus />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">类别</label>
                <div className="flex gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.value} onClick={() => setNewCategory(cat.value)}
                            className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                              newCategory === cat.value
                                ? 'bg-brand-orange text-white font-bold'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleCreate} disabled={creating || !newName.trim()}
                      className="w-full py-2.5 bg-brand-orange text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

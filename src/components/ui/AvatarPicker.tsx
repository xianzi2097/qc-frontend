import { useState } from 'react';

const AVATARS = [
  { bg: 'from-brand-orange to-amber-500', icon: '🦊' },
  { bg: 'from-blue-500 to-cyan-400', icon: '🐱' },
  { bg: 'from-green-500 to-emerald-400', icon: '🐸' },
  { bg: 'from-purple-500 to-pink-400', icon: '🐙' },
  { bg: 'from-red-500 to-rose-400', icon: '🐼' },
  { bg: 'from-cyan-500 to-teal-400', icon: '🐳' },
  { bg: 'from-yellow-500 to-orange-400', icon: '🦁' },
  { bg: 'from-indigo-500 to-violet-400', icon: '🐲' },
  { bg: 'from-pink-500 to-fuchsia-400', icon: '🦄' },
  { bg: 'from-teal-500 to-green-400', icon: '🐢' },
  { bg: 'from-violet-500 to-purple-400', icon: '🐝' },
  { bg: 'from-rose-500 to-red-400', icon: '🦀' },
];

interface Props {
  currentAvatar?: string;
  onSelect: (avatarId: string) => void;
  onClose: () => void;
}

export default function AvatarPicker({ currentAvatar, onSelect, onClose }: Props) {
  const [selected, setSelected] = useState(currentAvatar || '0');

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-white text-lg font-bold mb-4 text-center">选择头像</h3>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {AVATARS.map((a, i) => (
            <button
              key={i}
              onClick={() => setSelected(String(i))}
              className={`w-full aspect-square rounded-2xl bg-gradient-to-br ${a.bg} flex items-center justify-center text-2xl transition-all ${
                selected === String(i)
                  ? 'ring-2 ring-white scale-110 shadow-lg'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              {a.icon}
            </button>
          ))}
        </div>

        <div className="flex gap-2 justify-center">
          <button
            onClick={onClose}
            className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onSelect(selected)}
            className="text-sm bg-brand-orange hover:bg-brand-orange/90 text-black font-bold px-5 py-2 rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export { AVATARS };

export function getAvatarCfg() {
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    const idx = parseInt((user?.avatar_path || '').replace('avatar_', ''), 10);
    return AVATARS[isNaN(idx) ? 0 : idx % AVATARS.length];
  } catch { return AVATARS[0]; }
}

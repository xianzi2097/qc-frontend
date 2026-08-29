import { useState } from 'react';
import { X } from 'lucide-react';

const AVATARS = [
  { bg: 'from-brand to-amber-500', icon: '🦊' },
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
  { bg: 'from-amber-500 to-orange-400', icon: '🐶' },
  { bg: 'from-slate-400 to-gray-500', icon: '🐰' },
  { bg: 'from-orange-500 to-amber-600', icon: '🐹' },
  { bg: 'from-stone-500 to-stone-600', icon: '🦉' },
  { bg: 'from-fuchsia-500 to-pink-500', icon: '🦋' },
  { bg: 'from-sky-500 to-blue-600', icon: '🐬' },
  { bg: 'from-slate-500 to-slate-600', icon: '🐘' },
  { bg: 'from-yellow-400 to-amber-600', icon: '🦒' },
  { bg: 'from-zinc-400 to-gray-500', icon: '🐨' },
  { bg: 'from-rose-400 to-pink-500', icon: '🦩' },
  { bg: 'from-blue-600 to-indigo-500', icon: '🦸' },
  { bg: 'from-gray-600 to-slate-700', icon: '🤖' },
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
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(232,237,242,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="neo-modal"
        style={{ width: '28rem', maxWidth: '90vw', padding: '1.4rem 1.5rem 1.6rem' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部：左上方圆形关闭 + 右上保存 */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onClose}
            title="关闭"
            className="neo-close w-9 h-9"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSelect(selected)}
            className="neo-btn font-bold"
            style={{
              background: 'linear-gradient(145deg, #f7c08b, #e8914a)',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.55)',
            }}
          >
            保存
          </button>
        </div>

        <div className="grid grid-cols-5 gap-3 neo-scrollbar" style={{ maxHeight: '17rem', overflowY: 'auto' }}>
          {AVATARS.map((a, i) => {
            const isSel = selected === String(i);
            return (
              <button
                key={i}
                onClick={() => setSelected(String(i))}
                title={a.icon}
                className="aspect-square rounded-2xl flex items-center justify-center transition-all duration-150"
                style={{
                  background: 'var(--neo-bg)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  boxShadow: isSel
                    ? '0 0 0 3px var(--neo-bg), 0 0 0 6px rgba(46,139,87,0.85), 4px 4px 8px var(--neo-shadow-dark), -4px -4px 8px var(--neo-shadow-light)'
                    : '4px 4px 8px var(--neo-shadow-dark), -4px -4px 8px var(--neo-shadow-light)',
                  transform: 'scale(0.85)',
                  cursor: 'pointer',
                }}
              >
                <span
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${a.bg} flex items-center justify-center text-2xl select-none`}
                  style={{
                    boxShadow:
                      '0 3px 6px rgba(0,0,0,0.25), inset -2px -3px 4px rgba(0,0,0,0.18), inset 2px 3px 4px rgba(255,255,255,0.25)',
                  }}
                >
                  {a.icon}
                </span>
              </button>
            );
          })}
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

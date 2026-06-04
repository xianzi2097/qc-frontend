import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Rocket, Award, Home, Star, Shield, Box,
} from 'lucide-react';
import Notebook from './Notebook';
import { StarsBackground } from '../ui/StarsBackground';
import { FloatingDock } from '../ui/FloatingDock';
import { MovingBorderButton } from '../ui/moving-border';
import { SparklesCore } from '../ui/sparkles';
import { BackgroundBeams } from '../ui/background-beams';

interface PortalUser {
  username: string;
  role: string;
  nickname: string;
  avatar_path: string;
}

interface StudentDashboardProps {
  portalUser: PortalUser | null;
}

const MODULE_GLOW: Record<string, string> = {
  notebook: 'bg-[radial-gradient(#22d3ee_40%,transparent_60%)]',
  projects: 'bg-[radial-gradient(#a78bfa_40%,transparent_60%)]',
  badges: 'bg-[radial-gradient(#fb923c_40%,transparent_60%)]',
};

function StudentCard({ nickname, isDev }: { nickname: string; isDev: boolean }) {
  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-orange via-purple-500 to-cyan-400 flex items-center justify-center text-white font-black text-3xl shadow-[0_0_35px_rgba(249,115,22,0.4)] ring-2 ring-white/20">
          {nickname.charAt(0)}
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-geek-green border-[3px] border-cyber-bg shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
      </div>

      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-black text-white tracking-wide">
          {nickname}
          {isDev && (
            <span className="ml-2 text-[10px] bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded align-middle font-medium">DEV</span>
          )}
        </h1>
        <p className="text-sm text-slate-300 mt-0.5">少儿编程探索者</p>
      </div>

      <div className="flex items-center gap-6 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Star size={16} className="text-amber-400" />
          <span className="text-sm font-bold text-white">128</span>
          <span className="text-xs text-slate-400">积分</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <Shield size={16} className="text-purple-400" />
          <span className="text-sm font-bold text-white">5</span>
          <span className="text-xs text-slate-400">勋章</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <Box size={16} className="text-cyan-400" />
          <span className="text-sm font-bold text-white">12</span>
          <span className="text-xs text-slate-400">作品</span>
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard({ portalUser }: StudentDashboardProps) {
  const [activeModule, setActiveModule] = useState('notebook');
  const isDev = !portalUser;
  const username = portalUser?.username || 's';
  const nickname = portalUser?.nickname || '小极客';

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <StarsBackground />
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <BackgroundBeams />
      </div>

      <div className="relative z-10 flex-1 flex flex-col min-h-0">

        {/* 学生信息卡 */}
        <div className="px-8 pt-8 pb-4 flex-shrink-0 relative">
          <SparklesCore
            className="absolute inset-0 -top-2"
            background="transparent"
            minSize={0.8}
            maxSize={1.8}
            particleDensity={80}
            particleColor="#fb923c"
            speed={1.5}
          />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 rounded-2xl border border-white/20 bg-slate-900/70 backdrop-blur-sm px-6 py-4 shadow-[0_0_30px_rgba(0,0,0,0.3)]"
          >
            <StudentCard nickname={nickname} isDev={isDev} />
          </motion.div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto px-8 pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="h-full flex flex-col gap-4"
            >
              <MovingBorderButton
                borderRadius="1rem"
                duration={3500}
                containerClassName="h-auto w-full flex-shrink-0"
                className="flex items-center gap-4 px-5 py-4 text-left"
                as="div"
                borderClassName={MODULE_GLOW[activeModule] || MODULE_GLOW.notebook}
              >
                {activeModule === 'notebook' && <BookOpen size={28} className="text-cyan-400" />}
                {activeModule === 'projects' && <Rocket size={28} className="text-purple-400" />}
                {activeModule === 'badges' && <Award size={28} className="text-orange-400" />}
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {activeModule === 'notebook' && '笔记本'}
                    {activeModule === 'projects' && '作品仓'}
                    {activeModule === 'badges' && '勋章墙'}
                  </h2>
                  <p className="text-sm text-slate-300 mt-0.5">
                    {activeModule === 'notebook' && '知识笔记与灵感随记'}
                    {activeModule === 'projects' && '你的 Scratch 作品集'}
                    {activeModule === 'badges' && '成就与徽章收集'}
                  </p>
                </div>
              </MovingBorderButton>

              <div className="flex-1 rounded-2xl border border-white/20 bg-slate-900/80 backdrop-blur-sm overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.3)]">
                {activeModule === 'notebook' && <Notebook username={username} />}
                {activeModule === 'projects' && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Rocket size={72} className="mx-auto mb-5 text-slate-500" />
                      <p className="text-slate-300 text-lg mb-2 font-medium">作品仓 - 即将开放</p>
                      <p className="text-slate-400 text-sm">在这里展示你的所有 Scratch 作品</p>
                    </div>
                  </div>
                )}
                {activeModule === 'badges' && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Award size={72} className="mx-auto mb-5 text-slate-500" />
                      <p className="text-slate-300 text-lg mb-2 font-medium">勋章墙 - 即将开放</p>
                      <p className="text-slate-400 text-sm">收集成就徽章，展示你的编程里程碑</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dock：功能 | 首页 */}
        <div className="flex-shrink-0 flex justify-center pb-5 pt-2">
          <FloatingDock
            dividerAfter={2}
            items={[
              { title: '笔记本', icon: <BookOpen size={28} className={activeModule === 'notebook' ? 'text-cyan-400' : 'text-neutral-400'} />, onClick: () => setActiveModule('notebook'), isActive: activeModule === 'notebook' },
              { title: '作品仓', icon: <Rocket size={28} className={activeModule === 'projects' ? 'text-purple-400' : 'text-neutral-400'} />, onClick: () => setActiveModule('projects'), isActive: activeModule === 'projects' },
              { title: '勋章', icon: <Award size={28} className={activeModule === 'badges' ? 'text-orange-400' : 'text-neutral-400'} />, onClick: () => setActiveModule('badges'), isActive: activeModule === 'badges' },
              { title: '首页', icon: <Home size={28} className="text-neutral-400" />, onClick: () => { window.location.href = '/'; } },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, NotebookText, Rocket, Award, Home, Star, Shield, Box,
} from 'lucide-react';
import Notebook from './Notebook';
import { StarsBackground } from '../ui/StarsBackground';
import { FloatingDock } from '../ui/FloatingDock';
import { SparklesCore } from '../ui/sparkles';

interface PortalUser {
  username: string;
  role: string;
  nickname: string;
  avatar_path: string;
}

interface StudentDashboardProps {
  portalUser: PortalUser | null;
}

function StudentCard({ nickname, isDev }: { nickname: string; isDev: boolean }) {
  return (
    // 用 justify-end 让整块内容整体靠卡片的右侧对齐（如果你想靠左，改成 justify-start）
    <div className="flex items-center justify-end gap-8 w-full">
      
      {/* 1. 左边：统计数据一列（垂直排列 flex-col） */}
      <div className="flex flex-col gap-2 flex-shrink-0 text-right border-r border-white/10 pr-6">
        <div className="flex items-center gap-2 justify-end">
          <span className="text-xs text-slate-400">积分</span>
          <span className="text-sm font-black text-white font-mono">128</span>
          <Star size={14} className="text-amber-400" />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <span className="text-xs text-slate-400">勋章</span>
          <span className="text-sm font-black text-white font-mono">5</span>
          <Shield size={14} className="text-purple-400" />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <span className="text-xs text-slate-400">作品</span>
          <span className="text-sm font-black text-white font-mono">12</span>
          <Box size={14} className="text-cyan-400" />
        </div>
      </div>

      {/* 2. 右边：名字 + 头像 */}
      <div className="flex items-center gap-4 text-right flex-shrink-0">
        {/* 昵称和个签 */}
        <div className="min-w-0">
          <h1 className="text-lg font-black text-white tracking-wide flex items-center justify-end gap-2">
            {isDev && (
              <span className="text-[10px] bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded font-medium">DEV</span>
            )}
            {nickname}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">少儿编程探索者</p>
        </div>
        
        {/* 头像 */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-orange via-purple-500 to-cyan-400 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_35px_rgba(249,115,22,0.4)] ring-2 ring-white/25">
            {nickname.charAt(0)}
          </div>
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-geek-green border-[3px] border-cyber-bg shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
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

      <div className="relative z-10 flex-1 flex flex-col min-h-0">

        {/* 顶部：Dock（左）+ 信息卡（右） */}
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
            className="relative z-10"
          >
            <div className="flex items-center gap-3">
              <FloatingDock
              dividerAfter={1}
              items={[
                { title: '首页', icon: <Home size={36} className="text-neutral-400" />, onClick: () => { window.location.href = '/'; } },
                { title: '文档', icon: <BookOpen size={36} className="text-neutral-400" />, onClick: () => { window.location.href = window.location.origin.replace(':5173', '') + '/vitepress_dist/'; } },
                { title: '笔记本', icon: <NotebookText size={36} className={`transition-colors duration-[1000ms] ${activeModule === 'notebook' ? 'text-cyan-400' : 'text-neutral-500'}`} />, onClick: () => setActiveModule('notebook'), isActive: activeModule === 'notebook', activeBg: 'bg-cyan-500/10' },
                { title: '作品仓', icon: <Rocket size={36} className={`transition-colors duration-[1000ms] ${activeModule === 'projects' ? 'text-purple-400' : 'text-neutral-500'}`} />, onClick: () => setActiveModule('projects'), isActive: activeModule === 'projects', activeBg: 'bg-purple-500/10' },
                { title: '勋章', icon: <Award size={36} className={`transition-colors duration-[1000ms] ${activeModule === 'badges' ? 'text-orange-400' : 'text-neutral-500'}`} />, onClick: () => setActiveModule('badges'), isActive: activeModule === 'badges', activeBg: 'bg-orange-500/10' },
                ]}
              />
              <div className="flex-1">
                <StudentCard nickname={nickname} isDev={isDev} />
              </div>
            </div>
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
              className="h-full flex flex-col"
            >
              <div className="flex-1 rounded-2xl border border-white/25 bg-slate-900/80 backdrop-blur-sm overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.3)]">
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

      </div>
    </div>
  );
}

---
name: qx-dashboard
description: "Use when: working on qx-dashboard-ts (青橙后台看板), including React components, Tailwind v4 styling, build/deploy to qc-pocket-space, auth flow with localStorage, teacher/student role switching. Keywords: 看板, dashboard, 青橙, 后台, qx-dashboard, build, deploy, 部署, 登录, 角色."
---

# 青橙 Studio 后台看板

## 项目结构

```
labs_dev/qx-dashboard-ts/     ← React 源码（开发在这里）
  src/
    App.tsx                    ← 侧边栏 + 角色路由（读 localStorage.user.role）
    components/
      TeacherDashboard.tsx     ← 老师看板（卡片 + 学生表）
      StudentDashboard.tsx     ← 学生中心

qc-pocket-space/frontend/dashboard/  ← Vite build 自动输出到这里
qc-pocket-space/backend/main.py      ← FastAPI 后端（用户表、登录接口）
qc-pocket-space/frontend/portal/     ← 门户首页 + 登录页
```

## 关键技术约束

### Tailwind CSS v4
- ✅ `@import "tailwindcss";` — 原生模式
- ❌ `@import "tailwindcss" compat;` — **绝对禁止**，会把所有 utility 包在无效的 `@media compat {}` 里
- 自定义主题用 `@theme { --color-xxx: #xxx; }`
- 自定义动画直接写 CSS `@keyframes` + `.class`，不需要 `@layer`
- 第三方组件（React Bits、shadcn/ui）直接用，无需 compat

### 构建 & 部署
- `npx vite build` → 自动输出到 `../../qc-pocket-space/frontend/dashboard/`
- 开发时用 `npx vite --host`（`base: '/dashboard/'`）
- Caddy 已配置 `handle_path /dashboard/*`，build 后重启 Caddy 即可

### 认证流程
1. 用户在 `portal/login.html` 登录 → POST `/api/login`
2. 后端返回 `{ user: { username, role, nickname, avatar_path } }`
3. 前端存 `localStorage.setItem('user', JSON.stringify(result.user))`
4. React 看板启动时 `readPortalUser()` 读取 `localStorage.user.role`
5. `role === 'teacher'` → TeacherDashboard，否则 StudentDashboard
6. 没有 localStorage（本地开发）→ 显示调试开关手动切换

### 后端接口
- 后端：FastAPI，端口 8000
- 数据库：SQLite（`qingcheng.db`）
- 用户表 `users`：id, username, nickname, password, role, folder_path, avatar_path

## 代码规范
- React 19 + TypeScript + Vite 8
- 不用 `import React from 'react'`（React 19 JSX transform）
- 图标用 `lucide-react`
- 全局主题色：`brand-orange`(#f97316)、`geek-green`(#10b981)、`cyber-bg`(#020617)

## 架构设计

⚠️ **重要**：修改或新增组件前，务必先阅读 `ARCHITECTURE.md`，理解：
- 组件文件夹规范（每个功能模块一个文件夹）
- `--accent` 主题色变量规范（禁止硬编码颜色）
- 数据存储架构（DB vs 文件系统 vs JSON 扩展）
- 侧边栏模式设计

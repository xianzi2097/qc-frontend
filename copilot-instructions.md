# qx-dashboard-ts 项目指令

## 项目身份
这是「青橙 Studio」的 React + TypeScript 后台看板，和 `website/`（FastAPI + 静态门户）是同一套系统。

## 核心规则
- Tailwind CSS v4：只用 `@import "tailwindcss"`，禁用 `compat` 模式
- React 19：不需要 `import React`
- build 命令 `npx vite build` 直接输出到 `../website/site/dashboard/`
- 开发服务器 `npx vite --host`

## 角色认证
- 用户信息存在 `localStorage.user`（由门户登录页写入）
- `App.tsx` 的 `readPortalUser()` 读取 role 决定显示老师/学生看板

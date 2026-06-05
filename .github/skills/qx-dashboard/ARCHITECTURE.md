# 青橙 Studio 看板架构设计

## 核心原则：UI 组件结构 = 数据存储结构

**一个功能模块就是一个文件夹**，UI 结构和存储结构保持一致。

```
src/components/student/
  模块A/                    ← UI 侧边栏一个条目
    ├── 模块A.tsx            ← 主组件
    └── ...                  ← 子组件、工具函数
  模块B/                    ← UI 侧边栏另一个条目
    ├── 模块B.tsx
    └── ...
```

存储同理——学生的个人数据全部走**文件系统**，**一个模块一个文件夹**：

```
data/users/students/{username}/
  ├── info.json               ← 用户信息
  ├── sb3_projects/           ← 作品仓
  │   ├── project1.sb3
  │   └── project2.sb3
  └── notes/                  ← 笔记本
      ├── Python学习/          ← 笔记本 = 文件夹
      │   ├── 笔记1.md
      │   └── 笔记2.md
      └── Scratch学习/
          └── 循环.md
```

## 组件文件夹规范

### 什么时候拆成文件夹？
- ✅ 模块需要在侧边栏/导航 Dock 有一个独立条目 → 必须独立文件夹
- ✅ 模块内部有侧边栏结构（文件夹分类）→ 必须独立文件夹
- ✅ 模块需要自己的子组件 → 必须独立文件夹
- ❌ 简单的 UI 工具函数/小组件 → 放 `components/ui/`

### 文件夹命名
- 小写英文，语义明确
- 驼峰或全小写均可，保持项目内一致
- 示例：`notebook/`、`messages/`、`badges/`

### 主组件命名
- 和文件夹同名，大驼峰
- 示例：`messages/Messages.tsx`、`notebook/Notebook.tsx`

## 主题色统一：--accent 变量

### 原理
每个 Dock 模块有自己专属的主题色，通过 `--accent` CSS 变量传给子组件：

```tsx
// StudentDashboard.tsx
const moduleColor: Record<string, string> = {
  notebook: '#22d3ee',    // 青色
  messages: '#f97316',    // 橙色
  projects: '#a78bfa',    // 紫色
  badges: '#fb923c',      // 橙色
};

// 在内容区父元素上设置 --accent
<div style={{ '--accent': moduleColor[activeModule] } as React.CSSProperties}>
  {children}
</div>
```

### 子组件颜色规范
✅ **必须** 使用 `var(--accent)` 控制所有主题色：
- 标题高亮 → `style={{ color: 'var(--accent)' }}`
- 边框 → `style={{ borderColor: 'var(--accent)' }}` 或用 Tailwind 任意值
- 图标激活态 → `style={{ color: 'var(--accent)' }}`
- 背景点缀 → `style={{ backgroundColor: 'var(--accent)' }}`

❌ **禁止** 硬编码颜色：
- ❌ `text-cyan-400`、`text-purple-500`
- ❌ `bg-cyan-500/10`、`border-amber-500/30`
- ❌ 任何不跟随 `--accent` 变化的颜色类

例外：中性色（`text-slate-400`、`bg-slate-800`）和特殊功能色（`text-rose-500` 错误提示）可以保留。

### Dock 图标激活色
所有 Dock 图标激活时必须使用 `var(--accent)`：

```tsx
// ✅ 正确
<Mail size={36} style={isActive ? { color: 'var(--accent)' } : {}} className="text-neutral-500" />

// ❌ 错误
<Mail size={36} className={isActive ? 'text-cyan-400' : 'text-neutral-500'} />
```

## 数据存储架构

### 层次结构
```
DB（系统级：账号、密码、角色、课程）
  └─ 文件系统（用户级：笔记、作品、消息、头像）
       └─ JSON 扩展（qc_descriptors：弹性属性）
```

### 数据库（SQLite）
- 只存**系统管理需要**的数据：账号密码、角色、课程绑定
- 不存学生产生的内容（笔记、作品、消息）

### 文件系统
- 每个学生一个文件夹：`data/users/students/{username}/`
- 每个模块一个子文件夹
- **消息和笔记本一样，走文件系统，不进数据库**

### 消息存储（文件系统，和笔记本完全一致）
```
data/users/students/{username}/messages/    ← 消息根目录
  收件箱/                                    ← 文件夹（学生可自定义）
    welcome_1.json                           ← 每条消息一个 .json 文件
    scratch_tip.json
  Python课堂/
    20260606_t_001.json
```

每条消息的 JSON 格式：
```json
{
  "id": "welcome_1",
  "sender": "t",
  "subject": "欢迎来到青橙",
  "body": "Markdown 正文...",
  "created_at": "2026-06-06 01:26:51",
  "is_read": false
}
```

**消息发送流程（老师发 → 学生收）：**
1. 老师端 POST `/api/messages/send` → 后端 `_write_msg(recipient, folder, ...)` 
2. 直接在目标学生文件夹里写 `.json` 文件
3. 学生刷新/切换文件夹 → 扫描对应目录，列出所有 `.json`
4. **不需要轮询、不需要 WebSocket、不需要 DB 触发器** — 文件系统本身就是存储

### JSON 扩展（qc_descriptors）
- 学生属性不建新列，直接塞 JSON
- `qc_descriptors` 字段是万能口袋：班级、积分、勋章、等级、宠物等
- 新增属性无需改表结构

## 典型模块对照表

| 模块 | UI 组件位置 | 存储位置 | 存储方式 |
|------|-----------|---------|---------|
| 笔记本 | `student/notebook/` | `{user}/notes/{notebook}/{note}.md` | 文件 |
| 消息 | `student/messages/` | `{user}/messages/{folder}/{msg_id}.json` | 文件 |
| 作品仓 | `student/projects/` | `{user}/sb3_projects/*.sb3` | 文件 |
| 勋章 | `student/badges/` | `qc_descriptors.badges` | JSON |

## 侧边栏模式

需要侧边栏的模块（笔记本、消息），UI 结构：

```
┌──────────┬──────────────────────────┐
│ 文件夹列表 │        内容区              │
│          │                          │
│ 📁 收件箱 │  → 消息1                 │
│ 📁 课堂   │  → 消息2                 │
│ 📁 任务   │  → 消息3                 │
│          │                          │
└──────────┴──────────────────────────┘
```

左侧固定宽度（w-48），右侧自适应。
选中文件夹时通过 `activeFolder` 状态控制右侧内容。

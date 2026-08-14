# Better Next

基于 **Next.js 16** 的演示型后台管理系统。线上部署为**只读模式**（禁止业务写操作），用于演示现代全栈技术栈与 RBAC 权限架构。

## 技术栈

| 类别 | 选型 |
|---|---|
| 框架 | Next.js 16（App Router + Turbopack）· TypeScript 5 |
| 样式 | Tailwind CSS v4 · HeroUI v3 |
| 鉴权 | better-auth（email/password + 邮箱验证 + magic link + admin plugin）+ better-auth-ui（HeroUI 版） |
| 数据库 | Supabase（仅存储，无 RLS）· Drizzle ORM · postgres.js |
| 数据请求 | TanStack Query · @tanstack/react-table |
| 状态 | zustand（主题/语言） |
| i18n | 中英双语，Cookie 切换，默认中文；代码静态词条（150+，支持参数插值）+ 数据库动态词条双层；服务端错误返回错误码（error.E_*）由前端映射翻译 |
| Lint | eslint 10 · @antfu/eslint-config |
| 响应式 | 桌面侧边栏 + 移动端抽屉、表格横向滚动、操作区自动换行 |

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量（复制模板并按需修改）
# DATABASE_URL / BETTER_AUTH_SECRET / BETTER_AUTH_URL / APP_READONLY

# 3. 应用数据库迁移（表结构）
pnpm exec drizzle-kit migrate

# 4. 写入演示数据（幂等，可重复执行）
pnpm exec tsx scripts/seed.mts

# 5. 启动开发服务器
pnpm dev
# 打开 http://localhost:3000
```

## 演示账号

| 角色 | 邮箱 | 密码 | 权限 |
|---|---|---|---|
| 管理员 | `admin@example.com` | `Admin123456` | 全部菜单 + 按钮权限 |
| 普通用户 | `user@example.com` | `User123456` | 只读浏览（无写操作按钮） |

> 公开注册：任何人可在 `/auth/sign-up` 注册（better-auth 注册端口）。

## 功能模块

- **鉴权**：登录 / 注册 / 注销 / 忘记密码 / 重置密码 / 邮箱验证 / 魔法链接（better-auth-ui 全套）
- **系统管理**：
  - 用户管理：搜索/分页、新建、编辑、启停、重置密码、多角色分配
  - 菜单管理：树形 CRUD（目录/菜单/按钮三级），驱动动态侧边栏
  - 角色管理：CRUD + 菜单/按钮权限分配（多角色 RBAC，权限取并集）
  - 字典管理：字典类型 + 字典数据两级
  - 国际化：词条在线编辑（双层 i18n 动态加载）
  - 操作日志 / 登录日志：自动记录（增删改查 / 登录注册登出）
- **控制台**：占位页（此功能正在开发中...）

## 只读模式（线上）

线上环境设置 `APP_READONLY=true` 后：

- **middleware** 拦截所有非 GET 业务请求（`/api/auth/*` 登录/注册/登出放行），API 返回 `403` 统一 JSON
- 前端顶部显示「只读演示环境」横幅
- 本地开发不设置该变量，写操作正常

## 邮件服务（Resend + better-auth-ui 模板）

- 邮箱验证 / 魔法链接 / 重置密码邮件使用 **Resend** 真实发送
- 邮件模板使用 **better-auth-ui** 官方邮件组件（`@better-auth-ui/react/email`，HeroUI 品牌配色）
- **随语言自动切换**：better-auth 邮件回调携带请求上下文，从 `app-lang` cookie 读取语言；中文使用内置中文本地化文案，英文使用模板默认
- 环境变量：`RESEND_API_KEY`、`RESEND_FROM`（已验证域名发件地址，如 `no-reply@baiwumm.com`）
- 未配置 `RESEND_API_KEY` 时自动降级为控制台输出（开发兜底）

## 安全设计

- **不使用 Supabase RLS**：所有写操作在服务端（Route Handlers）做二次权限校验（`getCurrentUserPermissions` → 权限码）
- 多角色 RBAC：`user_role`（用户↔角色）、`role_menu`（角色↔菜单/按钮），admin 角色全权限
- 保护规则：内置角色不可删、不能删除/禁用自己的账号、不能移除自己的 admin 角色
- 登录守卫：`(dashboard)` 布局服务端 session 校验，未登录 307 → `/auth/sign-in`

## 目录结构

```
src/
  app/
    (dashboard)/         受保护布局（登录守卫 + 动态侧边栏 + 只读横幅）
      system/            系统管理（users/menus/roles/dicts/i18n/logs/login-logs）
    auth/                鉴权页面（better-auth-ui）
    api/
      auth/              better-auth 路由
      system/            业务 API（权限校验 + 操作日志）
      i18n/              动态词条读取
  components/            布局 + 各模块表格/表单
  i18n/                  静态词条（zh/en）
  lib/                   better-auth、i18n 服务端读取
  server/                数据层（db/schema/权限/日志/菜单树）
  store/                 zustand（主题/语言）
  middleware.ts          只读模式拦截
scripts/                 seed / 数据校验脚本
drizzle/                 迁移 SQL
```

## 常用命令

```bash
pnpm dev          # 开发
pnpm build        # 生产构建
pnpm lint         # eslint 检查
pnpm exec drizzle-kit generate   # 生成迁移
pnpm exec drizzle-kit migrate    # 应用迁移
pnpm exec tsx scripts/seed.mts   # 写入演示数据
node scripts/verify-seed.mjs     # 校验种子数据
```

> 详细需求与设计决策见 `docs/PROJECT_PLAN.md`，开发进度见 `docs/TODO.md`。

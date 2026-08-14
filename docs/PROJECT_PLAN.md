# 后台管理系统（演示项目）规划文档

> 状态：**需求对齐中，未开始开发**
> 定位：基于 Next.js 的演示型后台系统；线上部署为只读模式（禁止非 GET 请求），用于展示技术栈与架构。
> Supabase 仅提供数据库，**不使用 RLS**，安全全部由中间件与服务端代码保证。

---

## 1. 技术栈（版本已核对，均可安装）

| 类别 | 选择 | 版本 |
|---|---|---|
| 框架 | Next.js 16 + App Router | 16.3.0 |
| 语言 | TypeScript | 5.x |
| 样式 | Tailwind CSS v4 | 4.3.3 |
| 包管理 | pnpm | 11.21.0 |
| 组件库 | HeroUI v3（开发前安装官方 skill，按最新用法实施） | 3.2.4 |
| 图标 | lucide-react | 最新 |
| i18n | 中英双语，Cookie 切换，默认中文 | — |
| 表单 | 优先 HeroUI 内置组件 | — |
| 表格 | HeroUI Table + @tanstack/react-table | 最新 |
| 图表 | recharts（**暂缓**，见 §13 待确认） | 最新 |
| Lint | eslint 10 + `@antfu/eslint-config`（注意包名不是 `antfu-eslint-config`） | 10.8.1 / 9.3.0 |
| 数据库 | Supabase（仅存储） | — |
| ORM | Drizzle | 最新 |
| 鉴权 | better-auth + better-auth-ui（开发前安装官方 skill） | 1.6.27 |
| 请求 | TanStack Query | 最新 |
| 状态 | zustand | 最新 |

---

## 2. 功能清单

### 2.1 控制台
- 占位页面：仅显示「此功能正在开发中...」（用户指定，暂不做图表）

### 2.2 鉴权模块（全部使用 better-auth-ui 现成组件，无需任何第三方 API Key）

| 功能 | 组件 |
|---|---|
| 用户登录 | `<SignIn />` |
| 用户注册 | `<SignUp />`（公开注册，人人可注册） |
| 注销登录 | `<SignOut />`（置于顶栏用户菜单） |
| 忘记密码 | `<ForgotPassword />` |
| 重置密码 | `<ResetPassword />` |
| 邮箱验证 | `<VerifyEmail />` |
| 魔法链接登录 | `<MagicLink />` |

> 邮件发送（验证邮件 / 重置密码 / 魔法链接）：演示项目**不配置第三方邮件服务**，采用 better-auth 开发模式（控制台输出邮件内容），符合「不配 API Key」的要求。

### 2.3 系统管理

| 模块 | 功能点 |
|---|---|
| **用户管理** | 用户列表（搜索/分页）、新建用户、编辑资料、重置密码、启用/禁用、删除、分配角色；基于 better-auth admin plugin |
| **菜单管理** | 树形结构（目录 / 菜单 / 按钮 三级），增删改查、排序、显隐、状态；前端侧边栏由菜单数据动态渲染 |
| **角色管理** | 角色增删改查、分配菜单+按钮权限；内置角色 admin / user |
| **字典管理** | 字典类型 + 字典数据两级，用于下拉项等枚举数据的集中维护 |
| **国际化** | 在线管理翻译词条（key、中文、英文），前端动态加载合并 |
| **操作日志** | 业务增删改查日志：操作人、模块、动作、方法、路径、IP、UA、结果、详情 |
| **登录日志** | 登录/注册/登出记录：用户、方式（密码/魔法链接）、IP、UA、结果、时间 |

---

## 3. 权限模型

> **已确认：典型 RBAC 多角色模型。** 一个角色对应多个菜单/按钮权限，一个用户对应多个角色，用户最终权限 = 所属多个角色权限的**并集**，据此动态渲染菜单与按钮。

- **角色（role）**：内置 `admin`（全部权限）、`user`（只读）两个种子角色，可自定义新角色。
- **用户 ↔ 角色（多对多）**：`user_role` 关联表，一个用户可拥有多个角色。
- **角色 ↔ 菜单/按钮（多对多）**：`role_menu` 关联表，角色勾选可访问的菜单及按钮权限点（如 `system:user:create`、`system:user:delete`）。
- **权限合并**：用户所属所有角色的菜单 + 按钮权限取并集，作为该用户的最终权限集合。
- **校验层级（自前向后）**：
  1. 前端：根据菜单数据渲染侧边栏；根据按钮权限码控制按钮显隐。
  2. 中间件：登录态校验；只读模式拦截非 GET。
  3. 服务端（Server Actions / Route Handlers）：所有写操作二次校验角色权限码（**最终防线**，因无 RLS）。
- **数据权限**：不在演示范围内（仅菜单/按钮级权限）。

### 3.1 保护规则
- 内置 `admin` 角色不可删除、不可降级。
- 用户不能删除/禁用自己的账号；不能移除自己最后一个 admin 角色。
- 只读模式下写操作被中间件拦截，前端按钮保留、提交后由 Query 统一捕获错误并弹出提示，页面顶部显示「只读演示环境」横幅。

---

## 4. 数据库设计（Drizzle schema 草案）

### 4.1 better-auth 标准表（Drizzle adapter）
- `user`（扩展字段：`status` 启用/禁用；**不依赖单一 role 字段做权限**，权限来自 §4.2 的 `user_role` 关联）
- `session`、`account`、`verification`

### 4.2 业务表

**role（角色）**
| 字段 | 说明 |
|---|---|
| id | uuid |
| code | 角色编码（admin / user / 自定义） |
| name | 角色名称 |
| description | 描述 |
| builtin | 是否内置（内置不可删） |
| status / createdAt / updatedAt | — |

**menu（菜单）**
| 字段 | 说明 |
|---|---|
| id | uuid |
| parent_id | 父级（树形） |
| name | 名称 |
| path | 路由路径 |
| component | 前端组件 |
| icon | 图标名（lucide） |
| type | dir（目录）/ menu（菜单）/ button（按钮） |
| permission | 权限标识（按钮级，如 `system:user:create`） |
| sort / visible / status | 排序 / 显隐 / 状态 |
| i18n_key | 多语言 key（可选） |

**user_role（用户-角色关联）**：`user_id` + `role_id`（多角色）

**role_menu（角色-菜单关联）**：`role_id` + `menu_id`

**dict_type（字典类型）**：`code`、`name`、`status`、`remark`
**dict_data（字典数据）**：`type_id`、`label`、`value`、`sort`、`is_default`、`status`

**i18n_entry（国际化词条）**：`key`、`zh`、`en`、`module`（分组）、`status`

**login_log（登录日志）**：`user_id / username`、`type`（login/logout/register）、`method`（password/magic-link…）、`ip / user_agent`、`status`（成功/失败）、`detail`、`createdAt`

**operation_log（操作日志）**
| 字段 | 说明 |
|---|---|
| id | uuid |
| user_id / username | 操作人 |
| module | 模块（用户/菜单/角色/字典/国际化等） |
| action | 动作（create/update/delete…） |
| method / path | HTTP 方法 / 路径 |
| status | 成功/失败 |
| ip / user_agent | 来源信息 |
| detail | 详情（JSON，可选） |
| createdAt | 时间 |

> 日志拆分依据：登录/注册/登出 → `login_log`；业务增删改查 → `operation_log`（已确认，业内常见做法）。

---

## 5. 页面路由规划

```
鉴权页（路由以 better-auth-ui 官方约定为准，开发时读其 skill 文档）：
/sign-in              登录 <SignIn />
/sign-up              注册 <SignUp />
/forgot-password      忘记密码 <ForgotPassword />
/reset-password       重置密码 <ResetPassword />
/verify-email         邮箱验证 <VerifyEmail />
/magic-link           魔法链接 <MagicLink />

业务页：
/                     控制台（"此功能正在开发中..."占位）
/system/users         用户管理
/system/menus         菜单管理（树形）
/system/roles         角色管理
/system/dicts         字典管理
/system/i18n          国际化（词条管理）
/system/logs          操作日志
/system/login-logs    登录日志
```

布局：左侧边栏（由菜单数据动态渲染）+ 顶栏（语言切换、明暗主题切换、用户菜单）+ 内容区。

---

## 6. i18n 方案（双层）

1. **静态词条**：UI 骨架级翻译（导航、按钮、通用文案）放在代码内（`src/i18n/`，zh/en 字典），Cookie 切换、URL 不变、默认中文。
2. **动态词条**：业务/系统词条存 `i18n_entry` 表，后台「国际化」模块在线编辑；前端加载时从 API 拉取动态词条并与静态词条合并。
3. 服务端渲染与客户端统一从同一个读取逻辑获取，避免闪烁。

---

## 7. 中间件与安全

1. 未登录访问受保护页面 → 重定向 `/login`。
2. **只读模式**（`APP_READONLY=true`，线上开启）：所有非 GET 请求返回 403 + 统一提示；本地不设置即可写。
3. 角色/权限码校验在服务端执行（Server Actions / Route Handlers），前端显隐仅作体验优化。
4. 不启用 Supabase RLS，全部逻辑在应用层。

---

## 8. 环境变量

```env
# 用户已提供
DATABASE_URL="postgresql://postgres.dwazxgaauvrnfnetozui:JyakrfDHohbGth44@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
BETTER_AUTH_SECRET=16pLa06WvShdUFMYIYFSnVeDJI579YFV

# 待补充
BETTER_AUTH_URL=http://localhost:3000        # 本地；部署时改为线上域名
APP_READONLY=                                # 本地不设；线上设 true
NEXT_PUBLIC_APP_NAME=                        # 可选，站点名
```

> ⚠️ **安全提示**：以上两个变量含凭据，`.env.local` 必须加入 `.gitignore`；本文档若涉及提交公开仓库，需先移除敏感值。
>
> ℹ️ `6543` 是 Supabase **事务连接池（Transaction Pooler）** 端口，适合 Serverless/无状态场景；Drizzle 连接时需按 Supabase 要求处理 `sslmode`（通常 `sslmode=require` 或在连接串中追加）。

---

## 9. 目录结构草案

```
src/
  app/
    (auth)/login/  (auth)/register/
    (dashboard)/
      layout.tsx   page.tsx(控制台)
      system/users/  system/menus/  system/roles/  system/dicts/  system/i18n/  system/logs/
  components/       侧边栏、顶栏、主题切换、语言切换、表格、表单、页面骨架
  i18n/             静态字典 + 读取逻辑
  lib/              better-auth、drizzle、supabase、queryClient、权限工具
  server/           服务端数据操作（统一写操作 + 日志封装）
  store/            zustand（主题、语言、用户信息等）
  middleware.ts     登录态 + 只读拦截
drizzle/            schema.ts、migrations、seed.ts
```

---

## 10. 种子数据（seed 脚本）

- 内置角色：`admin`、`user`
- 默认菜单树（控制台 + 系统管理七模块：用户/菜单/角色/字典/国际化/操作日志/登录日志，含按钮权限点）
- 字典示例：用户状态、角色状态等
- i18n 词条示例若干
- 管理员账号（admin）+ 一批示例用户
- 示例操作日志（可选，便于演示列表）

---

## 11. 开发顺序

1. 安装 HeroUI v3 skill、better-auth skill → 按其最新用法实施
2. `pnpm init` + 依赖安装 + Tailwind v4 + antfu eslint 配置
3. Drizzle schema + 迁移 + seed
4. better-auth（启用 emailAndPassword / emailVerification / magicLink 等插件）+ better-auth-ui 全套组件（登录/注册/注销/忘记密码/重置密码/邮箱验证/魔法链接）
5. i18n 骨架 + 布局骨架（侧边栏/顶栏/明暗主题）
6. 用户管理 → 角色管理 → 菜单管理（含动态侧边栏）→ 字典 → 国际化 → 操作日志 → 控制台占位
7. 中间件只读拦截 + 环境变量 + 全局错误提示

---

## 12. 已确认 & 待确认

### 已确认
- [x] recharts 暂缓，后续需要再装
- [x] 多角色 RBAC：用户↔角色多对多，角色↔菜单/按钮多对多，权限取并集后动态渲染菜单和按钮
- [x] 保留公开注册（better-auth 注册端口，人人可注册）
- [x] 日志拆分：登录日志 + 操作日志（分开记录、分开页面）
- [x] 鉴权全套使用 better-auth-ui 现成组件（SignIn / SignUp / SignOut / ForgotPassword / ResetPassword / VerifyEmail / MagicLink），不配置任何第三方 API Key
- [x] 侧边栏由数据库菜单数据动态渲染（由「菜单管理」驱动）

- [x] 国际化：采用「代码静态词条 + 数据库动态词条」双层方案（前端合并加载，后台可在线编辑）
- [x] 环境变量：开工时把 `DATABASE_URL` / `BETTER_AUTH_SECRET` 写入本地 `.env.local`，并加入 `.gitignore`

---

## 13. 风险与注意点

- **Next.js 16 + HeroUI v3（beta）**：以官方 skill 文档为准，版本间 API 可能有差异。
- **better-auth admin plugin**：用户管理走官方 admin API，需确认其与 Drizzle adapter、多租户无关配置的正确组合。
- **只读模式**：需保证拦截逻辑覆盖 Server Actions 与 Route Handlers 两种写入口。
- **Supabase Pooler**：注意事务池连接数限制与 `sslmode` 参数。
- 演示项目不启用 RLS：**所有写操作必须做服务端权限校验**，中间件只读拦截不能替代业务校验。
- 邮箱验证 / 忘记密码 / 魔法链接依赖邮件发送：演示环境用开发模式（控制台输出邮件），不接第三方邮件服务；不影响登录注册流程演示。

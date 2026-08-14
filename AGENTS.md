# AGENTS.md — Better Next

## 组件实现规则（必须遵守）

**所有功能一律以 HeroUI v3 组件实现优先；HeroUI 组件不支持的场景，才允许自行实现。**

1. **优先选用 HeroUI v3**：按钮、表单、表格（Table + @tanstack/react-table）、弹窗（Modal）、抽屉（Drawer）、提示、菜单、下拉、布局等，先查 HeroUI v3 是否有现成组件（参考 `heroui-react` skill 与 `heroui-react-mcp` 文档），有就用。
2. **鉴权相关实现以 Better-Auth-UI 组件优先**：登录 `<SignIn />`、注册 `<SignUp />`、注销 `<SignOut />`、忘记密码 `<ForgotPassword />`、重置密码 `<ResetPassword />`、邮箱验证 `<VerifyEmail />`、魔法链接 `<MagicLink />`、用户菜单 `<UserButton />` 等一律优先使用 better-auth-ui 现成组件（参考 `better-auth` 相关 skills 的最新用法）；better-auth-ui 不覆盖的能力（自定义字段表单、扩展校验等）才自行实现并在注释中注明原因。
3. **自行实现的条件**：仅当 HeroUI / better-auth-ui 组件确实不支持（无对应组件、或无法满足交互需求）时，才手写实现；**必须在代码注释中注明原因**（如 `// HeroUI 无 X 组件，自行实现`），方便后续替换。
4. **第三方组件**：HeroUI 不覆盖的能力（图表 recharts、日期、虚拟滚动等）按既定技术栈选型，不重复造轮子。
5. **保持风格一致**：自行实现的 UI 也要使用 HeroUI 的样式令牌（bg-background / bg-default / text-foreground 等）与 Tailwind v4 类，避免风格割裂。

> 示例：移动端侧边栏抽屉使用 HeroUI v3 `Drawer`（`placement="left"` + `Backdrop`），桌面端保持静态侧边栏；面包屑、加载占位等暂无 HeroUI 对应组件时按需自行实现并注明原因。

## 技术栈速览

- Next.js 16 App Router + TypeScript 5 + Tailwind v4 + pnpm
- UI：HeroUI v3（组件优先）+ lucide-react 图标
- 鉴权：better-auth + better-auth-ui（官方组件优先）；数据库：Supabase（仅存储，无 RLS）+ Drizzle
- 请求：TanStack Query；状态：zustand；i18n：中英双语双层词条（静态 + 数据库动态）
- Lint：eslint 10 + @antfu/eslint-config

## 关键约定

- 只读演示模式：`APP_READONLY=true` 时中间件拦截所有非 GET 业务请求（`/api/auth` 放行）
- 服务端错误返回错误码（`error.E_*`），前端 `errMsg()` 按语言映射翻译
- 所有写操作必须做服务端权限校验（多角色 RBAC 权限并集），中间件拦截不能替代业务校验
- 详细规划见 `docs/PROJECT_PLAN.md`，任务状态见 `docs/TODO.md`

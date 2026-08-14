/**
 * Seed 脚本：初始化演示数据
 * 运行：node scripts/seed.ts
 * 幂等：业务表先清空再插入；用户按 email 去重（已存在则跳过）
 */
import postgres from 'postgres'

process.loadEnvFile('.env.local')

const { db, client: dbClient } = await import('../src/server/db')
const {
  role,
  menu,
  userRole,
  roleMenu,
  dictType,
  dictData,
  i18nEntry,
  loginLog,
  operationLog,
} = await import('../src/server/db/schema')
const { auth } = await import('../src/lib/auth')

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

// ---------- 1. 清空业务表（保持幂等） ----------
console.log('[seed] clearing tables...')
await db.delete(roleMenu)
await db.delete(userRole)
await db.delete(menu)
await db.delete(role)
await db.delete(dictData)
await db.delete(dictType)
await db.delete(i18nEntry)
await db.delete(loginLog)
await db.delete(operationLog)
console.log('[seed] tables cleared')

// ---------- 2. 内置角色 ----------
console.log('[seed] inserting roles...')
const [adminRole, userRoleRow] = await db
  .insert(role)
  .values([
    { code: 'admin', name: '管理员', description: '系统内置：拥有全部权限', builtin: true },
    { code: 'user', name: '普通用户', description: '系统内置：只读浏览权限', builtin: true },
  ])
  .returning()

// ---------- 3. 默认菜单树 ----------
console.log('[seed] inserting menus...')
const [dashboardMenu] = await db
  .insert(menu)
  .values([
    {
      name: '控制台',
      path: '/',
      component: 'app/page',
      icon: 'layout-dashboard',
      type: 'menu',
      sort: 1,
      i18nKey: 'menu.dashboard',
    },
  ])
  .returning()

const [systemDir] = await db
  .insert(menu)
  .values([
    {
      name: '系统管理',
      path: '/system',
      icon: 'settings',
      type: 'dir',
      sort: 2,
      i18nKey: 'menu.system',
    },
  ])
  .returning()

// 系统管理子菜单 + 按钮权限点
const subMenus = [
  {
    name: '用户管理',
    path: '/system/users',
    icon: 'users',
    type: 'menu',
    sort: 1,
    i18nKey: 'menu.users',
    buttons: [
      { name: '新增用户', permission: 'system:user:create' },
      { name: '编辑用户', permission: 'system:user:update' },
      { name: '删除用户', permission: 'system:user:delete' },
      { name: '分配角色', permission: 'system:user:assign-role' },
    ],
  },
  {
    name: '菜单管理',
    path: '/system/menus',
    icon: 'menu',
    type: 'menu',
    sort: 2,
    i18nKey: 'menu.menus',
    buttons: [
      { name: '新增菜单', permission: 'system:menu:create' },
      { name: '编辑菜单', permission: 'system:menu:update' },
      { name: '删除菜单', permission: 'system:menu:delete' },
    ],
  },
  {
    name: '角色管理',
    path: '/system/roles',
    icon: 'shield-check',
    type: 'menu',
    sort: 3,
    i18nKey: 'menu.roles',
    buttons: [
      { name: '新增角色', permission: 'system:role:create' },
      { name: '编辑角色', permission: 'system:role:update' },
      { name: '删除角色', permission: 'system:role:delete' },
      { name: '分配权限', permission: 'system:role:assign-permission' },
    ],
  },
  {
    name: '字典管理',
    path: '/system/dicts',
    icon: 'book-open',
    type: 'menu',
    sort: 4,
    i18nKey: 'menu.dicts',
    buttons: [
      { name: '新增字典', permission: 'system:dict:create' },
      { name: '编辑字典', permission: 'system:dict:update' },
      { name: '删除字典', permission: 'system:dict:delete' },
    ],
  },
  {
    name: '国际化',
    path: '/system/i18n',
    icon: 'languages',
    type: 'menu',
    sort: 5,
    i18nKey: 'menu.i18n',
    buttons: [
      { name: '新增词条', permission: 'system:i18n:create' },
      { name: '编辑词条', permission: 'system:i18n:update' },
      { name: '删除词条', permission: 'system:i18n:delete' },
    ],
  },
  {
    name: '操作日志',
    path: '/system/logs',
    icon: 'file-text',
    type: 'menu',
    sort: 6,
    i18nKey: 'menu.logs',
    buttons: [],
  },
  {
    name: '登录日志',
    path: '/system/login-logs',
    icon: 'log-in',
    type: 'menu',
    sort: 7,
    i18nKey: 'menu.loginLogs',
    buttons: [],
  },
]

const insertedMenus = []
for (const sub of subMenus) {
  const [m] = await db
    .insert(menu)
    .values({
      name: sub.name,
      path: sub.path,
      icon: sub.icon,
      type: sub.type,
      sort: sub.sort,
      i18nKey: sub.i18nKey,
      parentId: systemDir.id,
    })
    .returning()
  insertedMenus.push({ id: m.id, ...sub })
}

// 全部菜单 id（含按钮）供 admin 使用
const allMenuIds = [dashboardMenu.id, systemDir.id, ...insertedMenus.map(m => m.id)]
const buttonMenuIds = []
for (const sub of insertedMenus) {
  for (const btn of sub.buttons) {
    const [b] = await db
      .insert(menu)
      .values({
        name: btn.name,
        type: 'button',
        permission: btn.permission,
        parentId: sub.id,
        sort: 0,
      })
      .returning()
    buttonMenuIds.push(b.id)
  }
}

// ---------- 4. 角色-菜单分配 ----------
// admin：全部菜单（目录/菜单/按钮）
await db.insert(roleMenu).values([
  ...allMenuIds.map(menuId => ({ roleId: adminRole.id, menuId })),
  ...buttonMenuIds.map(menuId => ({ roleId: adminRole.id, menuId })),
])

// user：仅控制台 + 系统管理目录/子菜单（不含按钮权限点）→ 只读
await db.insert(roleMenu).values([
  { roleId: userRoleRow.id, menuId: dashboardMenu.id },
  { roleId: userRoleRow.id, menuId: systemDir.id },
  ...insertedMenus.map(m => ({ roleId: userRoleRow.id, menuId: m.id })),
])

// ---------- 5. 字典 ----------
const dictSeed = [
  {
    code: 'user_status',
    name: '用户状态',
    items: [
      { label: '启用', value: 'active' },
      { label: '禁用', value: 'disabled' },
    ],
  },
  {
    code: 'role_status',
    name: '角色状态',
    items: [
      { label: '启用', value: 'active' },
      { label: '禁用', value: 'disabled' },
    ],
  },
  {
    code: 'menu_type',
    name: '菜单类型',
    items: [
      { label: '目录', value: 'dir' },
      { label: '菜单', value: 'menu' },
      { label: '按钮', value: 'button' },
    ],
  },
  {
    code: 'log_type',
    name: '日志类型',
    items: [
      { label: '登录', value: 'login' },
      { label: '登出', value: 'logout' },
      { label: '注册', value: 'register' },
    ],
  },
]

for (const d of dictSeed) {
  const [t] = await db.insert(dictType).values({ code: d.code, name: d.name }).returning()
  await db.insert(dictData).values(d.items.map((item, i) => ({
    typeId: t.id,
    label: item.label,
    value: item.value,
    sort: i,
    isDefault: i === 0,
  })))
}

// ---------- 6. i18n 词条示例 ----------
const i18nSeed = [
  { key: 'menu.dashboard', zh: '控制台', en: 'Dashboard', module: 'menu' },
  { key: 'menu.system', zh: '系统管理', en: 'System', module: 'menu' },
  { key: 'menu.users', zh: '用户管理', en: 'Users', module: 'menu' },
  { key: 'menu.menus', zh: '菜单管理', en: 'Menus', module: 'menu' },
  { key: 'menu.roles', zh: '角色管理', en: 'Roles', module: 'menu' },
  { key: 'menu.dicts', zh: '字典管理', en: 'Dicts', module: 'menu' },
  { key: 'menu.i18n', zh: '国际化', en: 'i18n', module: 'menu' },
  { key: 'menu.logs', zh: '操作日志', en: 'Operation Logs', module: 'menu' },
  { key: 'menu.loginLogs', zh: '登录日志', en: 'Login Logs', module: 'menu' },
  { key: 'common.search', zh: '搜索', en: 'Search', module: 'common' },
  { key: 'common.create', zh: '新增', en: 'Create', module: 'common' },
  { key: 'common.edit', zh: '编辑', en: 'Edit', module: 'common' },
  { key: 'common.delete', zh: '删除', en: 'Delete', module: 'common' },
]
await db.insert(i18nEntry).values(i18nSeed)

// ---------- 7. 演示账号 ----------
const ctx = await auth.$context
const accounts = [
  { name: '系统管理员', email: 'admin@example.com', password: 'Admin123456', roleId: adminRole.id },
  { name: '演示用户', email: 'user@example.com', password: 'User123456', roleId: userRoleRow.id },
  { name: '张三', email: 'zhangsan@example.com', password: 'User123456', roleId: userRoleRow.id },
  { name: '李四', email: 'lisi@example.com', password: 'User123456', roleId: userRoleRow.id },
  { name: '王五', email: 'wangwu@example.com', password: 'User123456', roleId: userRoleRow.id },
]

for (const acc of accounts) {
  const existed = await sql`select id from "user" where email = ${acc.email}`
  let userId: string
  if (existed.length > 0) {
    userId = existed[0].id as string
    console.log(`  skip existing user: ${acc.email}`)
  }
  else {
    const passwordHash = await ctx.password.hash(acc.password)
    const [u] = await sql`
      insert into "user" (id, name, email, email_verified, role, created_at, updated_at)
      values (${crypto.randomUUID()}, ${acc.name}, ${acc.email}, true, ${acc.email === 'admin@example.com' ? 'admin' : 'user'}, now(), now())
      returning id
    `
    userId = u.id as string
    await sql`
      insert into "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
      values (${crypto.randomUUID()}, ${u.id}, 'credential', ${u.id}, ${passwordHash}, now(), now())
    `
    console.log(`  created user: ${acc.email}`)
  }
  // 幂等：确保用户-角色关联存在（跳过分支也会补齐）
  const [rel] = await sql`
    select 1 from user_role where user_id = ${userId} and role_id = ${acc.roleId}
  `
  if (!rel) {
    await db.insert(userRole).values({ userId, roleId: acc.roleId })
    console.log(`  linked role for: ${acc.email}`)
  }
}

await sql.end()
await dbClient.end()
console.log('\n✅ Seed 完成！')
console.log('   管理员：admin@example.com / Admin123456')
console.log('   普通用户：user@example.com / User123456')

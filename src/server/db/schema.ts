import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth-schema'

// better-auth 标准表：本地绑定（外键引用）+ re-export 供 drizzle-kit 解析
export { account, session, user, verification } from './auth-schema'

// ========== RBAC：角色 ==========
export const role = pgTable('role', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  builtin: boolean('builtin').default(false).notNull(),
  status: text('status').default('active').notNull(), // active | disabled
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
})

// ========== RBAC：菜单（目录 / 菜单 / 按钮） ==========
export const menu = pgTable('menu', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id').references((): AnyPgColumn => menu.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  path: text('path'),
  component: text('component'),
  icon: text('icon'),
  type: text('type').default('menu').notNull(), // dir | menu | button
  permission: text('permission'), // 按钮权限标识，如 system:user:create
  sort: integer('sort').default(0).notNull(),
  visible: boolean('visible').default(true).notNull(),
  status: text('status').default('active').notNull(),
  i18nKey: text('i18n_key'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
})

// ========== RBAC：用户-角色（多对多，多角色） ==========
export const userRole = pgTable(
  'user_role',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [primaryKey({ columns: [table.userId, table.roleId] })],
)

// ========== RBAC：角色-菜单（多对多，含按钮权限点） ==========
export const roleMenu = pgTable(
  'role_menu',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    menuId: uuid('menu_id')
      .notNull()
      .references(() => menu.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [primaryKey({ columns: [table.roleId, table.menuId] })],
)

// ========== 字典：类型 + 数据 ==========
export const dictType = pgTable('dict_type', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  status: text('status').default('active').notNull(),
  remark: text('remark'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
})

export const dictData = pgTable('dict_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  typeId: uuid('type_id')
    .notNull()
    .references(() => dictType.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  value: text('value').notNull(),
  sort: integer('sort').default(0).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
})

// ========== 国际化：动态词条 ==========
export const i18nEntry = pgTable('i18n_entry', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  zh: text('zh'),
  en: text('en'),
  module: text('module'), // 分组：common / menu / system
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
})

// ========== 登录日志 ==========
export const loginLog = pgTable('login_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  username: text('username'),
  type: text('type').notNull(), // login | logout | register
  method: text('method'), // password | magic-link | email-verification
  ip: text('ip'),
  userAgent: text('user_agent'),
  status: text('status').default('success').notNull(), // success | failed
  detail: text('detail'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ========== 操作日志（业务增删改查） ==========
export const operationLog = pgTable('operation_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  username: text('username'),
  module: text('module').notNull(), // user | menu | role | dict | i18n ...
  action: text('action').notNull(), // create | update | delete | ...
  method: text('method'), // POST | PUT | DELETE
  path: text('path'),
  status: text('status').default('success').notNull(), // success | failed
  ip: text('ip'),
  userAgent: text('user_agent'),
  detail: text('detail'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ========== Relations ==========
export const userRoleRelations = relations(userRole, ({ one }) => ({
  user: one(user, {
    fields: [userRole.userId],
    references: [user.id],
  }),
  role: one(role, {
    fields: [userRole.roleId],
    references: [role.id],
  }),
}))

export const roleMenuRelations = relations(roleMenu, ({ one }) => ({
  role: one(role, {
    fields: [roleMenu.roleId],
    references: [role.id],
  }),
  menu: one(menu, {
    fields: [roleMenu.menuId],
    references: [menu.id],
  }),
}))

export const menuRelations = relations(menu, ({ one, many }) => ({
  parent: one(menu, {
    fields: [menu.parentId],
    references: [menu.id],
  }),
  children: many(menu),
  roleMenus: many(roleMenu),
}))

export const roleRelations = relations(role, ({ many }) => ({
  userRoles: many(userRole),
  roleMenus: many(roleMenu),
}))

export const dictTypeRelations = relations(dictType, ({ many }) => ({
  dictData: many(dictData),
}))

export const dictDataRelations = relations(dictData, ({ one }) => ({
  type: one(dictType, {
    fields: [dictData.typeId],
    references: [dictType.id],
  }),
}))

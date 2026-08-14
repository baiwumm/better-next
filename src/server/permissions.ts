import type { MenuTreeNode } from '@/server/menu-tree'
import { and, eq, inArray } from 'drizzle-orm'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/server/db'
import { menu, role, roleMenu, userRole } from '@/server/db/schema'
import { buildMenuTree } from '@/server/menu-tree'

export interface PermissionResult {
  userId: string | null
  username: string | null
  permissions: string[]
}

/**
 * 计算当前请求用户的权限集合：
 * - admin 角色 → 全权限（['*']）
 * - 否则：所属角色（多对多）的 role_menu 中按钮类型权限码并集
 */
export async function getCurrentUserPermissions(): Promise<PermissionResult> {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session)
    return { userId: null, username: null, permissions: [] }

  const userId = session.user.id
  const username = session.user.name

  const userRoles = await db
    .select({ roleId: userRole.roleId })
    .from(userRole)
    .where(eq(userRole.userId, userId))

  const roleIds = userRoles.map(r => r.roleId)
  if (roleIds.length === 0)
    return { userId, username, permissions: [] }

  const roles = await db
    .select({ code: role.code })
    .from(role)
    .where(inArray(role.id, roleIds))

  if (roles.some(r => r.code === 'admin'))
    return { userId, username, permissions: ['*'] }

  const roleMenus = await db
    .select({ menuId: roleMenu.menuId })
    .from(roleMenu)
    .where(inArray(roleMenu.roleId, roleIds))

  const menuIds = roleMenus.map(m => m.menuId)
  if (menuIds.length === 0)
    return { userId, username, permissions: [] }

  const buttons = await db
    .select({ permission: menu.permission })
    .from(menu)
    .where(and(inArray(menu.id, menuIds), eq(menu.type, 'button')))

  return {
    userId,
    username,
    permissions: buttons.filter(b => b.permission).map(b => b.permission as string),
  }
}

export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes('*') || permissions.includes(required)
}

/**
 * 当前用户可见的导航菜单树（dir/menu 类型）：
 * - admin → 全部可见菜单
 * - 其他 → 所属角色 role_menu 关联的菜单
 */
export async function getCurrentUserMenus(): Promise<MenuTreeNode[]> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session)
    return []

  const userRoles = await db
    .select({ roleId: userRole.roleId })
    .from(userRole)
    .where(eq(userRole.userId, session.user.id))

  const roleIds = userRoles.map(r => r.roleId)
  if (roleIds.length === 0)
    return []

  const roles = await db
    .select({ code: role.code })
    .from(role)
    .where(inArray(role.id, roleIds))

  const tree = await buildMenuTree()

  if (roles.some(r => r.code === 'admin'))
    return tree

  const roleMenus = await db
    .select({ menuId: roleMenu.menuId })
    .from(roleMenu)
    .where(inArray(roleMenu.roleId, roleIds))

  const allowedIds = new Set(roleMenus.map(m => m.menuId))

  const filterTree = (nodes: MenuTreeNode[]): MenuTreeNode[] =>
    nodes
      .filter(n => allowedIds.has(n.id))
      .map(n => ({ ...n, children: filterTree(n.children) }))

  return filterTree(tree)
}

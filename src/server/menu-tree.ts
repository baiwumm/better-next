import { asc } from 'drizzle-orm'
import { db } from '@/server/db'
import { menu } from '@/server/db/schema'

export type MenuType = 'dir' | 'menu' | 'button'

export interface MenuTreeNode {
  id: string
  name: string
  path: string | null
  icon: string | null
  type: MenuType
  permission: string | null
  sort: number
  visible: boolean
  status: string
  i18nKey: string | null
  parentId: string | null
  children: MenuTreeNode[]
}

/** 将菜单扁平行组装为树（按 sort 排序） */
export async function buildMenuTree(): Promise<MenuTreeNode[]> {
  const rows = await db.select().from(menu).orderBy(asc(menu.sort), asc(menu.createdAt))

  const map = new Map<string, MenuTreeNode>()
  for (const row of rows) {
    map.set(row.id, {
      id: row.id,
      name: row.name,
      path: row.path,
      icon: row.icon,
      type: row.type as MenuType,
      permission: row.permission,
      sort: row.sort,
      visible: row.visible,
      status: row.status,
      i18nKey: row.i18nKey,
      parentId: row.parentId,
      children: [],
    })
  }

  const roots: MenuTreeNode[] = []
  for (const row of rows) {
    const node = map.get(row.id)!
    if (row.parentId && map.has(row.parentId))
      map.get(row.parentId)!.children.push(node)
    else
      roots.push(node)
  }
  return roots
}

import type { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { menu } from '@/server/db/schema'
import { logOperation } from '@/server/log'
import { getCurrentUserPermissions, hasPermission } from '@/server/permissions'

export const dynamic = 'force-dynamic'

// 收集节点及其子孙 id（用于环形引用检查）
function collectIds(node: typeof menu.$inferSelect, all: Array<typeof menu.$inferSelect>): string[] {
  const children = all.filter(m => m.parentId === node.id)
  return [node.id, ...children.flatMap(c => collectIds(c, all))]
}

// PUT /api/system/menus/[id] → 更新菜单（防止环形引用）
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:menu:update')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)

  const [existing] = await db.select().from(menu).where(eq(menu.id, id))
  if (!existing) {
    return NextResponse.json({ error: 'E_MENU_NOT_FOUND' }, { status: 404 })
  }

  const { name, path, icon, type, permission, sort, visible, status, parentId, i18nKey } = body ?? {}

  // 防止把父级挂到自己或自己的子孙下（环形引用）
  if (parentId && parentId !== id) {
    const all = await db.select().from(menu)
    const self = all.find(m => m.id === id)
    if (self) {
      const descendants = collectIds(self, all)
      if (descendants.includes(parentId)) {
        return NextResponse.json({ error: 'E_MENU_CYCLE' }, { status: 400 })
      }
    }
  }

  const data: Partial<typeof menu.$inferSelect> = {}
  if (typeof name === 'string' && name.trim())
    data.name = name.trim()
  if (typeof path === 'string')
    data.path = path
  if (typeof icon === 'string')
    data.icon = icon
  if (type === 'dir' || type === 'menu' || type === 'button')
    data.type = type
  if (typeof permission === 'string')
    data.permission = permission
  if (typeof sort === 'number')
    data.sort = sort
  if (typeof visible === 'boolean')
    data.visible = visible
  if (status === 'active' || status === 'disabled')
    data.status = status
  if (typeof i18nKey === 'string')
    data.i18nKey = i18nKey
  if (parentId === null)
    data.parentId = null
  else if (parentId && parentId !== id)
    data.parentId = parentId

  await db.update(menu).set(data).where(eq(menu.id, id))
  await logOperation({ module: 'menu', action: 'update', method: 'PUT', path: req.nextUrl.pathname, detail: JSON.stringify(data), userId, username })
  return NextResponse.json({ ok: true })
}

// DELETE /api/system/menus/[id] → 删除菜单（有子菜单时拒绝）
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:menu:delete')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { id } = await ctx.params
  const [existing] = await db.select().from(menu).where(eq(menu.id, id))
  if (!existing) {
    return NextResponse.json({ error: 'E_MENU_NOT_FOUND' }, { status: 404 })
  }

  const children = await db.select({ id: menu.id }).from(menu).where(eq(menu.parentId, id))
  if (children.length > 0) {
    return NextResponse.json({ error: 'E_MENU_HAS_CHILDREN' }, { status: 400 })
  }

  await db.delete(menu).where(eq(menu.id, id))
  await logOperation({ module: 'menu', action: 'delete', method: 'DELETE', path: req.nextUrl.pathname, userId, username })
  return NextResponse.json({ ok: true })
}

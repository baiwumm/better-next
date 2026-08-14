import type { NextRequest } from 'next/server'
import { eq, inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { role, roleMenu } from '@/server/db/schema'
import { logOperation } from '@/server/log'
import { getCurrentUserPermissions, hasPermission } from '@/server/permissions'

export const dynamic = 'force-dynamic'

// PUT /api/system/roles/[id]/permissions → 全量替换式分配菜单/按钮权限
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:role:assign-permission')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const menuIds: string[] = Array.isArray(body?.menuIds) ? body.menuIds : []

  const [existing] = await db.select().from(role).where(eq(role.id, id))
  if (!existing) {
    return NextResponse.json({ error: 'E_ROLE_NOT_FOUND' }, { status: 404 })
  }

  // 全量替换：先删后插
  await db.delete(roleMenu).where(eq(roleMenu.roleId, id))
  if (menuIds.length > 0) {
    await db.insert(roleMenu).values(menuIds.map(menuId => ({ roleId: id, menuId })))
  }

  await logOperation({
    module: 'role',
    action: 'assign-permission',
    method: 'PUT',
    path: req.nextUrl.pathname,
    detail: JSON.stringify({ count: menuIds.length }),
    userId,
    username,
  })
  return NextResponse.json({ ok: true, count: menuIds.length })
}

// GET /api/system/roles/[id]/permissions → 已分配的菜单/按钮 id 列表
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const rows = await db
    .select({ menuId: roleMenu.menuId })
    .from(roleMenu)
    .where(inArray(roleMenu.roleId, [id]))
  return NextResponse.json({ menuIds: rows.map(r => r.menuId) })
}

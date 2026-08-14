import type { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { userRole } from '@/server/db/schema'
import { logOperation } from '@/server/log'
import { getCurrentUserPermissions, hasPermission } from '@/server/permissions'

export const dynamic = 'force-dynamic'

// GET /api/system/users/[id]/roles → 当前用户的角色 id 列表
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const rows = await db
    .select({ roleId: userRole.roleId })
    .from(userRole)
    .where(eq(userRole.userId, id))
  return NextResponse.json({ roleIds: rows.map(r => r.roleId) })
}

// PUT /api/system/users/[id]/roles → 全量替换式分配角色（多角色）
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:user:assign-role')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const roleIds: string[] = Array.isArray(body?.roleIds) ? body.roleIds : []

  // 自我保护：不能移除自己的 admin 角色
  if (id === userId) {
    const selfRoles = await db.select({ roleId: userRole.roleId }).from(userRole).where(eq(userRole.userId, id))
    const nextSet = new Set(roleIds)
    const removedAdmin = selfRoles.filter(r => !nextSet.has(r.roleId))
    if (removedAdmin.length > 0) {
      return NextResponse.json({ error: 'E_ROLE_SELF_ADMIN' }, { status: 400 })
    }
  }

  await db.delete(userRole).where(eq(userRole.userId, id))
  if (roleIds.length > 0) {
    await db.insert(userRole).values(roleIds.map(roleId => ({ userId: id, roleId })))
  }

  await logOperation({
    module: 'user',
    action: 'assign-role',
    method: 'PUT',
    path: req.nextUrl.pathname,
    detail: JSON.stringify({ roleIds }),
    userId,
    username,
  })
  return NextResponse.json({ ok: true })
}

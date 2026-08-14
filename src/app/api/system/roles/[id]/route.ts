import type { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { role } from '@/server/db/schema'
import { logOperation } from '@/server/log'
import { getCurrentUserPermissions, hasPermission } from '@/server/permissions'
import { getRoleReferences } from '../route'

export const dynamic = 'force-dynamic'

// PUT /api/system/roles/[id] → 更新角色（内置角色不可禁用）
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:role:update')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const { name, description, status } = body ?? {}

  const [existing] = await db.select().from(role).where(eq(role.id, id))
  if (!existing) {
    return NextResponse.json({ error: 'E_ROLE_NOT_FOUND' }, { status: 404 })
  }
  if (existing.builtin && status === 'disabled') {
    return NextResponse.json({ error: 'E_ROLE_BUILTIN_DISABLE' }, { status: 400 })
  }

  const data: Partial<typeof role.$inferSelect> = {}
  if (typeof name === 'string' && name.trim())
    data.name = name.trim()
  if (typeof description === 'string')
    data.description = description
  if (status === 'active' || status === 'disabled')
    data.status = status

  await db.update(role).set(data).where(eq(role.id, id))
  await logOperation({ module: 'role', action: 'update', method: 'PUT', path: req.nextUrl.pathname, detail: JSON.stringify(data), userId, username })
  return NextResponse.json({ ok: true })
}

// DELETE /api/system/roles/[id] → 删除角色（内置不可删 / 已分配用户不可删）
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:role:delete')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { id } = await ctx.params
  const [existing] = await db.select().from(role).where(eq(role.id, id))
  if (!existing) {
    return NextResponse.json({ error: 'E_ROLE_NOT_FOUND' }, { status: 404 })
  }
  if (existing.builtin) {
    return NextResponse.json({ error: 'E_ROLE_BUILTIN_DELETE' }, { status: 400 })
  }

  const refs = await getRoleReferences(id)
  if (refs.userCount > 0) {
    return NextResponse.json({ error: 'E_ROLE_IN_USE', count: refs.userCount }, { status: 400 })
  }

  await db.delete(role).where(eq(role.id, id))
  await logOperation({ module: 'role', action: 'delete', method: 'DELETE', path: req.nextUrl.pathname, userId, username })
  return NextResponse.json({ ok: true })
}

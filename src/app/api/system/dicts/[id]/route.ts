import type { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { dictType } from '@/server/db/schema'
import { logOperation } from '@/server/log'
import { getCurrentUserPermissions, hasPermission } from '@/server/permissions'

export const dynamic = 'force-dynamic'

// PUT /api/system/dicts/[id] → 更新字典类型
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:dict:update')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const { name, remark, status } = body ?? {}

  const [existing] = await db.select().from(dictType).where(eq(dictType.id, id))
  if (!existing) {
    return NextResponse.json({ error: 'E_DICT_NOT_FOUND' }, { status: 404 })
  }

  const data: Partial<typeof dictType.$inferSelect> = {}
  if (typeof name === 'string' && name.trim())
    data.name = name.trim()
  if (typeof remark === 'string')
    data.remark = remark
  if (status === 'active' || status === 'disabled')
    data.status = status

  await db.update(dictType).set(data).where(eq(dictType.id, id))
  await logOperation({ module: 'dict', action: 'update', method: 'PUT', path: req.nextUrl.pathname, detail: JSON.stringify(data), userId, username })
  return NextResponse.json({ ok: true })
}

// DELETE /api/system/dicts/[id]（字典数据级联删除，FK onDelete cascade）
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:dict:delete')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { id } = await ctx.params
  const [existing] = await db.select().from(dictType).where(eq(dictType.id, id))
  if (!existing) {
    return NextResponse.json({ error: 'E_DICT_NOT_FOUND' }, { status: 404 })
  }

  await db.delete(dictType).where(eq(dictType.id, id))
  await logOperation({ module: 'dict', action: 'delete', method: 'DELETE', path: req.nextUrl.pathname, userId, username })
  return NextResponse.json({ ok: true })
}

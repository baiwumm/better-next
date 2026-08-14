import type { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { dictData } from '@/server/db/schema'
import { logOperation } from '@/server/log'
import { getCurrentUserPermissions, hasPermission } from '@/server/permissions'

export const dynamic = 'force-dynamic'

// PUT /api/system/dicts/data/[dataId] → 更新字典数据
export async function PUT(req: NextRequest, ctx: { params: Promise<{ dataId: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:dict:update')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { dataId } = await ctx.params
  const body = await req.json().catch(() => null)
  const { label, value, sort, isDefault, status } = body ?? {}

  const [existing] = await db.select().from(dictData).where(eq(dictData.id, dataId))
  if (!existing) {
    return NextResponse.json({ error: 'E_DICT_DATA_NOT_FOUND' }, { status: 404 })
  }

  const data: Partial<typeof dictData.$inferSelect> = {}
  if (typeof label === 'string' && label.trim())
    data.label = label.trim()
  if (typeof value === 'string' && value.trim())
    data.value = value.trim()
  if (typeof sort === 'number')
    data.sort = sort
  if (typeof isDefault === 'boolean')
    data.isDefault = isDefault
  if (status === 'active' || status === 'disabled')
    data.status = status

  await db.update(dictData).set(data).where(eq(dictData.id, dataId))
  await logOperation({ module: 'dict', action: 'update-data', method: 'PUT', path: req.nextUrl.pathname, detail: JSON.stringify(data), userId, username })
  return NextResponse.json({ ok: true })
}

// DELETE /api/system/dicts/data/[dataId] → 删除字典数据
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ dataId: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:dict:delete')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { dataId } = await ctx.params
  const [existing] = await db.select().from(dictData).where(eq(dictData.id, dataId))
  if (!existing) {
    return NextResponse.json({ error: 'E_DICT_DATA_NOT_FOUND' }, { status: 404 })
  }

  await db.delete(dictData).where(eq(dictData.id, dataId))
  await logOperation({ module: 'dict', action: 'delete-data', method: 'DELETE', path: req.nextUrl.pathname, userId, username })
  return NextResponse.json({ ok: true })
}

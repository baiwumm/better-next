import type { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { i18nEntry } from '@/server/db/schema'
import { logOperation } from '@/server/log'
import { getCurrentUserPermissions, hasPermission } from '@/server/permissions'

export const dynamic = 'force-dynamic'

// PUT /api/system/i18n/[id] → 更新词条
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:i18n:update')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const { zh, en, module, status } = body ?? {}

  const [existing] = await db.select().from(i18nEntry).where(eq(i18nEntry.id, id))
  if (!existing) {
    return NextResponse.json({ error: 'E_I18N_NOT_FOUND' }, { status: 404 })
  }

  const data: Partial<typeof i18nEntry.$inferSelect> = {}
  if (typeof zh === 'string')
    data.zh = zh
  if (typeof en === 'string')
    data.en = en
  if (typeof module === 'string')
    data.module = module
  if (status === 'active' || status === 'disabled')
    data.status = status

  await db.update(i18nEntry).set(data).where(eq(i18nEntry.id, id))
  await logOperation({ module: 'i18n', action: 'update', method: 'PUT', path: req.nextUrl.pathname, detail: JSON.stringify(data), userId, username })
  return NextResponse.json({ ok: true })
}

// DELETE /api/system/i18n/[id] → 删除词条
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:i18n:delete')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { id } = await ctx.params
  const [existing] = await db.select().from(i18nEntry).where(eq(i18nEntry.id, id))
  if (!existing) {
    return NextResponse.json({ error: 'E_I18N_NOT_FOUND' }, { status: 404 })
  }

  await db.delete(i18nEntry).where(eq(i18nEntry.id, id))
  await logOperation({ module: 'i18n', action: 'delete', method: 'DELETE', path: req.nextUrl.pathname, userId, username })
  return NextResponse.json({ ok: true })
}

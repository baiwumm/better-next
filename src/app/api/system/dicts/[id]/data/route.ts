import type { NextRequest } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { dictData } from '@/server/db/schema'
import { logOperation } from '@/server/log'
import { getCurrentUserPermissions, hasPermission } from '@/server/permissions'

export const dynamic = 'force-dynamic'

// GET /api/system/dicts/[id]/data → 字典数据列表
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const rows = await db
    .select()
    .from(dictData)
    .where(eq(dictData.typeId, id))
    .orderBy(desc(dictData.sort))
  return NextResponse.json({ rows })
}

// POST /api/system/dicts/[id]/data → 新增字典数据
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:dict:update')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const { label, value, sort, isDefault } = body ?? {}
  if (!label || !value) {
    return NextResponse.json({ error: 'E_REQUIRED' }, { status: 400 })
  }

  const [row] = await db
    .insert(dictData)
    .values({
      typeId: id,
      label,
      value,
      sort: typeof sort === 'number' ? sort : 0,
      isDefault: Boolean(isDefault),
    })
    .returning()

  await logOperation({ module: 'dict', action: 'create-data', method: 'POST', path: req.nextUrl.pathname, detail: JSON.stringify({ label, value }), userId, username })
  return NextResponse.json({ row }, { status: 201 })
}

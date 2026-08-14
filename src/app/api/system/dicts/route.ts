import type { NextRequest } from 'next/server'
import { desc, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { dictData, dictType } from '@/server/db/schema'
import { logOperation } from '@/server/log'
import { getCurrentUserPermissions, hasPermission } from '@/server/permissions'

export const dynamic = 'force-dynamic'

// GET /api/system/dicts → 字典类型列表（含数据数量）
export async function GET() {
  const rows = await db
    .select({
      id: dictType.id,
      code: dictType.code,
      name: dictType.name,
      status: dictType.status,
      remark: dictType.remark,
      createdAt: dictType.createdAt,
      updatedAt: dictType.updatedAt,
      dataCount: sql<number>`(select count(*) from ${dictData} where ${dictData.typeId} = ${dictType.id})`,
    })
    .from(dictType)
    .orderBy(desc(dictType.createdAt))

  return NextResponse.json({ rows })
}

// POST /api/system/dicts → 创建字典类型
export async function POST(req: NextRequest) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:dict:create')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const { code, name, status, remark } = body ?? {}
  if (!code || !name) {
    return NextResponse.json({ error: 'E_REQUIRED' }, { status: 400 })
  }

  try {
    const [created] = await db.insert(dictType).values({ code, name, status: status ?? 'active', remark: remark ?? null }).returning()
    await logOperation({ module: 'dict', action: 'create', method: 'POST', path: req.nextUrl.pathname, detail: JSON.stringify({ code, name }), userId, username })
    return NextResponse.json(created, { status: 201 })
  }
  catch (e) {
    const message = e instanceof Error && e.message.includes('duplicate')
      ? 'E_CODE_EXISTS'
      : 'E_CREATE_FAILED'
    await logOperation({ module: 'dict', action: 'create', method: 'POST', path: req.nextUrl.pathname, status: 'failed', detail: message, userId, username })
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

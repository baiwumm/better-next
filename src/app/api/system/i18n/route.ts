import type { NextRequest } from 'next/server'
import { and, desc, eq, ilike, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { i18nEntry } from '@/server/db/schema'
import { logOperation } from '@/server/log'
import { getCurrentUserPermissions, hasPermission } from '@/server/permissions'

export const dynamic = 'force-dynamic'

// GET /api/system/i18n?search=&module=
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const module = searchParams.get('module') ?? ''

  const conditions = []
  if (search) {
    conditions.push(or(
      ilike(i18nEntry.key, `%${search}%`),
      ilike(i18nEntry.zh, `%${search}%`),
      ilike(i18nEntry.en, `%${search}%`),
    ))
  }
  if (module)
    conditions.push(eq(i18nEntry.module, module))

  const rows = await db
    .select()
    .from(i18nEntry)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(i18nEntry.createdAt))

  return NextResponse.json({ rows })
}

// POST /api/system/i18n
export async function POST(req: NextRequest) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:i18n:create')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const { key, zh, en, module, status } = body ?? {}
  if (!key) {
    return NextResponse.json({ error: 'E_REQUIRED' }, { status: 400 })
  }

  try {
    const [created] = await db.insert(i18nEntry).values({
      key,
      zh: zh ?? '',
      en: en ?? '',
      module: module ?? 'common',
      status: status ?? 'active',
    }).returning()
    await logOperation({ module: 'i18n', action: 'create', method: 'POST', path: req.nextUrl.pathname, detail: JSON.stringify({ key }), userId, username })
    return NextResponse.json(created, { status: 201 })
  }
  catch (e) {
    const message = e instanceof Error && e.message.includes('duplicate')
      ? 'E_CODE_EXISTS'
      : 'E_CREATE_FAILED'
    await logOperation({ module: 'i18n', action: 'create', method: 'POST', path: req.nextUrl.pathname, status: 'failed', detail: message, userId, username })
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

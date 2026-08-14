import type { NextRequest } from 'next/server'
import { desc, eq, or, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { role, roleMenu, userRole } from '@/server/db/schema'
import { logOperation } from '@/server/log'
import { getCurrentUserPermissions, hasPermission } from '@/server/permissions'

export const dynamic = 'force-dynamic'

// GET /api/system/roles?search=&page=&pageSize=
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(Number(searchParams.get('page') ?? 1), 1)
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') ?? 10), 1), 100)
  const offset = (page - 1) * pageSize

  const where = search
    ? or(
        sql`${role.name} ILIKE ${`%${search}%`}`,
        sql`${role.code} ILIKE ${`%${search}%`}`,
      )
    : undefined

  const [rows, total] = await Promise.all([
    db.select().from(role).where(where).orderBy(desc(role.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(role).where(where),
  ])

  return NextResponse.json({ rows, total: Number(total[0]?.count ?? 0) })
}

// POST /api/system/roles
export async function POST(req: NextRequest) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:role:create')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const { code, name, description, status } = body ?? {}
  if (!code || !name) {
    return NextResponse.json({ error: 'E_REQUIRED' }, { status: 400 })
  }

  try {
    const [created] = await db.insert(role).values({ code, name, description, status: status ?? 'active' }).returning()
    await logOperation({
      module: 'role',
      action: 'create',
      method: 'POST',
      path: req.nextUrl.pathname,
      detail: JSON.stringify({ code, name }),
      userId,
      username,
    })
    return NextResponse.json(created, { status: 201 })
  }
  catch (e) {
    const message = e instanceof Error && e.message.includes('duplicate')
      ? 'E_CODE_EXISTS'
      : 'E_CREATE_FAILED'
    await logOperation({ module: 'role', action: 'create', method: 'POST', path: req.nextUrl.pathname, status: 'failed', detail: message, userId, username })
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// 供 [id] 路由复用：删除角色前的引用检查
export async function getRoleReferences(roleId: string) {
  const [menuRefs, userRefs] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(roleMenu).where(eq(roleMenu.roleId, roleId)),
    db.select({ count: sql<number>`count(*)` }).from(userRole).where(eq(userRole.roleId, roleId)),
  ])
  return {
    menuCount: Number(menuRefs[0]?.count ?? 0),
    userCount: Number(userRefs[0]?.count ?? 0),
  }
}

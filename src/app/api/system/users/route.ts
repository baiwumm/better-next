import type { NextRequest } from 'next/server'
import { eq, inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/server/db'
import { role, userRole } from '@/server/db/schema'
import { logOperation } from '@/server/log'
import { getCurrentUserPermissions, hasPermission } from '@/server/permissions'

export const dynamic = 'force-dynamic'

// GET /api/system/users?search=&page=&pageSize=
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(Number(searchParams.get('page') ?? 1), 1)
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') ?? 10), 1), 100)

  const result = await auth.api.listUsers({
    headers: req.headers,
    query: {
      searchValue: search || undefined,
      searchField: 'name',
      searchOperator: 'contains',
      limit: pageSize,
      offset: (page - 1) * pageSize,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    },
  })

  // 补充角色信息（多角色）
  const users = result.users as Array<{ id: string }>
  const userIds = users.map(u => u.id)
  const roleMaps = new Map<string, { code: string, name: string }[]>()
  if (userIds.length > 0) {
    const rows = await db
      .select({ userId: userRole.userId, code: role.code, name: role.name })
      .from(userRole)
      .innerJoin(role, eq(role.id, userRole.roleId))
      .where(inArray(userRole.userId, userIds))
    for (const r of rows) {
      roleMaps.set(r.userId, [...(roleMaps.get(r.userId) ?? []), { code: r.code, name: r.name }])
    }
  }

  return NextResponse.json({
    rows: users.map(u => ({ ...u, roles: roleMaps.get(u.id) ?? [] })),
    total: result.total,
  })
}

// POST /api/system/users → 新建用户（可附带角色）
export async function POST(req: NextRequest) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:user:create')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const { email, password, name, roleIds } = body ?? {}
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'E_REQUIRED' }, { status: 400 })
  }

  try {
    const created = await auth.api.createUser({
      headers: req.headers,
      body: {
        email,
        password,
        name,
      },
    })

    // admin 创建的用户直接视为已验证
    await auth.api.adminUpdateUser({
      headers: req.headers,
      body: { userId: created.user.id, data: { emailVerified: true } },
    })

    if (Array.isArray(roleIds) && roleIds.length > 0) {
      await db.insert(userRole).values(roleIds.map(roleId => ({ userId: created.user.id, roleId })))
    }

    await logOperation({
      module: 'user',
      action: 'create',
      method: 'POST',
      path: req.nextUrl.pathname,
      detail: JSON.stringify({ email }),
      userId,
      username,
    })
    return NextResponse.json(created.user, { status: 201 })
  }
  catch (e) {
    const message = e instanceof Error && e.message.includes('already exists')
      ? 'E_USER_EMAIL_EXISTS'
      : 'E_CREATE_USER_FAILED'
    await logOperation({ module: 'user', action: 'create', method: 'POST', path: req.nextUrl.pathname, status: 'failed', detail: message, userId, username })
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

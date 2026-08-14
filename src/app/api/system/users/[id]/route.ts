import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logOperation } from '@/server/log'
import { getCurrentUserPermissions, hasPermission } from '@/server/permissions'

export const dynamic = 'force-dynamic'

// PUT /api/system/users/[id] → 更新用户（姓名 / 启用禁用 / 邮箱验证 / 重置密码）
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:user:update')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const { name, banned, emailVerified, newPassword } = body ?? {}

  const data: Record<string, string | boolean> = {}
  if (typeof name === 'string' && name.trim())
    data.name = name.trim()
  if (typeof banned === 'boolean')
    data.banned = banned
  if (typeof emailVerified === 'boolean')
    data.emailVerified = emailVerified
  if (typeof newPassword === 'string' && newPassword.length >= 8)
    data.password = newPassword

  try {
    await auth.api.adminUpdateUser({
      headers: req.headers,
      body: { userId: id, data },
    })
    await logOperation({
      module: 'user',
      action: newPassword ? 'reset-password' : 'update',
      method: 'PUT',
      path: req.nextUrl.pathname,
      detail: JSON.stringify(Object.keys(data)),
      userId,
      username,
    })
    return NextResponse.json({ ok: true })
  }
  catch (e) {
    const message = e instanceof Error ? e.message : 'E_SAVE_FAILED'
    await logOperation({ module: 'user', action: 'update', method: 'PUT', path: req.nextUrl.pathname, status: 'failed', detail: message, userId, username })
    return NextResponse.json({ error: 'E_SAVE_FAILED' }, { status: 400 })
  }
}

// DELETE /api/system/users/[id] → 删除用户（不能删除自己）
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:user:delete')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const { id } = await ctx.params
  if (id === userId) {
    return NextResponse.json({ error: 'E_USER_SELF_DELETE' }, { status: 400 })
  }

  try {
    await auth.api.removeUser({ headers: req.headers, body: { userId: id } })
    await logOperation({ module: 'user', action: 'delete', method: 'DELETE', path: req.nextUrl.pathname, userId, username })
    return NextResponse.json({ ok: true })
  }
  catch {
    return NextResponse.json({ error: 'E_DELETE_FAILED' }, { status: 400 })
  }
}

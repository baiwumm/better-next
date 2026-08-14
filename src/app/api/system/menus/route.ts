import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { menu } from '@/server/db/schema'
import { logOperation } from '@/server/log'
import { buildMenuTree } from '@/server/menu-tree'
import { getCurrentUserPermissions, hasPermission } from '@/server/permissions'

export const dynamic = 'force-dynamic'

// GET /api/system/menus → 菜单树（含 dir/menu/button）
export async function GET() {
  const tree = await buildMenuTree()
  return NextResponse.json(tree)
}

// POST /api/system/menus → 新增菜单
export async function POST(req: NextRequest) {
  const { userId, username, permissions } = await getCurrentUserPermissions()
  if (!userId || !hasPermission(permissions, 'system:menu:create')) {
    return NextResponse.json({ error: 'E_FORBIDDEN' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const { name, type, parentId, path, icon, permission, sort, visible, status, i18nKey } = body ?? {}
  if (!name || !type) {
    return NextResponse.json({ error: 'E_REQUIRED' }, { status: 400 })
  }

  try {
    const [created] = await db.insert(menu).values({
      name,
      type,
      parentId: parentId ?? null,
      path: path ?? null,
      icon: icon ?? null,
      permission: permission ?? null,
      sort: sort ?? 0,
      visible: visible ?? true,
      status: status ?? 'active',
      i18nKey: i18nKey ?? null,
    }).returning()

    await logOperation({
      module: 'menu',
      action: 'create',
      method: 'POST',
      path: req.nextUrl.pathname,
      detail: JSON.stringify({ name, type, path }),
      userId,
      username,
    })
    return NextResponse.json(created, { status: 201 })
  }
  catch {
    return NextResponse.json({ error: 'E_CREATE_FAILED' }, { status: 400 })
  }
}

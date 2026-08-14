import type { NextRequest } from 'next/server'
import { desc, ilike, or, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { operationLog } from '@/server/db/schema'

export const dynamic = 'force-dynamic'

// GET /api/system/logs?search=&page=&pageSize=
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const page = Math.max(Number(searchParams.get('page') ?? 1), 1)
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') ?? 10), 1), 100)
  const offset = (page - 1) * pageSize

  const conditions = search
    ? or(
        ilike(operationLog.username, `%${search}%`),
        ilike(operationLog.module, `%${search}%`),
        ilike(operationLog.path, `%${search}%`),
      )
    : undefined

  const [rows, total] = await Promise.all([
    db.select().from(operationLog).where(conditions).orderBy(desc(operationLog.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(operationLog).where(conditions),
  ])

  return NextResponse.json({ rows, total: Number(total[0]?.count ?? 0) })
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

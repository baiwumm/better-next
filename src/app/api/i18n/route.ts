import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { i18nEntry } from '@/server/db/schema'

// GET /api/i18n → { key: { zh, en } }（active 词条）
export async function GET() {
  const rows = await db
    .select()
    .from(i18nEntry)
    .where(eq(i18nEntry.status, 'active'))

  const data: Record<string, { zh: string, en: string }> = {}
  for (const row of rows) {
    data[row.key] = { zh: row.zh ?? '', en: row.en ?? '' }
  }
  return NextResponse.json(data)
}

import type { Locale } from '@/i18n/static'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { en, zh } from '@/i18n/static'
import { db } from '@/server/db'
import { i18nEntry } from '@/server/db/schema'

/**
 * 服务端 i18n：读取 cookie 语言，合并静态词条 + 数据库动态词条。
 * React.cache 保证同一次请求内去重（server-parallel-fetching）。
 */
export const getMessages = cache(async () => {
  const lang = ((await cookies()).get('app-lang')?.value === 'en' ? 'en' : 'zh') as Locale
  const base = { ...(lang === 'zh' ? zh : en) } as Record<string, string>

  const rows = await db
    .select()
    .from(i18nEntry)
    .where(eq(i18nEntry.status, 'active'))

  for (const row of rows) {
    const value = lang === 'zh' ? row.zh : row.en
    if (value)
      base[row.key] = value
  }
  return { lang, messages: base }
})

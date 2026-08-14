import { db } from '@/server/db'
import { operationLog } from '@/server/db/schema'

export interface LogEntry {
  module: string
  action: string
  method?: string
  path?: string
  status?: 'success' | 'failed'
  detail?: string
  userId?: string | null
  username?: string | null
}

/** 记录业务操作日志（增删改查） */
export async function logOperation(entry: LogEntry) {
  await db.insert(operationLog).values({
    module: entry.module,
    action: entry.action,
    method: entry.method ?? '',
    path: entry.path ?? '',
    status: entry.status ?? 'success',
    detail: entry.detail,
    userId: entry.userId ?? null,
    username: entry.username ?? null,
  })
}

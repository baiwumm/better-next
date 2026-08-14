import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Check .env.local')
}

// Supabase 事务连接池：无状态、Serverless 友好。
// max>1 允许并发查询（避免单连接串行排队）；事务池不支持 prepared statements，需 prepare: false
export const client = postgres(connectionString, {
  max: 10,
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(client)

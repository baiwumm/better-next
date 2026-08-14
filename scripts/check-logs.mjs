import postgres from 'postgres'

process.loadEnvFile('.env.local')

const sql = postgres(process.env.DATABASE_URL, { max: 1 })
const logs = await sql`select module, action, status from operation_log order by created_at desc limit 5`
console.log('OPERATION LOGS:', JSON.stringify(logs))
await sql.end()

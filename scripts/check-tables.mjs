import postgres from 'postgres'

process.loadEnvFile('.env.local')

const sql = postgres(process.env.DATABASE_URL, { max: 1 })
const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`
console.log(`TABLES: ${tables.map(t => t.table_name).join(', ')}`)
await sql.end()

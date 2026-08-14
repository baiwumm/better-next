import postgres from 'postgres'

process.loadEnvFile('.env.local')

const sql = postgres(process.env.DATABASE_URL, { max: 1 })
const r = await sql`update "user" set role = 'admin' where email = 'admin@example.com'`
console.log('updated rows:', r.count)
const users = await sql`select email, role from "user" order by email`
console.log(JSON.stringify(users))
await sql.end()

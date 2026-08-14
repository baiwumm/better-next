import postgres from 'postgres'

process.loadEnvFile('.env.local')

const sql = postgres(process.env.DATABASE_URL, { max: 1 })

const counts = {}
for (const t of ['role', 'menu', 'user_role', 'role_menu', 'dict_type', 'dict_data', 'i18n_entry', 'user', 'account']) {
  const [r] = await sql`select count(*)::int as c from ${sql(t)}`
  counts[t] = r.c
}
console.log('COUNT:', JSON.stringify(counts))

const roles = await sql`select code, name, builtin from role order by code`
console.log('ROLES:', roles.map(r => `${r.code}(${r.name})`).join(', '))

const menus = await sql`select name, type, path, permission from menu where type = 'menu' and path is not null order by sort`
console.log('MENUS:', menus.map(m => m.path).join(', '))

const buttons = await sql`select count(*)::int as c from menu where type = 'button'`
console.log('BUTTONS:', buttons[0].c)

const users = await sql`select email, email_verified from "user" order by email`
console.log('USERS:', users.map(u => `${u.email}(verified=${u.email_verified})`).join(', '))

const assign = await sql`
  select u.email, r.code from user_role ur
  join "user" u on u.id = ur.user_id
  join role r on r.id = ur.role_id
  order by u.email`
console.log('ASSIGN:', assign.map(a => `${a.email}->${a.code}`).join(', '))

await sql.end()

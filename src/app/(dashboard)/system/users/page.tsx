import { UsersTable } from '@/components/system/users/users-table'
import { getCurrentUserPermissions } from '@/server/permissions'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const { permissions } = await getCurrentUserPermissions()

  return <UsersTable permissions={permissions} />
}

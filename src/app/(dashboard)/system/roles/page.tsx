import { RolesTable } from '@/components/system/roles/roles-table'
import { getCurrentUserPermissions } from '@/server/permissions'

export const dynamic = 'force-dynamic'

export default async function RolesPage() {
  const { permissions } = await getCurrentUserPermissions()

  return (
    <div className="space-y-4">
      <RolesTable permissions={permissions} />
    </div>
  )
}

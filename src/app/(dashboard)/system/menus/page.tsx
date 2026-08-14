import { MenusTable } from '@/components/system/menus/menus-table'
import { getCurrentUserPermissions } from '@/server/permissions'

export const dynamic = 'force-dynamic'

export default async function MenusPage() {
  const { permissions } = await getCurrentUserPermissions()

  return <MenusTable permissions={permissions} />
}

import { DictsTable } from '@/components/system/dicts/dicts-table'
import { getCurrentUserPermissions } from '@/server/permissions'

export const dynamic = 'force-dynamic'

export default async function DictsPage() {
  const { permissions } = await getCurrentUserPermissions()

  return <DictsTable permissions={permissions} />
}

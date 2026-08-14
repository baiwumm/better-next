import { I18nTable } from '@/components/system/i18n/i18n-table'
import { getCurrentUserPermissions } from '@/server/permissions'

export const dynamic = 'force-dynamic'

export default async function I18nPage() {
  const { permissions } = await getCurrentUserPermissions()

  return <I18nTable permissions={permissions} />
}

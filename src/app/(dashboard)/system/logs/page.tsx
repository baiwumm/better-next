import { LogsTable } from '@/components/system/logs/logs-table'

export const dynamic = 'force-dynamic'

export default async function LogsPage() {
  return <LogsTable kind="operation" />
}

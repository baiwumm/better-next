import { LogsTable } from '@/components/system/logs/logs-table'

export const dynamic = 'force-dynamic'

export default async function LoginLogsPage() {
  return <LogsTable kind="login" />
}

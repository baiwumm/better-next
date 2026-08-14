import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { auth } from '@/lib/auth'
import { getCurrentUserMenus } from '@/server/permissions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect('/auth/sign-in')
  }

  // 只读演示模式（线上开启）：前端显示横幅提示
  const readonly = process.env.APP_READONLY === 'true'

  // 动态菜单：按当前用户权限过滤。
  // 菜单名称不做服务端翻译，交由客户端 Sidebar 用 useT() 按当前语言渲染（切换语言即时生效）
  const menus = await getCurrentUserMenus()

  return <DashboardShell menus={menus} readonly={readonly}>{children}</DashboardShell>
}

'use client'

import type { MenuTreeNode } from '@/server/menu-tree'
import { Drawer } from '@heroui/react'
import { useState } from 'react'
import { Header } from './header'
import { ReadonlyBanner } from './readonly-banner'
import { Sidebar } from './sidebar'

export function DashboardShell({
  children,
  menus,
  readonly = false,
}: {
  children: React.ReactNode
  menus: MenuTreeNode[]
  readonly?: boolean
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 桌面端（md+）静态侧边栏 */}
      <div className="hidden md:block">
        <Sidebar menus={menus} />
      </div>

      {/* 移动端抽屉（HeroUI Drawer：自带遮罩/动画/ESC 关闭） */}
      <Drawer.Root isOpen={sidebarOpen} onOpenChange={setSidebarOpen}>
        <Drawer.Backdrop isDismissable onClick={() => setSidebarOpen(false)} />
        <Drawer.Content placement="left" className="w-60 md:hidden">
          <Drawer.Dialog>
            <Sidebar menus={menus} onNavigate={() => setSidebarOpen(false)} />
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        {readonly && <ReadonlyBanner />}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}

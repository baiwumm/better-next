'use client'

import type { LucideIcon } from 'lucide-react'
import type { MenuTreeNode } from '@/server/menu-tree'
import { cn } from '@heroui/react'
import {
  BookOpen,
  FileText,
  Languages,
  LayoutDashboard,
  LogIn,

  Menu,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from '@/store/i18n'

const iconMap: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'settings': Settings,
  'users': Users,
  'menu': Menu,
  'shield-check': ShieldCheck,
  'book-open': BookOpen,
  'languages': Languages,
  'file-text': FileText,
  'log-in': LogIn,
}

/** 菜单名按当前语言翻译：i18nKey 优先（静态+动态词条），无 key 用原始 name */
function menuName(item: Pick<MenuTreeNode, 'name' | 'i18nKey'>, t: (key: string) => string): string {
  return item.i18nKey ? t(item.i18nKey) : item.name
}

function SidebarItem({ item, onNavigate }: { item: MenuTreeNode, onNavigate: () => void }) {
  const pathname = usePathname()
  const t = useT()
  const Icon = item.icon ? iconMap[item.icon] : undefined
  const active = item.path && pathname.startsWith(item.path)

  if (item.type === 'dir') {
    return (
      <div className="px-3 pt-4 pb-1">
        <div className="flex items-center gap-2 px-2 text-xs font-semibold tracking-wide text-foreground/50 uppercase">
          {Icon && <Icon size={14} />}
          {menuName(item, t)}
        </div>
        {item.children.map(child => (
          <SidebarItem key={child.id} item={child} onNavigate={onNavigate} />
        ))}
      </div>
    )
  }

  return (
    <Link
      href={item.path ?? '#'}
      onClick={onNavigate}
      className={cn(
        'mx-2 my-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground',
      )}
    >
      {Icon && <Icon size={16} />}
      {menuName(item, t)}
    </Link>
  )
}

export function Sidebar({ menus, onNavigate }: { menus: MenuTreeNode[], onNavigate?: () => void }) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-default-200 border-r-0 bg-default-50 md:border-r md:bg-default-50/50">
      <div className="flex h-14 items-center gap-2 border-b border-default-200 px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <LayoutDashboard size={16} />
        </div>
        <span className="text-sm font-semibold">Better Next</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {menus.map(item => (
          <SidebarItem key={item.id} item={item} onNavigate={onNavigate ?? (() => {})} />
        ))}
      </nav>
    </aside>
  )
}

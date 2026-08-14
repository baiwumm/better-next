'use client'

import { UserButton } from '@better-auth-ui/heroui'
import { Button } from '@heroui/react'
import { Menu } from 'lucide-react'
import { useT } from '@/store/i18n'
import { LanguageSwitcher } from './language-switcher'

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const t = useT()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-default-200 bg-background px-4">
      <div className="flex items-center gap-2">
        {/* 移动端汉堡按钮 */}
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          className="md:hidden"
          aria-label={t('layout.openMenu')}
          onPress={onMenuClick}
        >
          <Menu size={18} />
        </Button>
        <div className="text-sm text-foreground/60">{t('header.title')}</div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <LanguageSwitcher />
        <UserButton />
      </div>
    </header>
  )
}

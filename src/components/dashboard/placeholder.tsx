'use client'

import { Card } from '@heroui/react'
import { Construction } from 'lucide-react'
import { useT } from '@/store/i18n'

/** 控制台占位页：useT 按当前语言渲染（切换语言即时生效，无需刷新） */
export function DashboardPlaceholder() {
  const t = useT()

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-md gap-2 p-8 text-center">
        <Card.Header className="flex flex-col items-center gap-3">
          <Construction className="text-accent" size={40} />
          <Card.Title className="text-lg font-semibold">{t('dashboard.placeholder')}</Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="text-sm text-foreground/60">{t('dashboard.comingSoon')}</p>
        </Card.Content>
      </Card>
    </div>
  )
}

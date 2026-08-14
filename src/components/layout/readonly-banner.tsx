'use client'

import { AlertTriangle } from 'lucide-react'
import { useT } from '@/store/i18n'

/** 只读演示模式横幅（线上 APP_READONLY=true 时显示） */
export function ReadonlyBanner() {
  const t = useT()

  return (
    <div className="flex items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-1.5 text-sm text-warning">
      <AlertTriangle size={14} />
      {t('common.readonly')}
    </div>
  )
}

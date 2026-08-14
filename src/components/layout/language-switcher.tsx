'use client'

import { Button } from '@heroui/react'
import { setLangCookie, useI18nStore } from '@/store/i18n'

export function LanguageSwitcher() {
  const { lang, setLang } = useI18nStore()

  const toggle = () => {
    const next = lang === 'zh' ? 'en' : 'zh'
    setLangCookie(next)
    setLang(next)
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label="切换语言 / Switch language"
      onPress={toggle}
    >
      {lang === 'zh' ? 'EN' : '中文'}
    </Button>
  )
}

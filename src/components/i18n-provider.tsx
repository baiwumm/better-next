'use client'

import type { Locale } from '@/i18n/static'
import { useEffect } from 'react'
import { useI18nStore } from '@/store/i18n'

/**
 * 客户端 i18n Provider：
 * 1. 用服务端传入的 cookie 语言初始化
 * 2. 挂载后拉取数据库动态词条并合并
 */
export function I18nProvider({
  children,
  initialLang,
}: {
  children: React.ReactNode
  initialLang: Locale
}) {
  const { setLang, setDynamic, setLoaded } = useI18nStore()

  useEffect(() => {
    const controller = new AbortController()
    setLang(initialLang)
    setLoaded(false)
    fetch('/api/i18n', { signal: controller.signal })
      .then(r => r.json())
      .then((data: Record<string, { zh: string, en: string }>) => {
        setDynamic(data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
    return () => controller.abort()
  }, [initialLang, setDynamic, setLang, setLoaded])

  return <>{children}</>
}

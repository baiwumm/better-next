'use client'

import type { Locale } from '@/i18n/static'
import { create } from 'zustand'
import { en, zh } from '@/i18n/static'

export const LANGUAGE_COOKIE = 'app-lang'

export function getLangFromCookie(): Locale {
  if (typeof document === 'undefined')
    return 'zh'
  const match = document.cookie.match(/(?:^|; )app-lang=([^;]+)/)
  return match?.[1] === 'en' ? 'en' : 'zh'
}

export function setLangCookie(lang: Locale) {
  document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`
}

/** 数据库动态词条原始数据（双语） */
export type DynamicMessages = Record<string, { zh: string, en: string }>

interface I18nState {
  lang: Locale
  dynamic: DynamicMessages
  loaded: boolean
  setLang: (lang: Locale) => void
  setDynamic: (messages: DynamicMessages) => void
  setLoaded: (loaded: boolean) => void
}

export const useI18nStore = create<I18nState>(set => ({
  lang: 'zh',
  dynamic: {},
  loaded: false,
  setLang: lang => set({ lang }),
  setDynamic: dynamic => set({ dynamic }),
  setLoaded: loaded => set({ loaded }),
}))

/** 客户端 t 函数：动态词条（按当前语言）→ 静态词条 → 原 key；支持 {param} 插值 */
export function useT() {
  const { lang, dynamic } = useI18nStore()
  const staticMessages = lang === 'zh' ? zh : en

  return (key: string, params?: Record<string, string | number>): string => {
    let text = dynamic[key]?.[lang] ?? staticMessages[key as keyof typeof staticMessages] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v))
      }
    }
    return text
  }
}

/** 将 API 错误对象翻译为用户可读文案：优先 error.code（静态词条），回退 error.message */
export function errMsg(t: (key: string, params?: Record<string, string | number>) => string, error: { code?: string, message?: string, count?: number } | null): string {
  if (!error)
    return ''
  // mutation 抛出的 Error 只有 message；若 message 形如错误码（E_*）也按码翻译
  const code = error.code ?? (typeof error.message === 'string' && error.message.startsWith('E_') ? error.message : undefined)
  if (code) {
    const key = `error.${code}`
    const params = typeof error.count === 'number' ? { count: error.count } : undefined
    const translated = t(key, params)
    return translated === key ? (error.message ?? '') : translated
  }
  return error.message ?? ''
}

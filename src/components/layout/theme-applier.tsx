'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/store/theme'

/**
 * 将主题状态应用到 <html>（class="dark" + data-theme）。
 * system 模式跟随系统 prefers-color-scheme 并监听变化。
 * 主题切换 UI 由 better-auth-ui 的 themePlugin / ThemeToggleItem 提供，
 * 本组件只负责 DOM 应用（better-auth-ui 不覆盖此能力）。
 */
export function ThemeApplier() {
  const theme = useThemeStore(s => s.theme)

  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const resolved = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme
      if (resolved === 'dark') {
        root.classList.add('dark')
        root.setAttribute('data-theme', 'dark')
      }
      else {
        root.classList.remove('dark')
        root.removeAttribute('data-theme')
      }
    }

    apply()
    if (theme === 'system') {
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [theme])

  return null
}

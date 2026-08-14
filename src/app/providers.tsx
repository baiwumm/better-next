'use client'

import { AuthProvider } from '@better-auth-ui/heroui'
import { themePlugin } from '@better-auth-ui/heroui/plugins'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ThemeApplier } from '@/components/layout/theme-applier'
import { authClient } from '@/lib/auth-client'
import { useThemeStore } from '@/store/theme'

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [queryClient] = useState(() => new QueryClient())

  // better-auth-ui 主题插件：主题切换 UI（UserButton 菜单项）由它提供，
  // 状态与应用仍走 zustand（themePlugin 只持有 theme/setTheme）
  const theme = useThemeStore(s => s.theme)
  const setTheme = useThemeStore(s => s.setTheme)
  const themeInstance = useMemo(
    () => themePlugin({ theme, setTheme, themes: ['system', 'light', 'dark'] }),
    [theme, setTheme],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        authClient={authClient}
        queryClient={queryClient}
        navigate={({ to }) => router.push(to)}
        plugins={[themeInstance]}
      >
        <ThemeApplier />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}

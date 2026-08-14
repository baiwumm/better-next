'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'system' | 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (theme: string) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      theme: 'light',
      setTheme: theme => set({ theme: theme === 'dark' || theme === 'system' ? theme : 'light' }),
      toggleTheme: () => set(state => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'app-theme' },
  ),
)

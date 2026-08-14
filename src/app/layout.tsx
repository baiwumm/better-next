import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import { I18nProvider } from '@/components/i18n-provider'
import MapleMonoFont from '@/components/MapleMonoFont' // 远程字体（动态注入，避免阻塞首屏）
import { Providers } from './providers'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Better Next',
  description: 'Next.js 16 admin dashboard demo',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const lang = (await cookies()).get('app-lang')?.value === 'en' ? 'en' : 'zh'

  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 主题防闪烁：SSR 前同步 localStorage 中的主题（含 system 解析） */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=JSON.parse(localStorage.getItem('app-theme')||'{}');var th=t.state&&t.state.theme;if(th==='system'){th=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(th==='dark'){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark')}}catch(e){}})()`,
          }}
        />
        <Providers>
          <I18nProvider initialLang={lang}>{children}</I18nProvider>
        </Providers>
        <MapleMonoFont />
      </body>
    </html>
  )
}

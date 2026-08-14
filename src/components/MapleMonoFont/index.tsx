'use client'
import { useEffect } from 'react'

// 远程字体 CSS 链接（Maple Mono CN）
// 动态加载避免阻塞首屏渲染：RSC 中无法给 <link> 传 onLoad 事件，改由客户端组件水合后注入
const FONT_CSS_URL = 'https://cn-font.claude-code-best.win/packages/maple-mono-cn/dist/MapleMono-CN-Regular/result.css'

export default function MapleMonoFont() {
  useEffect(() => {
    // 幂等：避免 StrictMode 双执行时重复注入
    if (document.querySelector(`link[href="${FONT_CSS_URL}"]`))
      return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONT_CSS_URL
    document.head.appendChild(link)
  }, [])

  return null
}

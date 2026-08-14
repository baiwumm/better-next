'use client'

import { useEffect } from 'react'

/**
 * better-auth-ui 的 <SignIn /> 不支持默认填充 prop，演示项目需要预填演示账号。
 * SignIn 内部输入框为 React 受控组件：直接赋值 input.value 会被 React 状态覆盖，
 * 必须用 native value setter 写入并用 input 事件通知 React（受控输入标准同步方式）。
 * 输入框可能异步渲染，故用 MutationObserver 等待其出现后再填充。
 */
export function useDemoLoginPrefill(email = 'admin@example.com', password = 'Admin123456') {
  useEffect(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    if (!setter)
      return

    const fill = (): boolean => {
      const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]')
      const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]')
      if (!emailInput || !passwordInput)
        return false

      if (!emailInput.value) {
        setter.call(emailInput, email)
        emailInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
      if (!passwordInput.value) {
        setter.call(passwordInput, password)
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
      return true
    }

    // 先尝试立即填充；若输入框尚未渲染（SignIn 异步挂载），等待其出现
    if (fill())
      return

    const observer = new MutationObserver(() => {
      if (fill())
        observer.disconnect()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    const timer = window.setTimeout(() => observer.disconnect(), 5000)

    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
  }, [email, password])
}

import {
  EmailVerificationEmail,
  MagicLinkEmail,
  ResetPasswordEmail,
} from '@better-auth-ui/react/email'
import { render } from 'react-email'
import { Resend } from 'resend'

export type MailLang = 'zh' | 'en'

const resend = new Resend(process.env.RESEND_API_KEY)
const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev'
const appName = 'Better Next'

// HeroUI 品牌配色（与 @better-auth-ui/heroui 版模板一致）
const brandColors = {
  light: { background: '#F5F5F5', primary: '#0285F7', primaryForeground: '#FCFCFC' },
  dark: { background: '#060607', primary: '#0584F6', primaryForeground: '#FCFCFC' },
}

// ===== 中文文案（英文使用模板默认） =====
const verifyEmailZh = {
  VERIFY_YOUR_EMAIL_ADDRESS: '验证你的邮箱地址',
  LOGO: 'Logo',
  CLICK_BUTTON_TO_VERIFY_EMAIL: '点击下方按钮验证邮箱 {emailAddress} 在 {appName} 的账号',
  VERIFY_EMAIL_ADDRESS: '验证邮箱',
  OR_COPY_AND_PASTE_URL: '或复制并粘贴以下链接到浏览器：',
  THIS_LINK_EXPIRES_IN_MINUTES: '此链接将在 {expirationMinutes} 分钟后过期',
  EMAIL_SENT_BY: '邮件由',
  IF_YOU_DIDNT_REQUEST_THIS_EMAIL: '如果你没有请求此邮件，请忽略',
  POWERED_BY_BETTER_AUTH: '由 Better Auth 提供支持',
}

const magicLinkZh = {
  SIGN_IN_TO_APP_NAME: '登录 {appName}',
  SIGN_IN_TO_YOUR_ACCOUNT: '登录你的账号',
  YOUR_ACCOUNT: '你的账号',
  LOGO: 'Logo',
  CLICK_BUTTON_TO_SIGN_IN: '点击下方按钮登录',
  OR_COPY_AND_PASTE_URL: '或复制并粘贴以下链接到浏览器：',
  THIS_LINK_EXPIRES_IN_MINUTES: '此链接将在 {expirationMinutes} 分钟后过期',
  EMAIL_SENT_BY: '邮件由',
  IF_YOU_DIDNT_REQUEST_THIS_EMAIL: '如果你没有请求此邮件，请忽略',
  POWERED_BY_BETTER_AUTH: '由 Better Auth 提供支持',
}

const resetPasswordZh = {
  RESET_YOUR_PASSWORD: '重置你的密码',
  LOGO: 'Logo',
  WE_RECEIVED_REQUEST_TO_RESET_PASSWORD: '我们收到了重置你 {appName} 账号密码的请求',
  RESET_PASSWORD: '重置密码',
  OR_COPY_AND_PASTE_URL: '或复制并粘贴以下链接到浏览器：',
  THIS_LINK_EXPIRES_IN_MINUTES: '此链接将在 {expirationMinutes} 分钟后过期',
  EMAIL_SENT_BY: '邮件由',
  IF_YOU_DIDNT_REQUEST_PASSWORD_RESET: '如果你没有请求重置密码，请忽略此邮件',
  POWERED_BY_BETTER_AUTH: '由 Better Auth 提供支持',
}

async function send(to: string, subject: string, template: React.ReactElement) {
  const html = await render(template)
  const { data, error } = await resend.emails.send({ from, to, subject, html })

  if (error) {
    console.error(`[email] send to ${to} failed:`, error)
    return
  }
  // 开发时输出发送结果，便于调试
  // eslint-disable-next-line no-console
  console.log(`[email] sent to ${to}: ${data?.id}`)
}

/** 邮箱验证邮件（随请求语言切换中英文） */
export function sendVerificationEmail(to: string, url: string, lang: MailLang = 'zh') {
  const subject = `${lang === 'zh' ? '验证你的邮箱' : 'Verify your email'} - ${appName}`
  const template = (
    <EmailVerificationEmail
      url={url}
      email={to}
      appName={appName}
      colors={brandColors}
      localization={lang === 'zh' ? verifyEmailZh : undefined}
    />
  )
  return send(to, subject, template)
}

/** 魔法链接登录邮件（随请求语言切换中英文） */
export function sendMagicLinkEmail(to: string, url: string, lang: MailLang = 'zh') {
  const subject = `${lang === 'zh' ? '登录链接' : 'Sign in'} - ${appName}`
  const template = (
    <MagicLinkEmail
      url={url}
      email={to}
      appName={appName}
      colors={brandColors}
      localization={lang === 'zh' ? magicLinkZh : undefined}
    />
  )
  return send(to, subject, template)
}

/** 重置密码邮件（随请求语言切换中英文） */
export function sendResetPasswordEmail(to: string, url: string, lang: MailLang = 'zh') {
  const subject = `${lang === 'zh' ? '重置密码' : 'Reset password'} - ${appName}`
  const template = (
    <ResetPasswordEmail
      url={url}
      email={to}
      appName={appName}
      colors={brandColors}
      localization={lang === 'zh' ? resetPasswordZh : undefined}
    />
  )
  return send(to, subject, template)
}

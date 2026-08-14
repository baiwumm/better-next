import type { MailLang } from './email'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins/admin'
import { eq } from 'drizzle-orm'
import { db } from '../server/db'
import * as schema from '../server/db/schema'
import { sendMagicLinkEmail, sendResetPasswordEmail, sendVerificationEmail } from './email'

/** 从请求 cookie 读取语言（app-lang），默认 zh */
function getLangFromRequest(request?: Request): MailLang {
  const cookie = request?.headers.get('cookie') ?? ''
  return /(?:^|; )app-lang=en(?:;|$)/.test(cookie) ? 'en' : 'zh'
}

/**
 * 真实邮件发送：Resend + better-auth-ui 邮件模板（见 ./email）。
 */
function logEmail(subject: string, url: string) {
  // 保留控制台输出兜底（如 RESEND_API_KEY 缺失时）
  // eslint-disable-next-line no-console
  console.log(`\n=== [DEMO EMAIL] ${subject} ===\n${url}\n=========================\n`)
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  session: {
    // 会话持久化到数据库；cookieCache（默认启用）使用 `<token>.<签名>` 紧凑 cookie 格式。
    // 必须保持启用：若关闭，better-auth 无法识别历史 cookieCache 格式的 cookie，
    // 会把整个值当 base64 解析（遇 `.` 报 Invalid Base64 character），导致会话/登录报错。
    storeSessionInDatabase: true,
    cookieCache: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }, request) => {
      const lang = getLangFromRequest(request)
      if (process.env.RESEND_API_KEY) {
        await sendResetPasswordEmail(user.email, url, lang)
      }
      else {
        logEmail(`Reset password for ${user.email}`, url)
      }
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }, request) => {
      const lang = getLangFromRequest(request)
      if (process.env.RESEND_API_KEY) {
        await sendVerificationEmail(user.email, url, lang)
      }
      else {
        logEmail(`Verify email for ${user.email}`, url)
      }
    },
    sendOnSignUp: true,
  },
  magicLink: {
    sendMagicLink: async (data: { email: string, url: string, token: string }, request?: Request) => {
      const lang = getLangFromRequest(request)
      if (process.env.RESEND_API_KEY) {
        await sendMagicLinkEmail(data.email, data.url, lang)
      }
      else {
        logEmail(`Magic link for ${data.email} (token: ${data.token})`, data.url)
      }
    },
  },
  // 登录/注册/登出 → login_log
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          await db.insert(schema.loginLog).values({
            userId: createdUser.id,
            username: createdUser.email,
            type: 'register',
            status: 'success',
          })
        },
      },
    },
    session: {
      create: {
        after: async (createdSession) => {
          const [u] = await db
            .select({ email: schema.user.email })
            .from(schema.user)
            .where(eq(schema.user.id, createdSession.userId))
          await db.insert(schema.loginLog).values({
            userId: createdSession.userId,
            username: u?.email ?? null,
            type: 'login',
            method: 'password',
            status: 'success',
          })
        },
      },
      delete: {
        after: async (deletedSession) => {
          await db.insert(schema.loginLog).values({
            userId: deletedSession.userId,
            type: 'logout',
            status: 'success',
          })
        },
      },
    },
  },
  plugins: [admin()],
})

export type Session = typeof auth.$Infer.Session

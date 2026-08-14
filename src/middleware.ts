import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const READONLY = process.env.APP_READONLY === 'true'

/**
 * 中间件职责：
 * 1. 只读演示模式（APP_READONLY=true，线上）：拦截所有非 GET 业务请求（/api/auth/* 放行，
 *    登录/注册/登出仍可用），返回统一 403。
 * 2. 登录态守卫由 (dashboard)/layout 的服务端 session 校验承担（middleware 不重复做 Edge 鉴权）。
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  if (READONLY && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && !pathname.startsWith('/api/auth/')) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'E_READONLY' },
        { status: 403 },
      )
    }
    return new NextResponse('Read-only demo mode: write operations are disabled', { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * 排除静态资源与 Next 内部路径
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

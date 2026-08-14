'use client'

import { SignIn } from '@better-auth-ui/heroui'
import { useDemoLoginPrefill } from '@/components/auth/demo-login-prefill'

export default function SignInPage() {
  useDemoLoginPrefill()

  return <SignIn />
}

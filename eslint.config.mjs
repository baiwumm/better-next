import antfu from '@antfu/eslint-config'

export default antfu({
  next: true,
  react: true,
  typescript: true,
  ignores: [
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'drizzle/**',
  ],
  rules: {
    // Next.js 全局注入 process.env，无需显式 import
    'node/prefer-global/process': 'off',
    // 主题防闪烁内联脚本是合理用例（静态内容，无用户输入）
    'react/dom-no-dangerously-set-innerhtml': 'off',
  },
})

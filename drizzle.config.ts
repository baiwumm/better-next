import { defineConfig } from 'drizzle-kit'

// Next.js 使用 .env.local；Node 20.12+ 支持 process.loadEnvFile
process.loadEnvFile?.('.env.local')

export default defineConfig({
  schema: ['./src/server/db/schema.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})

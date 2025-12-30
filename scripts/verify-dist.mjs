import { access } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'

const requiredFiles = [
  'index.html',
  'login.html',
  'register.html',
  'onboarding.html',
  'book.html',
  'provider-onboarding.html',
  'provider-feed.html'
]

async function main() {
  const distDir = fileURLToPath(new URL('../dist/', import.meta.url))
  const checks = await Promise.all(
    requiredFiles.map(async (file) => {
      try {
        await access(join(distDir, file))
        return null
      } catch {
        return file
      }
    })
  )

  const missing = checks.filter(Boolean)
  if (missing.length) {
    console.error(`Missing build outputs: ${missing.join(', ')}`)
    process.exit(1)
  }
}

main()

const fs = require('fs')
const path = require('path')

const target = path.join(__dirname, '../src/actions/__tests__/pos.test.ts')
let content = fs.readFileSync(target, 'utf8')

if (!content.includes("vi.mock('@/lib/access'")) {
  const mockCode = `
vi.mock('@/lib/access', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    branchFilterFor: vi.fn(async (session) => {
      if (!session?.user?.branchId) return null
      return [session.user.branchId]
    })
  }
})
`
  // Insert after the imports
  content = content.replace("import type { TestDb } from '@/test/db'", "import type { TestDb } from '@/test/db'\n" + mockCode)
  fs.writeFileSync(target, content, 'utf8')
  console.log('Successfully patched pos.test.ts')
} else {
  console.log('Already patched')
}

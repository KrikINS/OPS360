const fs = require('fs')
let content = fs.readFileSync('src/actions/__tests__/service.test.ts', 'utf8')
content = content.replace(/\r\n/g, '\n')

// 1. Add import for schema
if (!content.includes("import * as schema from '@/db/schema'")) {
  content = content.replace(
    "import { getServerSession } from 'next-auth'",
    "import { getServerSession } from 'next-auth'\nimport * as schema from '@/db/schema'"
  )
}

// 2. Add helper function at the top
const helperCode = `
async function setupUserAccess(db: TestDb, userId: string, role: string, branchId: string) {
  await db.insert(schema.users).values({ id: userId, email: userId + '@test.com', password_hash: 'xxx', role }).onConflictDoNothing()
  if (role !== 'admin' && role !== 'super_admin') {
    await db.insert(schema.user_branch_access).values({ user_id: userId, branch_id: branchId }).onConflictDoNothing()
  }
}
`

if (!content.includes('setupUserAccess')) {
  content = content.replace(
    "const STAFF_ID   = '00000000-0000-0000-0000-000000000002'",
    "const STAFF_ID   = '00000000-0000-0000-0000-000000000002'\n" + helperCode
  )
}

// 3. Inject setupUserAccess into every test right before vi.mocked(getServerSession)
content = content.replace(
  /vi\.mocked\(getServerSession\)\.mockResolvedValueOnce\(\{\n\s*user: \{ id: (STAFF_ID|MANAGER_ID), branchId: (branch\.id|branch1\.id), role: '(staff|manager)' \},\n\s*\}\)/g,
  `await setupUserAccess(db, $1, '$3', $2)\n    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: $1, branchId: $2, role: '$3' },
    })`
)

fs.writeFileSync('src/actions/__tests__/service.test.ts', content)
console.log('Fixed service tests with user access')

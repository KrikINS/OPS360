const fs = require('fs')

let testContent = fs.readFileSync('src/actions/__tests__/hr.test.ts', 'utf8')

// Add user_branch_access seeding
if (!testContent.includes('setupUserAccess')) {
  testContent = testContent.replace(
    "import {",
    "import { user_branch_access } from '@/db/schema'\nimport { eq } from 'drizzle-orm'\nimport {"
  )

  const setupUserAccess = `
// Seed branch access so branchFilterFor doesn't block users
async function setupUserAccess(dbInstance: TestDb, branchId: string, userIds: string[]) {
  for (const uid of userIds) {
    await dbInstance.insert(user_branch_access).values({
      user_id: uid,
      branch_id: branchId,
    })
  }
}
`
  testContent = testContent.replace(
    "const STAFF_ID   = '00000000-0000-0000-0000-000000000002'",
    "const STAFF_ID   = '00000000-0000-0000-0000-000000000002'\n" + setupUserAccess
  )

  // Replace `const branch = await seedBranch(db)` with `const branch = await seedBranch(db)\n    await setupUserAccess(db, branch.id, [MANAGER_ID, STAFF_ID])`
  testContent = testContent.replace(
    /const branch = await seedBranch\(db\)/g,
    "const branch = await seedBranch(db)\n    await setupUserAccess(db, branch.id, [MANAGER_ID, STAFF_ID])"
  )
}

fs.writeFileSync('src/actions/__tests__/hr.test.ts', testContent)
console.log('Patched hr.test.ts setupUserAccess')

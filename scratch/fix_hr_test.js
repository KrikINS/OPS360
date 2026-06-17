const fs = require('fs')

// Fix hr.test.ts
let testContent = fs.readFileSync('src/actions/__tests__/hr.test.ts', 'utf8')
testContent = testContent.replace(
  /expect\(result\.error\)\.toMatch\(\/manager\/i\)/g,
  "expect(result.error).toMatch(/permission/i)"
)
fs.writeFileSync('src/actions/__tests__/hr.test.ts', testContent)
console.log('Patched hr.test.ts')

// Fix getActivityLog in hr.ts
let hrContent = fs.readFileSync('src/actions/hr.ts', 'utf8')
// normalize
hrContent = hrContent.replace(/\r\n/g, '\n')

const oldLogBlock = `  if (!await hasCapability('hr', 'view', session)) {
    return { success: false as const, error: 'Insufficient permission: hr view required' }
  }
  const allowedBranches = await branchFilterFor(session)

  const effectiveUserId: string | null = input.userId ?? null
  const effectiveBranchIdFromCookie = await getEffectiveBranchId(session)
  const effectiveBranchId: string | null = input.branchId ?? (allowedBranches !== null ? effectiveBranchIdFromCookie : null)
  if (effectiveBranchId && allowedBranches !== null && !allowedBranches.includes(effectiveBranchId)) {
    return { success: false as const, error: "You don't have access to this branch" }
  }`

const newLogBlock = `  const canViewAll = await hasCapability('hr', 'view', session)
  const allowedBranches = await branchFilterFor(session)

  if (!canViewAll && input.userId && input.userId !== session.user.id) {
    return { success: false as const, error: 'Insufficient permission: hr view required' }
  }

  const effectiveUserId: string | null = canViewAll ? (input.userId ?? null) : session.user.id
  const effectiveBranchIdFromCookie = await getEffectiveBranchId(session)
  const effectiveBranchId: string | null = canViewAll
    ? (input.branchId ?? (allowedBranches !== null ? effectiveBranchIdFromCookie : null))
    : effectiveBranchIdFromCookie

  if (effectiveBranchId && allowedBranches !== null && !allowedBranches.includes(effectiveBranchId)) {
    return { success: false as const, error: "You don't have access to this branch" }
  }`

if (hrContent.includes(oldLogBlock)) {
  hrContent = hrContent.replace(oldLogBlock, newLogBlock)
  fs.writeFileSync('src/actions/hr.ts', hrContent)
  console.log('Patched hr.ts getActivityLog')
} else {
  console.error('Could not find oldLogBlock in hr.ts')
}

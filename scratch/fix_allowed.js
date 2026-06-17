const fs = require('fs')
let content = fs.readFileSync('src/actions/service.ts', 'utf8')
content = content.replace(/\r\n/g, '\n')

// In updateJobStatus
content = content.replace(
  `  const allowed = await branchFilterFor(session, "service", "edit")
  if (allowed !== null && existing.branch_id && !allowed.includes(existing.branch_id)) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`,
  `  const allowedBranches = await branchFilterFor(session, "service", "edit")
  if (allowedBranches !== null && existing.branch_id && !allowedBranches.includes(existing.branch_id)) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`
)

// In completeServiceJob
content = content.replace(
  `  const allowed = await branchFilterFor(session, "service", "edit")
  if (allowed !== null && existing.branch_id && !allowed.includes(existing.branch_id)) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`,
  `  const allowedBranches = await branchFilterFor(session, "service", "edit")
  if (allowedBranches !== null && existing.branch_id && !allowedBranches.includes(existing.branch_id)) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`
)

fs.writeFileSync('src/actions/service.ts', content)
console.log('Fixed allowedBranches.')

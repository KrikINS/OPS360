const fs = require('fs')
let content = fs.readFileSync('src/actions/service.ts', 'utf8')

// 1.1 createServiceJob is fine. I will just replace the rest using Regex.

// 1.2 updateJobStatus
content = content.replace(
  /const role = \(session\.user\.role \?\? ''\)\.toLowerCase\(\)\n\s*const isAdmin = \['admin', 'super_admin', 'admin\/owner'\]\.includes\(role\)\n\s*const effectiveBranchId = await getEffectiveBranchId\(session\);\n\s*if \(!isAdmin && existing\.branch_id !== effectiveBranchId\) {\n\s*return \{ success: false as const, error: 'Unauthorized — job belongs to a different branch' \}\n\s*\}/g,
  `if (!(await hasCapability("service", "edit", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }
  const allowed = await branchFilterFor(session, "service", "edit")
  if (allowed !== null && existing.branch_id && !allowed.includes(existing.branch_id)) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`
)

// 1.3 assignTechnician
content = content.replace(
  /const role = \(session\.user\.role \?\? ''\)\.toLowerCase\(\)\n\s*const isManager = \['admin', 'super_admin', 'admin\/owner', 'manager'\]\.includes\(role\)\n\s*if \(!isManager\) {\n\s*return \{ success: false as const, error: 'Manager role required to assign technicians' \}\n\s*\}/g,
  `if (!(await hasCapability("service", "approve", session))) {
    return { success: false as const, error: 'Insufficient permission: approval required' }
  }
  const allowed = await branchFilterFor(session, "service", "approve")
  if (allowed !== null && existing.branch_id && !allowed.includes(existing.branch_id)) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`
)

// 1.4 getServiceJobs
content = content.replace(
  /const role = \(session\.user\.role \?\? ''\)\.toLowerCase\(\)\n\s*const isAdmin = \['admin', 'super_admin', 'admin\/owner'\]\.includes\(role\)\n\n\s*try {\n\s*const conditions = \[\]\n\n\s*if \(!isAdmin\) {\n\s*const effectiveBranchId = await getEffectiveBranchId\(session\);\n\s*if \(effectiveBranchId\) {\n\s*conditions\.push\(eq\(service_jobs\.branch_id, effectiveBranchId\)\)\n\s*}\n\s*}/g,
  `if (!(await hasCapability("service", "view", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }

  try {
    const conditions = []
    const allowed = await branchFilterFor(session, "service", "view")
    if (allowed !== null) {
      if (allowed.length === 0) {
        return { success: true as const, jobs: [] }
      }
      conditions.push(inArray(service_jobs.branch_id, allowed))
    }`
)

// 1.5 getServiceJobById
content = content.replace(
  /const role = \(session\.user\.role \?\? ''\)\.toLowerCase\(\)\n\s*const isAdmin = \['admin', 'super_admin', 'admin\/owner'\]\.includes\(role\)\n\s*const effectiveBranchId = await getEffectiveBranchId\(session\);\n\s*if \(!isAdmin && job\.branchId !== effectiveBranchId\) {\n\s*return \{ success: false as const, error: 'Unauthorized' \}\n\s*\}/g,
  `if (!(await hasCapability("service", "view", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }
  const allowed = await branchFilterFor(session, "service", "view")
  if (allowed !== null && job.branchId && !allowed.includes(job.branchId)) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`
)

fs.writeFileSync('src/actions/service.ts', content)
console.log('Patch 2 complete')

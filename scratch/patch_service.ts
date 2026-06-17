import fs from 'fs'

let content = fs.readFileSync('src/actions/service.ts', 'utf8')

// 1. Add imports
if (!content.includes('import { hasCapability, branchFilterFor }')) {
  content = content.replace(
    "import { getEffectiveBranchId } from '@/app/actions/_utils/branch'",
    "import { getEffectiveBranchId } from '@/app/actions/_utils/branch'\nimport { hasCapability, branchFilterFor } from '@/lib/access'"
  )
  content = content.replace(
    "import { eq, and, desc, sql } from 'drizzle-orm'",
    "import { eq, and, desc, sql, inArray } from 'drizzle-orm'"
  )
}

// 1.1 createServiceJob
content = content.replace(
  `  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }
  const effectiveBranchId = await getEffectiveBranchId(session);`,
  `  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }
  if (!(await hasCapability("service", "edit", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }
  const allowed = await branchFilterFor(session, "service", "edit")
  const effectiveBranchId = await getEffectiveBranchId(session);
  if (allowed !== null && effectiveBranchId && !allowed.includes(effectiveBranchId)) {
    return { success: false as const, error: "You don't have access to this branch" }
  }`
)

// 1.2 updateJobStatus
content = content.replace(
  `  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)
  const effectiveBranchId = await getEffectiveBranchId(session);

  if (!isAdmin && existing.branch_id !== effectiveBranchId) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`,
  `  if (!(await hasCapability("service", "edit", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }
  const allowed = await branchFilterFor(session, "service", "edit")
  if (allowed !== null && existing.branch_id && !allowed.includes(existing.branch_id)) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`
)

// 1.3 assignTechnician
content = content.replace(
  `  const role = (session.user.role ?? '').toLowerCase()
  const isManager = ['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)
  if (!isManager) {
    return { success: false as const, error: 'Insufficient permission: assignment requires manager role' }
  }
  const effectiveBranchId = await getEffectiveBranchId(session);

  if (!['admin', 'super_admin', 'admin/owner'].includes(role) && existing.branch_id !== effectiveBranchId) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`,
  `  if (!(await hasCapability("service", "approve", session))) {
    return { success: false as const, error: 'Insufficient permission: approval required' }
  }
  const allowed = await branchFilterFor(session, "service", "approve")
  if (allowed !== null && existing.branch_id && !allowed.includes(existing.branch_id)) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`
)

// 1.4 getServiceJobs
content = content.replace(
  `  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)

  try {
    const conditions = []
    
    // Non-admins only see jobs for their active branch
    if (!isAdmin) {
      const effectiveBranchId = await getEffectiveBranchId(session);
      if (effectiveBranchId) {
        conditions.push(eq(service_jobs.branch_id, effectiveBranchId))
      }
    }`,
  `  if (!(await hasCapability("service", "view", session))) {
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
  `  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)
  const effectiveBranchId = await getEffectiveBranchId(session);

  if (!isAdmin && job.branch_id !== effectiveBranchId) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`,
  `  if (!(await hasCapability("service", "view", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }
  const allowed = await branchFilterFor(session, "service", "view")
  if (allowed !== null && job.branch_id && !allowed.includes(job.branch_id)) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`
)

// 1.6 checkWarranty
content = content.replace(
  `export async function checkWarranty(input: {
  serial_number?: string
  invoice_id?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }`,
  `export async function checkWarranty(input: {
  serial_number?: string
  invoice_id?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }
  if (!(await hasCapability("service", "view", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }`
)

// 1.7 completeServiceJob
content = content.replace(
  `export async function completeServiceJob(input: {
  jobId: string
  resolution_notes?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }`,
  `export async function completeServiceJob(input: {
  jobId: string
  resolution_notes?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }
  if (!(await hasCapability("service", "edit", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }`
)

// Add branch_id to completeServiceJob select
content = content.replace(
  `  const [existing] = await db
    .select({
      status: service_jobs.status
    })
    .from(service_jobs)`,
  `  const [existing] = await db
    .select({
      status: service_jobs.status,
      branch_id: service_jobs.branch_id
    })
    .from(service_jobs)`
)

// Add branch fence to completeServiceJob
content = content.replace(
  `  if (!existing) {
    return { success: false as const, error: 'Job not found' }
  }`,
  `  if (!existing) {
    return { success: false as const, error: 'Job not found' }
  }
  const allowed = await branchFilterFor(session, "service", "edit")
  if (allowed !== null && existing.branch_id && !allowed.includes(existing.branch_id)) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`
)

// 1.8 registerWarranty
content = content.replace(
  `export async function registerWarranty(input: {
  customer_id: string
  product_id: string
  serial_number: string
  invoice_id?: string
  purchase_date: Date
  warranty_period_days: number
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }`,
  `export async function registerWarranty(input: {
  customer_id: string
  product_id: string
  serial_number: string
  invoice_id?: string
  purchase_date: Date
  warranty_period_days: number
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }
  if (!(await hasCapability("service", "edit", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }`
)

// 1.9 getWarrantyRegistrations
content = content.replace(
  `export async function getWarrantyRegistrations(input: {
  search?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }`,
  `export async function getWarrantyRegistrations(input: {
  search?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }
  if (!(await hasCapability("service", "view", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }`
)

fs.writeFileSync('src/actions/service.ts', content)
console.log('Patch complete.')

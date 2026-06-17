const fs = require('fs')

let content = fs.readFileSync('src/actions/service.ts', 'utf8')
content = content.replace(/\r\n/g, '\n') // Normalize before patching

function patch(oldStr, newStr) {
  if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr)
    console.log('Successfully patched chunk')
  } else {
    console.log('FAILED to find chunk:\n', oldStr)
  }
}

// 0. Imports
patch(
  "import { getEffectiveBranchId } from '@/app/actions/_utils/branch'\nimport {\n  service_jobs,",
  "import { getEffectiveBranchId } from '@/app/actions/_utils/branch'\nimport { hasCapability, branchFilterFor } from '@/lib/access'\nimport {\n  service_jobs,"
)
patch(
  "import { eq, and, desc, sql } from 'drizzle-orm'",
  "import { eq, and, desc, sql, inArray } from 'drizzle-orm'"
)

// 1.1 createServiceJob
patch(
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
patch(
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
patch(
  `  const role = (session.user.role ?? '').toLowerCase()
  const isManager = ['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)
  if (!isManager) {
    return { success: false as const, error: 'Manager role required to assign technicians' }
  }

  const [existing] = await db
    .select()
    .from(service_jobs)
    .where(eq(service_jobs.id, input.jobId))
    .limit(1)

  if (!existing) {
    return { success: false as const, error: 'Job not found' }
  }`,
  `  if (!(await hasCapability("service", "approve", session))) {
    return { success: false as const, error: 'Insufficient permission: approval required' }
  }

  const [existing] = await db
    .select()
    .from(service_jobs)
    .where(eq(service_jobs.id, input.jobId))
    .limit(1)

  if (!existing) {
    return { success: false as const, error: 'Job not found' }
  }
  const allowed = await branchFilterFor(session, "service", "approve")
  if (allowed !== null && existing.branch_id && !allowed.includes(existing.branch_id)) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`
)

// 1.4 getServiceJobs
patch(
  `  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)

  try {
    const conditions = []

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
patch(
  `  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)
  const effectiveBranchId = await getEffectiveBranchId(session);
  if (!isAdmin && job.branchId !== effectiveBranchId) {
    return { success: false as const, error: 'Unauthorized' }
  }`,
  `  if (!(await hasCapability("service", "view", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }
  const allowed = await branchFilterFor(session, "service", "view")
  if (allowed !== null && job.branchId && !allowed.includes(job.branchId)) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`
)

// 1.6 checkWarranty
patch(
  `export async function checkWarranty(serialNumber: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  if (!serialNumber?.trim()) return { success: false as const, error: 'Serial number required' }`,
  `export async function checkWarranty(serialNumber: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  if (!(await hasCapability("service", "view", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }
  if (!serialNumber?.trim()) return { success: false as const, error: 'Serial number required' }`
)

// 1.7 completeServiceJob (part 1)
patch(
  `export async function completeServiceJob(input: {
  jobId: string
  actualCost?: number
  resolutionNotes?: string
  paymentMethod?: 'cash' | 'bank'
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }`,
  `export async function completeServiceJob(input: {
  jobId: string
  actualCost?: number
  resolutionNotes?: string
  paymentMethod?: 'cash' | 'bank'
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  if (!(await hasCapability("service", "edit", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }`
)

// 1.7 completeServiceJob (part 2 - add branch_id to select and fence)
patch(
  `  const [existing] = await db
    .select({ status: service_jobs.status })
    .from(service_jobs)
    .where(eq(service_jobs.id, input.jobId))
    .limit(1)

  if (!existing) return { success: false as const, error: 'Job not found' }`,
  `  const [existing] = await db
    .select({ status: service_jobs.status, branch_id: service_jobs.branch_id })
    .from(service_jobs)
    .where(eq(service_jobs.id, input.jobId))
    .limit(1)

  if (!existing) return { success: false as const, error: 'Job not found' }
  const allowed = await branchFilterFor(session, "service", "edit")
  if (allowed !== null && existing.branch_id && !allowed.includes(existing.branch_id)) {
    return { success: false as const, error: 'Unauthorized — job belongs to a different branch' }
  }`
)

// 1.8 registerWarranty
patch(
  `export async function registerWarranty(input: {
  serialNumber: string
  productId: string
  customerId?: string
  invoiceId?: string
  purchaseDate: string
  warrantyMonths: number
  notes?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }`,
  `export async function registerWarranty(input: {
  serialNumber: string
  productId: string
  customerId?: string
  invoiceId?: string
  purchaseDate: string
  warrantyMonths: number
  notes?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  if (!(await hasCapability("service", "edit", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }`
)

// 1.9 getWarrantyRegistrations
patch(
  `export async function getWarrantyRegistrations(input?: {
  status?: 'active' | 'expired' | 'all'
  search?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }`,
  `export async function getWarrantyRegistrations(input?: {
  status?: 'active' | 'expired' | 'all'
  search?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  if (!(await hasCapability("service", "view", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }`
)

fs.writeFileSync('src/actions/service.ts', content)
console.log('Patch complete.')

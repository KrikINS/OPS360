const fs = require('fs')
let content = fs.readFileSync('src/actions/hr.ts', 'utf8')

// Normalize line endings for replacement mapping
content = content.replace(/\r\n/g, '\n')

// Add imports
if (!content.includes("import { hasCapability, branchFilterFor } from '@/lib/rbac'")) {
  content = content.replace(
    "import { getEffectiveBranchId } from '@/app/actions/_utils/branch'",
    "import { getEffectiveBranchId } from '@/app/actions/_utils/branch'\nimport { hasCapability, branchFilterFor } from '@/lib/rbac'"
  )
}

// Helper to replace block
function replaceCheck(fnName, oldStr, newStr) {
  if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr)
  } else {
    console.error('Could not find string for ' + fnName)
  }
}

// 1. getStaffDirectory
replaceCheck('getStaffDirectory',
`  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)

  try {
    // ---- Auto-sync backfill step ----`,
`  if (!hasCapability(session.user.role, 'hr', 'view')) {
    return { success: false as const, error: 'Insufficient permission: hr view required' }
  }
  const allowedBranches = await branchFilterFor(session.user)

  try {
    // ---- Auto-sync backfill step ----`)

replaceCheck('getStaffDirectory2',
`    const conditions = [eq(employees.status, 'active')];

    if (!isAdmin) {
      const effectiveBranchId = await getEffectiveBranchId(session);
      if (!effectiveBranchId) {
        return { success: false as const, error: 'No branch assigned to your account' };
      }
      conditions.push(eq(employees.branch_id, effectiveBranchId));
    } else if (input?.branchId) {
      conditions.push(eq(employees.branch_id, input.branchId));
    }`,
`    const conditions = [eq(employees.status, 'active')];

    if (allowedBranches !== null) {
      if (allowedBranches.length === 0) {
        return { success: false as const, error: "You don't have access to any branches" };
      }
      conditions.push(inArray(employees.branch_id, allowedBranches));
    }
    if (input?.branchId) {
      // If scoped, must ensure they are allowed to see it
      if (allowedBranches !== null && !allowedBranches.includes(input.branchId)) {
        return { success: false as const, error: "You don't have access to this branch" };
      }
      conditions.push(eq(employees.branch_id, input.branchId));
    }`)

// 2. createNonErpStaffMember
replaceCheck('createNonErpStaffMember',
`  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)
  if (!isAdmin) {
    return { success: false as const, error: 'Admin role required' }
  }`,
`  if (!hasCapability(session.user.role, 'hr', 'edit')) {
    return { success: false as const, error: 'Insufficient permission: hr edit required' }
  }
  const allowedBranches = await branchFilterFor(session.user)
  if (data.branchId && allowedBranches !== null && !allowedBranches.includes(data.branchId)) {
    return { success: false as const, error: "You don't have access to this branch" }
  }`)

// 3. getAttendanceByBranch
replaceCheck('getAttendanceByBranch',
`  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)
  if (!isAdmin) {
    return { success: false as const, error: 'Manager role required' }
  }

  const effectiveBranchIdFromCookie = await getEffectiveBranchId(session);
  const targetBranchId = input.branchId ?? effectiveBranchIdFromCookie;
  if (!targetBranchId) {
    return { success: false as const, error: 'No branch specified' }
  }`,
`  if (!hasCapability(session.user.role, 'hr', 'view')) {
    return { success: false as const, error: 'Insufficient permission: hr view required' }
  }
  const allowedBranches = await branchFilterFor(session.user)

  const effectiveBranchIdFromCookie = await getEffectiveBranchId(session);
  const targetBranchId = input.branchId ?? effectiveBranchIdFromCookie;
  if (!targetBranchId) {
    return { success: false as const, error: 'No branch specified' }
  }
  if (allowedBranches !== null && !allowedBranches.includes(targetBranchId)) {
    return { success: false as const, error: "You don't have access to this branch" }
  }`)

// 4. correctAttendance
replaceCheck('correctAttendance',
`  const role = (session.user.role ?? '').toLowerCase()
  const isManager = ['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)
  if (!isManager) {
    return { success: false as const, error: 'Manager role required to correct attendance' }
  }`,
`  if (!hasCapability(session.user.role, 'hr', 'edit')) {
    return { success: false as const, error: 'Insufficient permission: hr edit required' }
  }`)

// 5. getActivityLog
replaceCheck('getActivityLog',
`  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)
  const isManager = isAdmin || role === 'manager'

  const effectiveUserId: string | null = isManager
    ? (input.userId ?? null)
    : session.user.id
  const effectiveBranchIdFromCookie = await getEffectiveBranchId(session);
  const effectiveBranchId: string | null = isAdmin
    ? (input.branchId ?? null)
    : effectiveBranchIdFromCookie`,
`  const allowedBranches = await branchFilterFor(session.user)
  const isManager = hasCapability(session.user.role, 'hr', 'view')

  const effectiveUserId: string | null = isManager
    ? (input.userId ?? null)
    : session.user.id
  const effectiveBranchIdFromCookie = await getEffectiveBranchId(session);
  const effectiveBranchId: string | null = isManager
    ? (input.branchId ?? (allowedBranches !== null ? effectiveBranchIdFromCookie : null))
    : effectiveBranchIdFromCookie
  if (effectiveBranchId && allowedBranches !== null && !allowedBranches.includes(effectiveBranchId)) {
    return { success: false as const, error: "You don't have access to this branch" }
  }`)

// 6. processPayrollRun
replaceCheck('processPayrollRun',
`  const role = (session.user.role ?? '').toLowerCase()
  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {
    return { success: false as const, error: 'Manager role required' }
  }`,
`  if (!hasCapability(session.user.role, 'hr', 'edit')) {
    return { success: false as const, error: 'Insufficient permission: hr edit required' }
  }
  const allowedBranches = await branchFilterFor(session.user)
  if (allowedBranches !== null && !allowedBranches.includes(input.branchId)) {
    return { success: false as const, error: "You don't have access to this branch" }
  }`)

// 7. getPayrollRuns
replaceCheck('getPayrollRuns',
`  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)

  try {
    const effectiveBranchId = isAdmin
      ? (input?.branchId ?? null)
      : (await getEffectiveBranchId(session))`,
`  if (!hasCapability(session.user.role, 'hr', 'view')) {
    return { success: false as const, error: 'Insufficient permission: hr view required' }
  }
  const allowedBranches = await branchFilterFor(session.user)

  try {
    const effectiveBranchId = input?.branchId ?? (allowedBranches !== null ? await getEffectiveBranchId(session) : null)
    if (effectiveBranchId && allowedBranches !== null && !allowedBranches.includes(effectiveBranchId)) {
      return { success: false as const, error: "You don't have access to this branch" }
    }`)

replaceCheck('getPayrollRuns2',
`    if (effectiveBranchId) {
      query.where(eq(payroll_runs.branch_id, effectiveBranchId))
    }`,
`    if (effectiveBranchId) {
      query.where(eq(payroll_runs.branch_id, effectiveBranchId))
    } else if (allowedBranches !== null) {
      query.where(inArray(payroll_runs.branch_id, allowedBranches))
    }`)

// 8. getPayslips
replaceCheck('getPayslips',
`export async function getPayslips(input: { payrollRunId: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }`,
`export async function getPayslips(input: { payrollRunId: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }
  if (!hasCapability(session.user.role, 'hr', 'view')) {
    return { success: false as const, error: 'Insufficient permission: hr view required' }
  }`)

// 9. getEmployeesWithStructures
replaceCheck('getEmployeesWithStructures',
`export async function getEmployeesWithStructures(input?: { branchId?: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  try {`,
`export async function getEmployeesWithStructures(input?: { branchId?: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  if (!hasCapability(session.user.role, 'hr', 'view')) {
    return { success: false as const, error: 'Insufficient permission: hr view required' }
  }
  const allowedBranches = await branchFilterFor(session.user)
  if (input?.branchId && allowedBranches !== null && !allowedBranches.includes(input.branchId)) {
    return { success: false as const, error: "You don't have access to this branch" }
  }
  try {`)

replaceCheck('getEmployeesWithStructures2',
`      .where(
        and(
          eq(employees.status, 'active'),
          input?.branchId ? eq(employees.branch_id, input.branchId) : undefined
        )
      )`,
`      .where(
        and(
          eq(employees.status, 'active'),
          input?.branchId ? eq(employees.branch_id, input.branchId) : undefined,
          allowedBranches !== null && !input?.branchId ? inArray(employees.branch_id, allowedBranches) : undefined
        )
      )`)

// 10. upsertEmployeeDetails
replaceCheck('upsertEmployeeDetails',
`  const role = (session.user.role ?? '').toLowerCase()
  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {
    return { success: false as const, error: 'Manager role required' }
  }`,
`  if (!hasCapability(session.user.role, 'hr', 'edit')) {
    return { success: false as const, error: 'Insufficient permission: hr edit required' }
  }`)

// 11. setSalaryStructure
replaceCheck('setSalaryStructure',
`  const role = (session.user.role ?? '').toLowerCase()
  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {
    return { success: false as const, error: 'Manager role required' }
  }`,
`  if (!hasCapability(session.user.role, 'hr', 'edit')) {
    return { success: false as const, error: 'Insufficient permission: hr edit required' }
  }`)

// 12. getSalaryStructureHistory
replaceCheck('getSalaryStructureHistory',
`export async function getSalaryStructureHistory(employeeId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  try {`,
`export async function getSalaryStructureHistory(employeeId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }
  if (!hasCapability(session.user.role, 'hr', 'view')) {
    return { success: false as const, error: 'Insufficient permission: hr view required' }
  }
  try {`)

// 13. getLeaveRequests (keep self path accessible, gate others)
replaceCheck('getLeaveRequests',
`  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)

  try {
    const rows = await db.execute(sql\`
      SELECT
        lr.id, lr.from_date, lr.to_date, lr.days,
        lr.reason, lr.status, lr.created_at,
        lr.rejection_reason,
        lt.name AS leave_type_name,
        p.full_name AS employee_name,
        ap.full_name AS approved_by_name
      FROM leave_requests lr
      JOIN leave_types lt ON lt.id = lr.leave_type_id
      JOIN profiles p ON p.id = lr.employee_id
      LEFT JOIN profiles ap ON ap.id = lr.approved_by
      WHERE (
        \${isAdmin ? sql\`TRUE\` : sql\`lr.employee_id = \${session.user.id}::uuid\`}
      )`,
`  const canViewAll = hasCapability(session.user.role, 'hr', 'view')
  
  if (!canViewAll && input?.employeeId && input.employeeId !== session.user.id) {
    return { success: false as const, error: 'Insufficient permission: hr view required to see others leave requests' }
  }

  try {
    const rows = await db.execute(sql\`
      SELECT
        lr.id, lr.from_date, lr.to_date, lr.days,
        lr.reason, lr.status, lr.created_at,
        lr.rejection_reason,
        lt.name AS leave_type_name,
        p.full_name AS employee_name,
        ap.full_name AS approved_by_name
      FROM leave_requests lr
      JOIN leave_types lt ON lt.id = lr.leave_type_id
      JOIN profiles p ON p.id = lr.employee_id
      LEFT JOIN profiles ap ON ap.id = lr.approved_by
      WHERE (
        \${canViewAll && !input?.employeeId ? sql\`TRUE\` : sql\`lr.employee_id = \${(input?.employeeId ?? session.user.id)}::uuid\`}
      )`)

// 14. approveLeaveRequest
replaceCheck('approveLeaveRequest',
`  const role = (session.user.role ?? '').toLowerCase()
  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {
    return { success: false as const, error: 'Manager role required' }
  }`,
`  if (!hasCapability(session.user.role, 'hr', 'edit')) {
    return { success: false as const, error: 'Insufficient permission: hr edit required' }
  }`)

fs.writeFileSync('src/actions/hr.ts', content)
console.log('Patched hr.ts')

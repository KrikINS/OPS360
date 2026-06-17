import fs from 'fs'
import path from 'path'

const filePath = path.join(__dirname, '../src/actions/finance.ts')
let content = fs.readFileSync(filePath, 'utf-8')

// Add imports
if (!content.includes('import { hasCapability, branchFilterFor }')) {
  content = content.replace(
    "import { authOptions } from '@/lib/auth'",
    "import { authOptions } from '@/lib/auth'\nimport { hasCapability, branchFilterFor } from '@/lib/access'\nimport { isBranchScoped, normalizeRole } from '@/lib/rbac'"
  )
}

function injectReadGuard(fnName: string, takesBranchId: boolean) {
  const searchStr = `export async function ${fnName}(`
  const index = content.indexOf(searchStr)
  if (index === -1) {
    console.log(`Could not find ${fnName}`)
    return
  }

  const authCheckStr = "if (!session?.user) return { success: false as const, error: 'Unauthorized' }"
  const authCheckIdx = content.indexOf(authCheckStr, index)
  if (authCheckIdx === -1) {
    console.log(`Could not find auth check in ${fnName}`)
    return
  }
  
  const insertPos = authCheckIdx + authCheckStr.length
  
  let guard = `\n\n  if (!(await hasCapability("finance", "view", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`

  if (takesBranchId) {
    guard += `\n  const allowed = await branchFilterFor(session, "finance", "view")\n  if (allowed !== null) {\n    if (input?.branchId && !allowed.includes(input.branchId)) {\n      return { success: false as const, error: "You don't have access to this branch" }\n    }\n    if (!input?.branchId) {\n      if (allowed.length === 0) return { success: false as const, error: "You don't have access to any branches" }\n      if (input) input.branchId = allowed[0]\n    }\n  }`
  }

  content = content.slice(0, insertPos) + guard + content.slice(insertPos)
}

// Category B Reads
injectReadGuard('getProfitAndLoss', true)
injectReadGuard('getBalanceSheet', true)
injectReadGuard('getGSTSummary', true)
injectReadGuard('getJournalEntries', true)
injectReadGuard('exportJournalLedger', true)
injectReadGuard('getExpenses', true)
injectReadGuard('getSalesReport', true)
injectReadGuard('getStockValuation', true)
injectReadGuard('getAROutstanding', true)
injectReadGuard('getVendorPayments', true)

injectReadGuard('getJournalLines', false)
injectReadGuard('getChartOfAccounts', false)
injectReadGuard('getBranches', false)
injectReadGuard('getAPBalanceForPO', false)

// Category C Writes

// approveExpense
content = content.replace(
  `  const role = (session.user.role ?? '').toLowerCase()\n  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {\n    return { success: false as const, error: 'Manager role required' }\n  }`,
  `  if (!(await hasCapability("finance", "edit", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`
)

// rejectExpense
content = content.replace(
  `  const role = (session.user.role ?? '').toLowerCase()\n  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {\n    return { success: false as const, error: 'Manager role required' }\n  }`,
  `  if (!(await hasCapability("finance", "edit", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`
)

// settleVendorPayment
content = content.replace(
  `  const role = (session.user.role ?? '').toLowerCase()\n  const isManager = ['admin', 'super_admin', 'admin/owner',\n    'manager'].includes(role)\n  if (!isManager) {\n    return {\n      success: false as const,\n      error: 'Manager role required to record payments'\n    }\n  }`,
  `  if (!(await hasCapability("finance", "edit", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`
)

// createManualJournal
content = content.replace(
  `  const role = (session.user.role ?? '').toLowerCase()\n  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {\n    return { success: false as const, error: 'Manager role required to post manual journal entries' }\n  }`,
  `  if (!(await hasCapability("finance", "edit", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`
)

// editJournalEntry
content = content.replace(
  `  const role = session?.user?.role?.toLowerCase()\n  if (!session?.user?.id || (role !== 'admin' && role !== 'owner' && role !== 'admin/owner' && role !== 'super_admin')) {\n    return { success: false, error: "Unauthorized: Only Admins or Owners can edit journal entries." }\n  }`,
  `  if (!session?.user?.id || !(await hasCapability("finance", "edit", session))) {\n    return { success: false, error: "Insufficient permission" }\n  }`
)

// createAccount
content = content.replace(
  `  const role = (session.user.role ?? '').toLowerCase()\n  if (!['admin', 'super_admin', 'admin/owner'].includes(role)) {\n    return { success: false as const, error: 'Admin role required' }\n  }`,
  `  if (!(await hasCapability("finance", "edit", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`
)

// toggleAccountStatus
content = content.replace(
  `  const role = (session.user.role ?? '').toLowerCase()\n  if (!['admin', 'super_admin', 'admin/owner'].includes(role)) {\n    return { success: false as const, error: 'Admin role required' }\n  }`,
  `  if (!(await hasCapability("finance", "edit", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`
)

// updateCustomerCredit
content = content.replace(
  `  const role = (session.user.role ?? '').toLowerCase()\n  if (!['admin', 'super_admin', 'admin/owner', 'manager'].includes(role)) {\n    return { success: false as const, error: 'Manager role required' }\n  }`,
  `  if (!(await hasCapability("finance", "edit", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`
)

// getMarginReport
content = content.replace(
  `  // Only managers and admins can see margin data\n  const role = (session.user.role ?? '').toLowerCase()\n  if (!['admin', 'super_admin', 'admin/owner', 'manager']\n    .includes(role)) {\n    return {\n      success: false as const,\n      error: 'Manager role required for margin reports'\n    }\n  }`,
  `  if (!(await hasCapability("finance", "view", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }\n  const allowed = await branchFilterFor(session, "finance", "view")\n  if (allowed !== null) {\n    if (input?.branchId && !allowed.includes(input.branchId)) {\n      return { success: false as const, error: "You don't have access to this branch" }\n    }\n    if (!input?.branchId) {\n      if (allowed.length === 0) return { success: false as const, error: "You don't have access to any branches" }\n      input.branchId = allowed[0]\n    }\n  }`
)

// getConsolidatedReport
content = content.replace(
  `  const role = (session.user.role ?? '').toLowerCase()\n  if (!['admin', 'super_admin', 'admin/owner'].includes(role)) {\n    return { success: false as const, error: 'Admin role required' }\n  }`,
  `  if (!(await hasCapability("finance", "view", session)) || isBranchScoped(normalizeRole(session.user.role ?? ''))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }`
)

// recordCreditPayment
content = content.replace(
  `  if (input.amount <= 0) return { success: false as const, error: 'Payment amount must be > 0' }`,
  `  if (!(await hasCapability("sales", "edit", session))) {\n    return { success: false as const, error: 'Insufficient permission' }\n  }\n  const allowed = await branchFilterFor(session, "sales", "edit")\n  if (allowed !== null && !allowed.includes(input.branchId)) {\n    return { success: false as const, error: "You don't have access to this branch" }\n  }\n\n  if (input.amount <= 0) return { success: false as const, error: 'Payment amount must be > 0' }`
)

// getActiveAccounts manual fix
const getActiveAccountsOld = `  const role = (session.user.role ?? '').toLowerCase()
  const isSuperAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)

  try {
    // Explicit branchId overrides session; fall back to session branch for non-admins
    let filterBranchId: string | undefined = input?.branchId
    if (!filterBranchId && !isSuperAdmin) {
      filterBranchId = await getEffectiveBranchId(session) ?? undefined
    }

    const rows = await db`

const getActiveAccountsNew = `  if (!(await hasCapability("finance", "view", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }
  const allowed = await branchFilterFor(session, "finance", "view")

  try {
    let filterBranchId: string | undefined = input?.branchId
    if (allowed !== null) {
      if (filterBranchId && !allowed.includes(filterBranchId)) {
        return { success: false as const, error: "You don't have access to this branch" }
      }
      if (!filterBranchId) {
        if (allowed.length === 0) return { success: false as const, error: "You don't have access to any branches" }
        filterBranchId = allowed[0]
      }
    }

    const rows = await db`

content = content.replace(getActiveAccountsOld, getActiveAccountsNew)

// getAPAgeing manual fix
const getAPAgeingOld = `  const role = (session.user.role ?? '').toLowerCase()
  const isAdmin = ['admin', 'super_admin', 'admin/owner'].includes(role)

  // Determine branch filter
  let effectiveBranchId = input?.branchId
  if (!isAdmin && !effectiveBranchId) {
    effectiveBranchId = (await getEffectiveBranchId(session)) ?? undefined
  }`

const getAPAgeingNew = `  if (!(await hasCapability("finance", "view", session))) {
    return { success: false as const, error: 'Insufficient permission' }
  }
  const allowed = await branchFilterFor(session, "finance", "view")

  let effectiveBranchId = input?.branchId
  if (allowed !== null) {
    if (effectiveBranchId && !allowed.includes(effectiveBranchId)) {
      return { success: false as const, error: "You don't have access to this branch" }
    }
    if (!effectiveBranchId) {
      if (allowed.length === 0) return { success: false as const, error: "You don't have access to any branches" }
      effectiveBranchId = allowed[0]
    }
  }`
content = content.replace(getAPAgeingOld, getAPAgeingNew)

fs.writeFileSync(filePath, content)
console.log('Finance patched successfully')

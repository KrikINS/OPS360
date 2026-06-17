const fs = require('fs')
const path = require('path')

const target = path.join(__dirname, '../src/app/actions/pos.ts')
let content = fs.readFileSync(target, 'utf8')

// Add import
if (!content.includes('hasCapability')) {
  content = content.replace(
    'import { cookies } from "next/headers"',
    'import { cookies } from "next/headers"\nimport { hasCapability, branchFilterFor } from "@/lib/access"'
  )
}

function insertCheck(fnName, checkCode) {
  const regex = new RegExp(`(export async function ${fnName}\\s*\\([^{]*\\)\\s*(?::\\s*[^{]+)?\\s*\\{\\n(?:\\s*try \\{\\n)?)`)
  content = content.replace(regex, `$1${checkCode}\n`)
}

// 1. getUserPosStatsAction
content = content.replace(
  /if \(!session\?\.user\?\.id\) return \{ data: \[\] \}/,
  'if (!session?.user?.id) return { data: [] }\n    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }'
)

// 2. updatePosPinAction
insertCheck('updatePosPinAction', `    const session = await getServerSession(authOptions)\n    if (!session?.user) return { error: { message: "Unauthorized" } }\n    if (session.user.id !== userId && !(await hasCapability("admin", "edit", session))) return { error: { message: "Insufficient permission" } }`)

// 3. getPosInventoryAction
insertCheck('getPosInventoryAction', `    const session = await getServerSession(authOptions)\n    if (!session?.user) return { error: { message: "Unauthorized" } }\n    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }`)

// 4. getPosProductsAction
content = content.replace(
  /export async function getPosProductsAction\(productIds: string\[\]\) \{\n  if \(!productIds\.length\) return \{ data: \[\] \}\n  try \{/,
  'export async function getPosProductsAction(productIds: string[]) {\n  if (!productIds.length) return { data: [] }\n  try {\n    const session = await getServerSession(authOptions)\n    if (!session?.user) return { error: { message: "Unauthorized" } }\n    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }'
)

// 5. getAllPosProductsAction
insertCheck('getAllPosProductsAction', `    const session = await getServerSession(authOptions)\n    if (!session?.user) return { error: { message: "Unauthorized" } }\n    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }`)

// 6. searchCustomerByPhoneAction
insertCheck('searchCustomerByPhoneAction', `    const session = await getServerSession(authOptions)\n    if (!session?.user) return { error: { message: "Unauthorized" } }\n    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }`)

// 7. searchPosCustomersAction
insertCheck('searchPosCustomersAction', `    const session = await getServerSession(authOptions)\n    if (!session?.user) return { error: { message: "Unauthorized" } }\n    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }`)

// 8. processPosSaleAction
content = content.replace(
  /export async function processPosSaleAction\(payload: Record<string, unknown>\) \{\n  try \{/,
  'export async function processPosSaleAction(payload: Record<string, unknown>) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user) return { error: { message: "Unauthorized" } }\n  if (!(await hasCapability("sales", "edit", session))) {\n    return { error: { message: "Insufficient permission" } }\n  }\n  const branchId = (payload?.branch_id ?? payload?.branchId) as string | undefined\n  const allowed = await branchFilterFor(session, "sales", "edit")\n  if (allowed !== null && (!branchId || !allowed.includes(branchId))) {\n    return { error: { message: "You don\'t have access to this branch" } }\n  }\n  try {'
)

// 9. getInvoiceHeaderAction
insertCheck('getInvoiceHeaderAction', `    const session = await getServerSession(authOptions)\n    if (!session?.user) return { error: { message: "Unauthorized" } }\n    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }`)

// 10. getInvoiceItemsDetailsAction
insertCheck('getInvoiceItemsDetailsAction', `    const session = await getServerSession(authOptions)\n    if (!session?.user) return { error: { message: "Unauthorized" } }\n    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }`)

// 11. getInvoiceItemsForReturnAction
content = content.replace(
  /export async function getInvoiceItemsForReturnAction\(invoiceId: string\) \{\n  const session = await getServerSession\(authOptions\)\n  if \(!session\?\.user\) return \{ error: \{ message: 'Unauthorized' \} \}/,
  'export async function getInvoiceItemsForReturnAction(invoiceId: string) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user) return { error: { message: \'Unauthorized\' } }\n  if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }'
)

// 12. scanSerialAtPosAction
// change the return type to include 'unauthorized'
content = content.replace(
  /\| \{ error: 'not_found' \| 'unavailable' \| 'wrong_branch' \}/,
  '| { error: \'not_found\' | \'unavailable\' | \'wrong_branch\' | \'unauthorized\' }'
)
insertCheck('scanSerialAtPosAction', `    const session = await getServerSession(authOptions)\n    if (!session?.user) return { error: 'unauthorized' }\n    if (!(await hasCapability("sales", "edit", session))) return { error: 'unauthorized' }`)

// 13. getPosInitialDataAction
insertCheck('getPosInitialDataAction', `    const session = await getServerSession(authOptions)\n    if (!session?.user) return { error: { message: "Unauthorized" } }\n    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }`)

fs.writeFileSync(target, content, 'utf8')
console.log('Successfully patched src/app/actions/pos.ts')

const fs = require('fs')
const path = require('path')

const target = path.join(__dirname, '../src/app/actions/pos.ts')
let content = fs.readFileSync(target, 'utf8')

const imports = 'import { cookies } from "next/headers"\nimport { hasCapability, branchFilterFor } from "@/lib/access"'
content = content.replace('import { cookies } from "next/headers"', imports)

const authView = `    const session = await getServerSession(authOptions)\n    if (!session?.user) return { error: { message: "Unauthorized" } }\n    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }`

// 1
content = content.replace(
  '    if (!session?.user?.id) return { data: [] }',
  '    if (!session?.user?.id) return { data: [] }\n    if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }'
)

// 2
content = content.replace(
  'export async function updatePosPinAction(userId: string, newPin: string) {\n  try {\n    await db.execute(sql`UPDATE profiles SET pos_pin = ${newPin} WHERE id = ${userId}`)',
  `export async function updatePosPinAction(userId: string, newPin: string) {\n  try {\n    const session = await getServerSession(authOptions)\n    if (!session?.user) return { error: { message: "Unauthorized" } }\n    if (session.user.id !== userId && !(await hasCapability("admin", "edit", session))) return { error: { message: "Insufficient permission" } }\n    await db.execute(sql\`UPDATE profiles SET pos_pin = \${newPin} WHERE id = \${userId}\`)`
)

// 3
content = content.replace(
  'export async function getPosInventoryAction(branchId: string) {\n  try {\n    const data = await db.select().from(inventory)',
  `export async function getPosInventoryAction(branchId: string) {\n  try {\n${authView}\n    const data = await db.select().from(inventory)`
)

// 4
content = content.replace(
  '  if (!productIds.length) return { data: [] }\n  try {\n    const data = await db.select().from(products)',
  `  if (!productIds.length) return { data: [] }\n  try {\n${authView}\n    const data = await db.select().from(products)`
)

// 5
content = content.replace(
  'export async function getAllPosProductsAction() {\n  try {\n    const data = await db.select().from(products)',
  `export async function getAllPosProductsAction() {\n  try {\n${authView}\n    const data = await db.select().from(products)`
)

// 6
content = content.replace(
  'export async function searchCustomerByPhoneAction(phone: string) {\n  try {\n    const res = await db.execute(sql`SELECT * FROM search_customer_by_phone(${phone})`)',
  `export async function searchCustomerByPhoneAction(phone: string) {\n  try {\n${authView}\n    const res = await db.execute(sql\`SELECT * FROM search_customer_by_phone(\${phone})\`)`
)

// 7
content = content.replace(
  'export async function searchPosCustomersAction(term: string) {\n  try {\n    const res = await db.execute(sql`SELECT * FROM search_pos_customers(${term})`)',
  `export async function searchPosCustomersAction(term: string) {\n  try {\n${authView}\n    const res = await db.execute(sql\`SELECT * FROM search_pos_customers(\${term})\`)`
)

// 8
content = content.replace(
  'export async function processPosSaleAction(payload: Record<string, unknown>) {\n  try {',
  `export async function processPosSaleAction(payload: Record<string, unknown>) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user) return { error: { message: "Unauthorized" } }\n  if (!(await hasCapability("sales", "edit", session))) {\n    return { error: { message: "Insufficient permission" } }\n  }\n  const branchId = (payload?.branch_id ?? payload?.branchId) as string | undefined\n  const allowed = await branchFilterFor(session, "sales", "edit")\n  if (allowed !== null && (!branchId || !allowed.includes(branchId))) {\n    return { error: { message: "You don't have access to this branch" } }\n  }\n  try {`
)

// 9
content = content.replace(
  'export async function getInvoiceHeaderAction(id: string) {\n  try {\n\n    // we would need branches and customers, but let\'s just use raw SQL for now',
  `export async function getInvoiceHeaderAction(id: string) {\n  try {\n${authView}\n\n    // we would need branches and customers, but let's just use raw SQL for now`
)

// 10
content = content.replace(
  'export async function getInvoiceItemsDetailsAction(id: string) {\n  try {\n    const res = await db.execute(sql`SELECT * FROM view_invoice_details WHERE invoice_id = ${id}`)',
  `export async function getInvoiceItemsDetailsAction(id: string) {\n  try {\n${authView}\n    const res = await db.execute(sql\`SELECT * FROM view_invoice_details WHERE invoice_id = \${id}\`)`
)

// 11
content = content.replace(
  'export async function getInvoiceItemsForReturnAction(invoiceId: string) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user) return { error: { message: \'Unauthorized\' } }\n\n  try {',
  `export async function getInvoiceItemsForReturnAction(invoiceId: string) {\n  const session = await getServerSession(authOptions)\n  if (!session?.user) return { error: { message: 'Unauthorized' } }\n  if (!(await hasCapability("sales", "view", session))) return { error: { message: "Insufficient permission" } }\n\n  try {`
)

// 12
content = content.replace(
  "| { error: 'not_found' | 'unavailable' | 'wrong_branch' }",
  "| { error: 'not_found' | 'unavailable' | 'wrong_branch' | 'unauthorized' }"
)
content = content.replace(
  '): Promise<\n  | { data: { inventoryId: string; productId: string } }\n  | { error: \'not_found\' | \'unavailable\' | \'wrong_branch\' | \'unauthorized\' }\n> {\n  try {\n    const rows = await db',
  `): Promise<\n  | { data: { inventoryId: string; productId: string } }\n  | { error: 'not_found' | 'unavailable' | 'wrong_branch' | 'unauthorized' }\n> {\n  try {\n    const session = await getServerSession(authOptions)\n    if (!session?.user) return { error: 'unauthorized' }\n    if (!(await hasCapability("sales", "edit", session))) return { error: 'unauthorized' }\n    const rows = await db`
)

// 13
content = content.replace(
  'export async function getPosInitialDataAction(userId: string, branchId?: string) {\n  try {\n    const [profileData, branchesData, walkInCustomer] = await Promise.all([',
  `export async function getPosInitialDataAction(userId: string, branchId?: string) {\n  try {\n${authView}\n    const [profileData, branchesData, walkInCustomer] = await Promise.all([`
)

fs.writeFileSync(target, content, 'utf8')
console.log('Successfully patched src/app/actions/pos.ts')

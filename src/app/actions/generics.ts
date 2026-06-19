"use server"

import { db } from "@/db/client"
import { sql } from "drizzle-orm"
import * as schema from '@/db/schema'
import { getTableColumns } from 'drizzle-orm'

function getAllowedColumns(tableName: string): Set<string> {
  const table = (schema as Record<string, any>)[tableName]
  if (!table) return new Set()
  const columns = getTableColumns(table)
  return new Set(Object.keys(columns))
}
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

const ALLOWED_TABLES = new Set([
  'profiles', 'branches', 'products', 'inventory',
  'stock_requests', 'stock_request_items', 'stock_transfers', 'stock_transfer_items',
  'waybills', 'user_branch_access', 'user_permissions',
  'purchase_orders', 'vendors', 'customers', 'hsn_codes',
  'service_jobs', 'sales_invoices', 'invoice_items',
  'grn_receipts', 'po_items', 'discrepancies',
  'attendance_records', 'sequential_counters',
  'inventory_transactions', 'vendor_audit_log',
  'po_terms_templates', 'grn_notes_templates', 'vendor_product_map', 'vendor_bills',
  'stock_request_items',
])

const ALLOWED_FUNCTIONS = new Set([
  'process_pos_sale',
  'process_stock_transfer_send',
  'process_stock_transfer_receive',
  'fulfill_stock_request',
  'get_unique_low_stock_count',
  'get_user_pos_stats',
  'get_admin_dashboard_metrics',
  'get_vendor_docs',
  'get_export_data',
  'get_next_logistics_id',
])

type Primitive = string | number | boolean | null
type PayloadValue = Primitive | string[] | null | Record<string, unknown> | unknown

function escapeValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

export async function fetchData(tableName: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: 'Unauthorized' } }
    if (!ALLOWED_TABLES.has(tableName)) return { error: { message: `Table '${tableName}' is not accessible` } }
    const res = await db.execute(sql.raw(`SELECT * FROM "${tableName}"`))
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result : result.rows || []
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function insertData(tableName: string, payload: Record<string, PayloadValue>[]) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: 'Unauthorized' } }
    if (!ALLOWED_TABLES.has(tableName)) return { error: { message: `Table '${tableName}' is not accessible` } }
    const row = payload[0]
    const allowedCols = getAllowedColumns(tableName)
    const invalidKeys = Object.keys(row).filter(k => !allowedCols.has(k))
    if (invalidKeys.length > 0) {
      return { error: { message: `Invalid column(s): ${invalidKeys.join(', ')}` } }
    }
    const keys = Object.keys(row).map(k => `"${k}"`).join(', ')
    const values = Object.values(row).map(escapeValue).join(', ')
    const res = await db.execute(sql.raw(`INSERT INTO "${tableName}" (${keys}) VALUES (${values}) RETURNING *`))
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result : result.rows || []
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function updateData(tableName: string, payload: Record<string, PayloadValue>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: 'Unauthorized' } }
    if (!ALLOWED_TABLES.has(tableName)) return { error: { message: `Table '${tableName}' is not accessible` } }
    const { id, ...rest } = payload
    if (!id) throw new Error('updateData: payload must contain an `id` field')
    const allowedCols = getAllowedColumns(tableName)
    const invalidKeys = Object.keys(rest).filter(k => !allowedCols.has(k))
    if (invalidKeys.length > 0) {
      return { error: { message: `Invalid column(s): ${invalidKeys.join(', ')}` } }
    }
    const setClause = Object.entries(rest).map(([k, v]) => `"${k}" = ${escapeValue(v)}`).join(', ')
    const res = await db.execute(sql.raw(`UPDATE "${tableName}" SET ${setClause} WHERE id = ${escapeValue(id)} RETURNING *`))
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result : result.rows || []
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function deleteData(tableName: string, id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: 'Unauthorized' } }
    if (!ALLOWED_TABLES.has(tableName)) return { error: { message: `Table '${tableName}' is not accessible` } }
    await db.execute(sql.raw(`DELETE FROM "${tableName}" WHERE id = ${escapeValue(id)}`))
    return { data: null }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function rpcCall(funcName: string, args: Record<string, unknown>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { error: { message: 'Unauthorized' } }
    if (!ALLOWED_FUNCTIONS.has(funcName)) return { error: { message: `Function '${funcName}' is not accessible` } }
    const argsStr = args ? `'${JSON.stringify(args)}'::jsonb` : ''
    const res = await db.execute(sql.raw(`SELECT * FROM ${funcName}(${argsStr})`))
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(result) ? result : result.rows || []
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function getGlobalMastersAction() {
  try {
    const [brandsRes, catsRes] = await Promise.all([
      db.execute(sql.raw(`SELECT * FROM "brands"`)),
      db.execute(sql.raw(`SELECT * FROM "categories"`))
    ])
    const toArr = (r: unknown) => {
      const res = r as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
      return Array.isArray(res) ? res : res.rows || []
    }
    return { data: { b: toArr(brandsRes), c: toArr(catsRes) } }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

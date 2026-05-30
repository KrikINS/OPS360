"use server"

import { db } from "@/db/client"
import { sql } from "drizzle-orm"

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
    const row = payload[0]
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
    const { id, ...rest } = payload
    if (!id) throw new Error('updateData: payload must contain an `id` field')
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
    await db.execute(sql.raw(`DELETE FROM "${tableName}" WHERE id = ${escapeValue(id)}`))
    return { data: null }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function rpcCall(funcName: string, args: Record<string, unknown>) {
  try {
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

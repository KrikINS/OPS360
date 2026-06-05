"use server"

import { db } from "@/db/client"
import { brands, categories, po_terms_templates, grn_notes_templates, return_reason_master, branches } from "@/db/schema"
import { eq, asc, sql } from "drizzle-orm"
import { randomUUID } from "crypto"

export async function getGlobalMastersAction() {
  try {
    const b = await db.select().from(brands).orderBy(asc(brands.name))
    const c = await db.select().from(categories).orderBy(asc(categories.name))
    const t = await db.select().from(po_terms_templates).orderBy(asc(po_terms_templates.created_at))
    const gnt = await db.select().from(grn_notes_templates).orderBy(asc(grn_notes_templates.created_at))
    const rr = await db.select().from(return_reason_master).orderBy(asc(return_reason_master.reason_text))
    return { data: { b, c, t, gnt, rr } }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function addMasterAction(table: "brands" | "categories" | "po_terms_templates" | "grn_notes_templates" | "return_reason_master", data: Record<string, unknown>) {
  try {

    if (table === "brands") await db.insert(brands).values({ id: randomUUID(), ...data } as typeof brands.$inferInsert)
    if (table === "categories") await db.insert(categories).values({ id: randomUUID(), ...data } as typeof categories.$inferInsert)
    if (table === "po_terms_templates") await db.insert(po_terms_templates).values({ id: randomUUID(), ...data } as typeof po_terms_templates.$inferInsert)
    if (table === "grn_notes_templates") await db.insert(grn_notes_templates).values({ id: randomUUID(), ...data } as typeof grn_notes_templates.$inferInsert)
    if (table === "return_reason_master") await db.insert(return_reason_master).values({ id: randomUUID(), ...data } as typeof return_reason_master.$inferInsert)
    return { data: { id: randomUUID(), ...data } }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function updateTermTemplateAction(id: string, name: string, content: string, is_default: boolean) {
  try {
    await db.update(po_terms_templates).set({ name, content, is_default }).where(eq(po_terms_templates.id, id))
    return { data: true }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function toggleReasonStatusAction(id: string, is_active: boolean) {
  try {
    await db.update(return_reason_master).set({ is_active }).where(eq(return_reason_master.id, id))
    return { data: true }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function deleteMasterAction(table: "brands" | "categories" | "po_terms_templates" | "grn_notes_templates" | "return_reason_master", id: string) {
  try {
    if (table === "brands") await db.delete(brands).where(eq(brands.id, id))
    if (table === "categories") await db.delete(categories).where(eq(categories.id, id))
    if (table === "po_terms_templates") await db.delete(po_terms_templates).where(eq(po_terms_templates.id, id))
    if (table === "grn_notes_templates") await db.delete(grn_notes_templates).where(eq(grn_notes_templates.id, id))
    if (table === "return_reason_master") await db.delete(return_reason_master).where(eq(return_reason_master.id, id))
    return { data: true }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function updateGrnNoteTemplateAction(id: string, name: string, content: string, is_default: boolean) {
  try {
    await db.update(grn_notes_templates).set({ name, content, is_default }).where(eq(grn_notes_templates.id, id))
    return { data: true }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function toggleDefaultGrnNoteAction(id: string) {
  try {
    await db.update(grn_notes_templates).set({ is_default: false }).where(eq(grn_notes_templates.is_default, true))
    await db.update(grn_notes_templates).set({ is_default: true }).where(eq(grn_notes_templates.id, id))
    return { data: true }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function toggleDefaultTermAction(id: string) {
  try {
    await db.update(po_terms_templates).set({ is_default: false }).where(eq(po_terms_templates.is_default, true))
    await db.update(po_terms_templates).set({ is_default: true }).where(eq(po_terms_templates.id, id))
    return { data: true }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function getBranchesAction() {
  try {
    const data = await db.select().from(branches).orderBy(asc(branches.name))
    return { data }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function addBranchAction(data: Partial<typeof branches.$inferInsert>) {
  try {
    const res = await db.transaction(async (tx) => {
      const counterRes = await tx.execute(sql`
        INSERT INTO sequential_counters (prefix, year, current_value)
        VALUES ('BR', 0, 1)
        ON CONFLICT (prefix, year) DO UPDATE
          SET current_value = sequential_counters.current_value + 1
        RETURNING current_value
      `)
      const counterRows = (counterRes as unknown as { rows?: { current_value: number }[] }).rows
        ?? (counterRes as unknown as { current_value: number }[])
      const seqVal = counterRows[0]?.current_value || 1
      const generatedCode = `BR${String(seqVal).padStart(3, '0')}`

      const inserted = await tx.insert(branches).values({ 
        id: randomUUID(), 
        name: data.name || "", 
        ...data,
        code: generatedCode
      } as typeof branches.$inferInsert).returning()
      
      return inserted
    })
    return { data: res[0] }
  } catch (error) {
    console.error("Database Error (addBranchAction):", error)
    return { success: false, error: 'Failed to create branch. Please verify your data and try again.' }
  }
}

export async function updateBranchAction(id: string, data: Partial<typeof branches.$inferInsert>) {
  try {
    const res = await db.update(branches).set(data).where(eq(branches.id, id)).returning()
    return { data: res[0] }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function deleteBranchAction(id: string) {
  try {
    await db.delete(branches).where(eq(branches.id, id))
    return { data: true }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

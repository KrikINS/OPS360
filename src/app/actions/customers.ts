"use server"

import { db } from "@/db/client"
import { customers } from "@/db/schema"
import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"

export async function addCustomerAction(formData: Partial<typeof customers.$inferInsert>) {
  try {
    const data = await db.insert(customers).values({
      id: formData.id || randomUUID(),
      ...formData
    } as never).returning()
    return { data: data[0] }
  } catch (error) {
    if ((error as Record<string, unknown>).code === '23505') {
      return { error: { message: "Customer with this phone number already exists", code: '23505' } }
    }
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function updateCustomerAction(id: string, formData: Partial<typeof customers.$inferInsert>) {
  try {
    const data = await db.update(customers).set({ ...formData, updated_at: new Date() }).where(eq(customers.id, id)).returning()
    return { data: data[0] }
  } catch (error) {
    if ((error as Record<string, unknown>).code === '23505') {
      return { error: { message: "Customer with this phone number already exists", code: '23505' } }
    }
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

// Alias for legacy callers
export const createCustomerAction = addCustomerAction

export async function searchCustomerByPhoneAction(phone: string) {
  try {
    const data = await db.select().from(customers).where(eq(customers.phone_number, phone))
    return { data }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}


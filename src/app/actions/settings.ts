"use server"

import { db } from "@/db/client"
import { eq } from "drizzle-orm"
import { company_settings } from "@/db/schema"

export async function getCompanySettings() {
  try {
    const settings = await db.select().from(company_settings).limit(1)
    if (settings.length > 0) {
      return { success: true, data: settings[0] }
    }
    return { success: true, data: null }
  } catch (error) {
    console.error("Database Error (getCompanySettings):", error)
    return { success: false, error: 'Failed to fetch company settings.' }
  }
}

export async function updateCompanySettings(data: {
  company_name: string;
  logo_url?: string;
  primary_color?: string;
  support_email?: string;
  billing_address?: string;
}) {
  try {
    const existing = await db.select().from(company_settings).limit(1)
    
    if (existing.length > 0) {
      const updated = await db.update(company_settings)
        .set(data)
        .where(eq(company_settings.id, existing[0].id))
        .returning()
      return { success: true, data: updated[0] }
    } else {
      const inserted = await db.insert(company_settings)
        .values(data)
        .returning()
      return { success: true, data: inserted[0] }
    }
  } catch (error) {
    console.error("Database Error (updateCompanySettings):", error)
    return { success: false, error: 'Failed to update company settings. Please try again.' }
  }
}


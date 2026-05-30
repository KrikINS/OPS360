"use server"

import { db } from "@/db/client"
import { app_settings } from "@/db/schema"
import { inArray } from "drizzle-orm"

export async function getAppSettingsAction(keys: string[]) {
  try {
    const data = await db.select().from(app_settings).where(inArray(app_settings.key, keys))
    return { data }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function updateAppSettingAction(key: string, value: string) {
  try {
    await db.insert(app_settings).values({ key, value, updated_at: new Date() })
      .onConflictDoUpdate({ target: app_settings.key, set: { value, updated_at: new Date() } })
    return { data: true }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

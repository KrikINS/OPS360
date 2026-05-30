"use server"

import { db } from "@/db/client"
import { hsn_codes } from "@/db/schema"
import { ilike, or } from "drizzle-orm"

export async function searchHsnCodes(searchTerm: string) {
  try {
    if (!searchTerm || searchTerm.trim() === "") {
      return { data: [] };
    }

    const term = `%${searchTerm.trim()}%`;
    const results = await db
      .select()
      .from(hsn_codes)
      .where(
        or(
          ilike(hsn_codes.hsn_code, term),
          ilike(hsn_codes.description, term)
        )
      )
      .limit(10);

    return { data: results };
  } catch (error) {
    console.error("Database Error (searchHsnCodes):", error);
    return { success: false, error: 'Failed to search HSN codes. Please try again.' };
  }
}

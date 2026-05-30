"use server"

import { db } from "@/db/client"
import { vendors } from "@/db/schema"
import { inArray } from "drizzle-orm"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function getPendingApprovalsAction() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) return []

    const role = (session.user.role || "").toLowerCase()
    const isAdmin = role.includes('admin') || role.includes('owner') || role === 'manager'
    
    if (!isAdmin) {
      return []
    }

    const pendingVendors = await db
      .select({ id: vendors.id, name: vendors.name, status: vendors.status })
      .from(vendors)
      .where(inArray(vendors.status, ['Pending', 'awaiting_approval']))
      
    return pendingVendors
  } catch (error) {
    console.error("Failed to fetch pending approvals:", error)
    return []
  }
}

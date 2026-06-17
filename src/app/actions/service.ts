"use server"

import { db } from "@/db/client"
import { customers, products, profiles } from "@/db/schema"
import { ilike, or, eq } from "drizzle-orm"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { hasCapability } from "@/lib/access"

export async function searchPosCustomersAction(searchTerm: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(await hasCapability("service", "view", session))) {
    return { error: { message: 'Unauthorized' } }
  }
  try {
    const data = await db.select({
      id: customers.id,
      full_name: customers.full_name,
      phone_number: customers.phone_number
    })
    .from(customers)
    .where(or(
      ilike(customers.full_name, `%${searchTerm}%`),
      ilike(customers.phone_number, `%${searchTerm}%`)
    ))
    .limit(10)
    
    return { data }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function searchProductsAction(searchTerm: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(await hasCapability("service", "view", session))) {
    return { error: { message: 'Unauthorized' } }
  }
  try {
    const data = await db.select({
      id: products.id,
      model_name: products.model_name,
      brand: products.brand
    })
    .from(products)
    .where(ilike(products.model_name, `%${searchTerm}%`))
    .limit(5)
    
    return { data }
  } catch (error) {
    return { error: { message: (error instanceof Error ? error.message : String(error)) } }
  }
}

export async function getUserBranchIdAction() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { data: null }

  const data = await db.select({ branch_id: profiles.branch_id })
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1)

  return { data: data[0] }
}

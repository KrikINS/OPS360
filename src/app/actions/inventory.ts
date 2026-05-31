"use server"

import { db } from "@/db/client"
import { inventory, products, branches, user_permissions } from "@/db/schema"
import { eq, or, and, sql } from "drizzle-orm"

export async function fetchInventoryDataAction(userId: string, branchId?: string) {
  try {
    // Check export permission
    const permissions = await db.select()
      .from(user_permissions)
      .where(and(
        eq(user_permissions.user_id, userId),
        eq(user_permissions.module, 'accounting'),
        eq(user_permissions.enabled, true)
      ))

    const canExport = permissions.length > 0;

    // Fetch branches
    const allBranches = await db.select().from(branches)

    // Fetch Inventory with Product join
    let query = db.select({
      id: inventory.id,
      serial_number: inventory.serial_number,
      status: inventory.status,
      branch_id: inventory.branch_id,
      product_id: inventory.product_id,
      price: inventory.price,
      landed_cost: inventory.landed_cost,
      created_at: inventory.created_at,
      product: {
        id: products.id,
        brand: products.brand,
        model_name: products.model_name,
        category: products.category,
        product_code: products.product_code,
        min_stock_level: products.min_stock_level,
        tracking_type: products.tracking_type,
        base_price: products.base_price,
      }
    })
    .from(inventory)
    .leftJoin(products, eq(inventory.product_id, products.id))
    
    if (branchId) {
      query = query.where(eq(inventory.branch_id, branchId)) as any
    }

    const dbInventory = await query;
    
    // We map to match the previous payload
    const formattedInventory = dbInventory.map((item: typeof dbInventory[number]) => ({
      ...item,
      current_balance: item.status === 'Available' || item.status === 'In-Transit' ? 1 : 0
    }));

    return { data: formattedInventory, branches: allBranches, canExport, error: null }
  } catch (error) {
    console.error("fetchInventoryDataAction error:", error)
    return { data: [], branches: [], canExport: false, error: (error instanceof Error ? error.message : String(error)) }
  }
}

export async function getInventoryForExportAction() { try { const data = await db.select().from(inventory); return { data }; } catch(error) { return { error: { message: String(error) } }; } }

export async function getLowStockCountAction() {
  try {
    const res = await db.execute(sql`SELECT get_unique_low_stock_count() as count`)
    const result = res as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
    const row = Array.isArray(result) ? result[0] : result.rows?.[0]
    return { data: row?.count || 0 }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}

export async function searchProductsAction(searchTerm: string) {
  try {
    const data = await db.select().from(products).where(or(
      sql`${products.model_name} ILIKE ${'%' + searchTerm + '%'}`,
      sql`${products.product_code} ILIKE ${'%' + searchTerm + '%'}`
    )).limit(50)
    return { data }
  } catch (error) {
    return { error: { message: String(error) } }
  }
}
"use server"

import { db } from "@/db/client"
import { products } from "@/db/schema"
import { eq, asc, desc, like } from "drizzle-orm"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getProductsAction(showArchived: boolean = false) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")

  return await db.select({
    id: products.id,
    model_name: products.model_name,
    brand: products.brand,
    category: products.category,
    product_code: products.product_code,
    base_price: products.base_price,
    mrp: products.mrp,
    dealer_price: products.dealer_price,
    min_sell_price: products.min_sell_price,
    margin_pct: products.margin_pct,
    max_discount_pct: products.max_discount_pct,
    hsn_code: products.hsn_code,
    min_stock_level: products.min_stock_level,
    tracking_type: products.tracking_type,
    description: products.description,
    gst_rate: products.gst_rate,
    warranty_months: products.warranty_months,
    is_archived: products.is_archived
  })
  .from(products)
  .where(eq(products.is_archived, showArchived))
  .orderBy(asc(products.model_name))
}

export async function toggleProductArchiveAction(id: string, isArchived: boolean) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")

  await db.update(products).set({ is_archived: isArchived }).where(eq(products.id, id))
  
  revalidatePath('/products')
  return { success: true }
}

export async function getNextSequenceAction(category: string, brand: string): Promise<number> {
  const cat = (category || "MISC").substring(0, 3).toUpperCase().padEnd(3, "X");
  const brn = (brand || "GEN").substring(0, 3).toUpperCase().padEnd(3, "X");
  const prefix = `ITM-${cat}-${brn}-`;

  const data = await db.select({ product_code: products.product_code })
    .from(products)
    .where(like(products.product_code, `${prefix}%`))
    .orderBy(desc(products.product_code))
    .limit(1);

  if (!data || data.length === 0 || !data[0].product_code) return 1;

  const lastCode = data[0].product_code;
  const lastSeqString = lastCode.split("-").pop();
  const lastSeq = parseInt(lastSeqString || "0", 10);
  
  return lastSeq + 1;
}

export async function updateProductAction(id: string, updateData: Partial<typeof products.$inferInsert>) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")

  const data = await db.update(products).set(updateData).where(eq(products.id, id)).returning()
  revalidatePath("/products")
  return { data: data[0] }
}

export async function bulkImportProductsAction(rows: Array<{
  model_name: string
  brand?: string
  category?: string
  product_code?: string
  base_price?: number
  mrp?: number
  dealer_price?: number
  hsn_code?: string
  gst_rate?: number
  warranty_months?: number
  description?: string
  tracking_type?: string
  min_stock_level?: number
}>) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { data: null, error: new Error('Unauthorized') }

  const { hasCapability } = await import("@/lib/access")
  if (!(await hasCapability("inventory", "edit", session))) {
    return { data: null, error: new Error('Insufficient permission') }
  }

  const summary = { added: 0, updated: 0, failed: 0 }
  const errors: Array<{ row: number; code: string; error: string }> = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.model_name?.trim()) {
      errors.push({ row: i + 2, code: row.product_code ?? '-', error: 'Model Name is required' })
      summary.failed++
      continue
    }

    try {
      if (row.product_code?.trim()) {
        // Check for existing product with same code
        const existing = await db.select({ id: products.id })
          .from(products)
          .where(eq(products.product_code, row.product_code.trim()))
          .limit(1)

        if (existing.length > 0) {
          // Update existing
          await db.update(products)
            .set({
              model_name:     row.model_name.trim(),
              brand:          row.brand?.trim() ?? null,
              category:       row.category?.trim() ?? null,
              base_price:     row.base_price ? String(row.base_price) : null,
              mrp:            row.mrp ? String(row.mrp) : null,
              dealer_price:   row.dealer_price ? String(row.dealer_price) : null,
              hsn_code:       row.hsn_code?.trim() ?? null,
              gst_rate:       row.gst_rate ? String(row.gst_rate) : '18',
              warranty_months: row.warranty_months ?? null,
              description:    row.description?.trim() ?? null,
              tracking_type:  row.tracking_type?.trim() ?? null,
              min_stock_level: row.min_stock_level ?? 0,
            })
            .where(eq(products.product_code, row.product_code.trim()))
          summary.updated++
          continue
        }
      }

      // Insert new
      await db.insert(products).values({
        model_name:     row.model_name.trim(),
        brand:          row.brand?.trim() ?? null,
        category:       row.category?.trim() ?? null,
        product_code:   row.product_code?.trim() ?? null,
        base_price:     row.base_price ? String(row.base_price) : null,
        mrp:            row.mrp ? String(row.mrp) : null,
        dealer_price:   row.dealer_price ? String(row.dealer_price) : null,
        hsn_code:       row.hsn_code?.trim() ?? null,
        gst_rate:       row.gst_rate ? String(row.gst_rate) : '18',
        warranty_months: row.warranty_months ?? null,
        description:    row.description?.trim() ?? null,
        tracking_type:  row.tracking_type?.trim() ?? 'serial',
        min_stock_level: row.min_stock_level ?? 0,
        is_archived:    false,
      })
      summary.added++
    } catch (err) {
      errors.push({
        row: i + 2,
        code: row.product_code ?? '-',
        error: (err as Error).message,
      })
      summary.failed++
    }
  }

  return { data: { summary, errors }, error: null }
}


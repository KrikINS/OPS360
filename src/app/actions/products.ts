"use server"

import { db } from "@/db/client"
import { products } from "@/db/schema"
import { eq, asc, desc, like } from "drizzle-orm"
import { getServerSession } from "next-auth/next"
import { revalidatePath } from "next/cache"

export async function getProductsAction(showArchived: boolean = false) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  return await db.select({
    id: products.id,
    model_name: products.model_name,
    brand: products.brand,
    category: products.category,
    product_code: products.product_code,
    base_price: products.base_price,
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
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  await db.update(products).set({ is_archived: isArchived }).where(eq(products.id, id))
  
  revalidatePath('/products')
  return { success: true }
}

export async function getNextSequenceAction(category: string, brand: string): Promise<number> {
  const cat = (category || "MISC").substring(0, 3).toUpperCase().padEnd(3, "X");
  const brn = (brand || "GEN").substring(0, 3).toUpperCase().padEnd(3, "X");
  const prefix = `EHA-${cat}-${brn}-`;

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
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  const data = await db.update(products).set(updateData).where(eq(products.id, id)).returning()
  revalidatePath("/products")
  return { data: data[0] }
}
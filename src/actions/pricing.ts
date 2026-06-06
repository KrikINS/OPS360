"use server"

import { db } from '@/db/client'
import { products, inventory, profiles } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ── getProductPricing ───────────────────────────────
// Returns pricing info for a product including margin

export async function getProductPricing(productId: string) {
  const [product] = await db
    .select({
      id: products.id,
      modelName: products.model_name,
      mrp: products.mrp,
      basePrice: products.base_price,
      dealerPrice: products.dealer_price,
      minSellPrice: products.min_sell_price,
      maxDiscountPct: products.max_discount_pct,
      gstRate: products.gst_rate,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)

  if (!product) return null

  const mrp = Number(product.mrp ?? 0)
  const basePrice = Number(product.basePrice ?? 0)
  const dealerPrice = Number(product.dealerPrice ?? 0)
  const minSellPrice = Number(product.minSellPrice ?? dealerPrice * 1.05)
  const maxDiscountPct = Number(product.maxDiscountPct ?? 10)

  return {
    ...product,
    mrp,
    basePrice,
    dealerPrice,
    minSellPrice,
    maxDiscountPct,
    maxDiscountAmount: mrp * (maxDiscountPct / 100),
    marginAtMRP: mrp > 0 && dealerPrice > 0
      ? ((basePrice - dealerPrice) / basePrice * 100)
      : null,
  }
}

// ── validateDiscount ────────────────────────────────
// Checks if a discount is within auto-approval limits

export async function validateDiscount(input: {
  productId: string
  discountPct: number
  managerPin?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { valid: false, error: 'Unauthorized' }
  }

  const pricing = await getProductPricing(input.productId)
  if (!pricing) {
    return { valid: false, error: 'Product not found' }
  }

  const mrp = pricing.mrp
  const gstRate = Number(pricing.gstRate ?? 18)
  const discountAmount = mrp * (input.discountPct / 100)
  const finalInclusivePrice = mrp - discountAmount
  
  const finalExclusivePrice = finalInclusivePrice / (1 + gstRate / 100)

  // Hard floor — never sell below min_sell_price
  if (finalExclusivePrice < pricing.minSellPrice) {
    return {
      valid: false,
      error: `Price is below minimum sell price (exclusive floor: ₹${pricing.minSellPrice.toFixed(2)})`,
      needsApproval: false,
    }
  }

  // Auto-approved if within max_discount_pct
  if (input.discountPct <= pricing.maxDiscountPct) {
    return {
      valid: true,
      needsApproval: false,
      finalPrice: finalInclusivePrice,
      discountAmount,
    }
  }

  // Needs manager approval
  if (!input.managerPin) {
    return {
      valid: false,
      needsApproval: true,
      error: `Discount of ${input.discountPct}% exceeds the ${pricing.maxDiscountPct}% auto-approval limit. Manager PIN required.`,
      maxAutoApproval: pricing.maxDiscountPct,
    }
  }

  // Verify manager PIN
  const managerResult = await verifyManagerPin(
    input.managerPin
  )
  if (!managerResult.valid) {
    return {
      valid: false,
      needsApproval: true,
      error: 'Invalid manager PIN',
    }
  }

  return {
    valid: true,
    needsApproval: false,
    approvedBy: managerResult.managerId,
    finalPrice: finalInclusivePrice,
    discountAmount,
  }
}

// ── verifyManagerPin ────────────────────────────────
// Checks if the PIN belongs to a manager/admin

async function verifyManagerPin(pin: string): Promise<{
  valid: boolean
  managerId: string | null
  managerName: string | null
}> {
  if (!pin || pin.trim().length === 0) {
    return { valid: false, managerId: null, managerName: null }
  }

  const managers = await db
    .select({
      id: profiles.id,
      fullName: profiles.full_name,
      role: profiles.role,
      posPin: profiles.pos_pin,
    })
    .from(profiles)
    .where(
      sql`LOWER(${profiles.role}) IN ('admin/owner', 'admin', 'manager', 'super_admin')
          AND ${profiles.pos_pin} IS NOT NULL`
    )

  const match = managers.find(
    m => String(m.posPin).trim() === String(pin).trim()
  )

  if (!match) {
    return { valid: false, managerId: null, managerName: null }
  }

  return {
    valid: true,
    managerId: match.id,
    managerName: match.fullName,
  }
}

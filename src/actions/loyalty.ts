"use server"

import { db } from '@/db/client'
import { customers, loyalty_points, sales_invoices } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ── Configuration ───────────────────────────────────
const POINTS_PER_RUPEE = 0.01  // ₹100 = 1 point
const RUPEES_PER_POINT = 1     // 1 point = ₹1 redemption

// ── earnPoints ──────────────────────────────────────
// Called automatically after every POS sale

export async function earnPoints(input: {
  customerId: string | null
  invoiceId: string
  saleAmount: number
  createdBy: string
}) {
  // Don't earn points for walk-in placeholder
  if (!input.customerId || input.customerId === '00000000-0000-0000-0000-000000000000') {
    return { success: true as const, pointsEarned: 0 }
  }

  if (input.saleAmount <= 0) {
    return { success: true as const, pointsEarned: 0 }
  }

  const pointsEarned = Math.floor(
    input.saleAmount * POINTS_PER_RUPEE
  )

  if (pointsEarned <= 0) {
    return { success: true as const, pointsEarned: 0 }
  }

  try {
    // Get current balance
    const [customer] = await db
      .select({ loyaltyBalance: customers.loyalty_balance })
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1)

    const currentBalance = customer?.loyaltyBalance ?? 0
    const newBalance = currentBalance + pointsEarned

    // Insert transaction
    await db.insert(loyalty_points).values({
      customer_id: input.customerId,
      invoice_id: input.invoiceId,
      type: 'earn',
      points: pointsEarned,
      balance_after: newBalance,
      description: `Earned ${pointsEarned} points on purchase of ₹${input.saleAmount.toLocaleString('en-IN')}`,
      created_by: input.createdBy,
    })

    // Update customer balance
    await db
      .update(customers)
      .set({ loyalty_balance: newBalance })
      .where(eq(customers.id, input.customerId))

    return {
      success: true as const,
      pointsEarned,
      newBalance,
    }
  } catch (error) {
    console.error('EARN POINTS ERROR (full):', error)
    return {
      success: false as const,
      error: (error as Error).message,
      pointsEarned: 0,
    }
  }
}

// ── redeemPoints ────────────────────────────────────
// Called from POS checkout when customer redeems points

export async function redeemPoints(input: {
  customerId: string
  pointsToRedeem: number
  invoiceId?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  if (input.customerId === '00000000-0000-0000-0000-000000000000') {
    return {
      success: false as const,
      error: 'Cannot redeem points for walk-in customers'
    }
  }

  if (input.pointsToRedeem <= 0) {
    return {
      success: false as const,
      error: 'Points must be greater than 0'
    }
  }

  try {
    // Get current balance
    const [customer] = await db
      .select({
        loyaltyBalance: customers.loyalty_balance,
        fullName: customers.full_name,
      })
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1)

    if (!customer) {
      return {
        success: false as const,
        error: 'Customer not found'
      }
    }

    const currentBalance = customer.loyaltyBalance ?? 0

    if (input.pointsToRedeem > currentBalance) {
      return {
        success: false as const,
        error: `Insufficient points. Available: ${currentBalance}, Requested: ${input.pointsToRedeem}`,
      }
    }

    const discountAmount = input.pointsToRedeem * RUPEES_PER_POINT
    const newBalance = currentBalance - input.pointsToRedeem

    // Insert transaction
    await db.insert(loyalty_points).values({
      customer_id: input.customerId,
      invoice_id: input.invoiceId ?? null,
      type: 'redeem',
      points: -input.pointsToRedeem,
      balance_after: newBalance,
      description: `Redeemed ${input.pointsToRedeem} points for ₹${discountAmount} discount`,
      created_by: session.user.id,
    })

    // Update customer balance
    await db
      .update(customers)
      .set({ loyalty_balance: newBalance })
      .where(eq(customers.id, input.customerId))

    return {
      success: true as const,
      pointsRedeemed: input.pointsToRedeem,
      discountAmount,
      newBalance,
    }
  } catch (error) {
    console.error('REDEEM POINTS ERROR:', error)
    return {
      success: false as const,
      error: (error as Error).message,
    }
  }
}

// ── getCustomerLoyalty ───────────────────────────────
// Get a customer's loyalty summary + recent transactions

export async function getCustomerLoyalty(
  customerId: string
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  try {
    // Get customer balance
    const [customer] = await db
      .select({
        id: customers.id,
        fullName: customers.full_name,
        loyaltyBalance: customers.loyalty_balance,
      })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1)

    if (!customer) {
      return {
        success: false as const,
        error: 'Customer not found'
      }
    }

    // Get transaction history
    const transactions = await db
      .select({
        id: loyalty_points.id,
        type: loyalty_points.type,
        points: loyalty_points.points,
        balanceAfter: loyalty_points.balance_after,
        description: loyalty_points.description,
        createdAt: loyalty_points.created_at,
      })
      .from(loyalty_points)
      .where(eq(loyalty_points.customer_id, customerId))
      .orderBy(desc(loyalty_points.created_at))
      .limit(50)

    // Get totals
    const totalsResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'earn'
          THEN points ELSE 0 END), 0) AS total_earned,
        COALESCE(SUM(CASE WHEN type = 'redeem'
          THEN ABS(points) ELSE 0 END), 0) AS total_redeemed
      FROM loyalty_points
      WHERE customer_id = ${customerId}::uuid
    `)

    const totals = (totalsResult as any).rows?.[0]
      ?? (totalsResult as any)[0]

    return {
      success: true as const,
      balance: customer.loyaltyBalance ?? 0,
      redemptionValue: (customer.loyaltyBalance ?? 0)
        * RUPEES_PER_POINT,
      totalEarned: Number(totals?.total_earned ?? 0),
      totalRedeemed: Number(totals?.total_redeemed ?? 0),
      transactions,
      config: {
        pointsPerRupee: POINTS_PER_RUPEE,
        rupeesPerPoint: RUPEES_PER_POINT,
      },
    }
  } catch (error) {
    return {
      success: false as const,
      error: (error as Error).message,
    }
  }
}

// ── adjustPoints ────────────────────────────────────
// Manual adjustment by admin (bonus, correction, etc.)

export async function adjustPoints(input: {
  customerId: string
  points: number // positive to add, negative to deduct
  reason: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false as const, error: 'Unauthorized' }
  }

  const role = (session.user.role ?? '').toLowerCase()
  if (!['admin', 'super_admin', 'admin/owner'].includes(role)) {
    return {
      success: false as const,
      error: 'Admin role required for manual adjustments'
    }
  }

  try {
    const [customer] = await db
      .select({ loyaltyBalance: customers.loyalty_balance })
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1)

    if (!customer) {
      return {
        success: false as const,
        error: 'Customer not found'
      }
    }

    const currentBalance = customer.loyaltyBalance ?? 0
    const newBalance = Math.max(0,
      currentBalance + input.points)

    await db.insert(loyalty_points).values({
      customer_id: input.customerId,
      type: 'adjustment',
      points: input.points,
      balance_after: newBalance,
      description: `Manual adjustment: ${input.reason}`,
      created_by: session.user.id,
    })

    await db
      .update(customers)
      .set({ loyalty_balance: newBalance })
      .where(eq(customers.id, input.customerId))

    return {
      success: true as const,
      newBalance,
    }
  } catch (error) {
    return {
      success: false as const,
      error: (error as Error).message,
    }
  }
}

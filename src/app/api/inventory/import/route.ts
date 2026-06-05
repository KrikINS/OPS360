import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import {
  products, branches, inventory
} from '@/db/schema'
import { eq, ilike, isNull, and } from 'drizzle-orm'
import * as XLSX from 'xlsx'
import { createJournalEntry } from '@/actions/finance'

export async function GET() {
  return NextResponse.json({ data: [] })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' }, { status: 401 }
    )
  }

  const role = (session.user.role ?? '').toLowerCase()
  if (!['admin', 'super_admin', 'admin/owner'].includes(role)) {
    return NextResponse.json(
      { error: 'Admin role required' }, { status: 403 }
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Parse XLSX
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheet = wb.Sheets[wb.SheetNames[0]]

    if (!sheet) {
      return NextResponse.json(
        { error: 'Empty spreadsheet' },
        { status: 400 }
      )
    }

    // Convert to JSON — skip title/instruction rows
    // Find the header row by searching for 'Product Code'
    const allRows: string[][] = XLSX.utils.sheet_to_json(
      sheet, { header: 1 }
    ) as string[][]

    let headerRowIdx = -1
    for (let i = 0; i < Math.min(allRows.length, 20); i++) {
      if (allRows[i]?.some(cell =>
        String(cell ?? '').toLowerCase().includes('product code')
      )) {
        headerRowIdx = i
        break
      }
    }

    if (headerRowIdx === -1) {
      return NextResponse.json(
        { error: 'Could not find header row with "Product Code". Please use the official template.' },
        { status: 400 }
      )
    }

    const dataRows = allRows.slice(headerRowIdx + 1)
      .filter(row => row.some(cell =>
        cell !== undefined && cell !== null && String(cell).trim() !== ''
      ))

    if (dataRows.length === 0) {
      return NextResponse.json(
        { error: 'No data rows found below the header' },
        { status: 400 }
      )
    }

    // Fetch all products and branches for lookup
    const allProducts = await db
      .select({
        id: products.id,
        product_code: products.product_code,
        model_name: products.model_name,
      })
      .from(products)

    const allBranches = await db
      .select({
        id: branches.id,
        name: branches.name,
      })
      .from(branches)

    // Product lookup maps
    const productByCode = new Map(
      allProducts.map(p => [
        (p.product_code ?? '').toLowerCase().trim(),
        p
      ])
    )
    const productByName = new Map(
      allProducts.map(p => [
        (p.model_name ?? '').toLowerCase().trim(),
        p
      ])
    )

    // Branch lookup map
    const branchByName = new Map(
      allBranches.map(b => [
        (b.name ?? '').toLowerCase().trim(),
        b
      ])
    )

    // Check for duplicate serial numbers in existing inventory
    const existingSerials = await db
      .select({ serial_number: inventory.serial_number })
      .from(inventory)

    const existingSerialSet = new Set(
      existingSerials
        .map(r => r.serial_number?.toLowerCase().trim())
        .filter(Boolean)
    )

    // Validate and parse each row
    const errors: string[] = []
    const validRows: Array<{
      productId: string
      branchId: string
      serialNumber: string
      landedCost: number
      price: number
      dealerPrice: number
      maxDiscountPct: number
      notes: string
    }> = []

    const uploadSerials = new Set<string>()

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNum = headerRowIdx + 2 + i // 1-indexed for user

      const productCode = String(row[0] ?? '').trim()
      const productName = String(row[1] ?? '').trim()
      const brand = String(row[2] ?? '').trim()
      const serialNumber = String(row[3] ?? '').trim()
      const branchName = String(row[4] ?? '').trim()
      const landedCost = Number(row[5] ?? 0)
      const price = Number(row[6] ?? 0)
      const dealerPrice = Number(row[7] ?? 0)
      const maxDiscountPct = Number(row[8] ?? 10)
      const notes = String(row[9] ?? '').trim()

      // Validate product
      const product = productByCode.get(
        productCode.toLowerCase()
      ) ?? productByName.get(productName.toLowerCase())

      if (!product) {
        errors.push(
          `Row ${rowNum}: Product "${productCode || productName}" not found in Product Master`
        )
        continue
      }

      // Validate branch
      const branch = branchByName.get(
        branchName.toLowerCase()
      )
      if (!branch) {
        errors.push(
          `Row ${rowNum}: Branch "${branchName}" not found`
        )
        continue
      }

      // Validate serial number
      if (!serialNumber) {
        errors.push(
          `Row ${rowNum}: Serial Number is required`
        )
        continue
      }

      if (existingSerialSet.has(serialNumber.toLowerCase())) {
        errors.push(
          `Row ${rowNum}: Serial "${serialNumber}" already exists in inventory`
        )
        continue
      }

      if (uploadSerials.has(serialNumber.toLowerCase())) {
        errors.push(
          `Row ${rowNum}: Duplicate serial "${serialNumber}" in upload file`
        )
        continue
      }

      // Validate costs
      if (landedCost <= 0) {
        errors.push(
          `Row ${rowNum}: Landed Cost must be greater than 0`
        )
        continue
      }

      uploadSerials.add(serialNumber.toLowerCase())

      validRows.push({
        productId: product.id,
        branchId: branch.id,
        serialNumber,
        landedCost,
        price: price > 0 ? price : landedCost,
        dealerPrice,
        maxDiscountPct,
        notes,
      })
    }

    // If there are errors, return them without inserting
    if (errors.length > 0 && validRows.length === 0) {
      return NextResponse.json(
        {
          error: 'All rows have errors',
          errors,
          validCount: 0,
          errorCount: errors.length,
        },
        { status: 400 }
      )
    }

    // Insert valid inventory rows
    if (validRows.length > 0) {
      await db.insert(inventory).values(
        validRows.map(r => ({
          product_id: r.productId,
          branch_id: r.branchId,
          serial_number: r.serialNumber,
          status: 'Available',
          price: String(r.price),
          landed_cost: String(r.landedCost),
          source_po_id: null, // opening stock has no PO
        }))
      )

      // Post opening balance journal entries grouped by branch
      const branchTotals = new Map<string, {
        branchId: string
        units: number
        value: number
      }>()

      // Optionally update product pricing if provided
      for (const row of validRows) {
        if (row.dealerPrice > 0 && row.productId) {
          try {
            await db
              .update(products)
              .set({
                dealer_price: String(row.dealerPrice),
                max_discount_pct: String(row.maxDiscountPct),
                // Only update min_sell_price if not already set
                ...(row.dealerPrice > 0 ? {
                  min_sell_price: String(
                    row.dealerPrice * 1.05
                  )
                } : {}),
              })
              .where(
                and(
                  eq(products.id, row.productId),
                  isNull(products.dealer_price)
                )
              )
          } catch {
            // Non-blocking — don't fail import if this fails
          }
        }
      }

      for (const row of validRows) {
        const existing = branchTotals.get(row.branchId)
        if (existing) {
          existing.units += 1
          existing.value += row.landedCost
        } else {
          branchTotals.set(row.branchId, {
            branchId: row.branchId,
            units: 1,
            value: row.landedCost,
          })
        }
      }

      for (const [, totals] of branchTotals) {
        try {
          await createJournalEntry({
            date: new Date(),
            description: `Opening Stock Import: ${totals.units} units`,
            referenceSource: 'OPENING_BALANCE',
            referenceId: 'stock-import',
            branchId: totals.branchId,
            autoGenerated: true,
            createdBy: session.user.id,
            lines: [
              {
                accountCode: '1040',
                debit: totals.value,
                description: `Inventory asset — ${totals.units} opening stock units`,
              },
              {
                accountCode: '3010',
                credit: totals.value,
                description: 'Retained earnings — opening stock value',
              },
            ],
          })
        } catch (journalError) {
          console.error('Opening stock journal error:', journalError)
          // Don't fail the import — journal is supplementary
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: validRows.length,
      errors: errors.length > 0 ? errors : undefined,
      errorCount: errors.length,
      totalLandedCost: validRows.reduce(
        (s, r) => s + r.landedCost, 0
      ),
      // Add info about pricing updates
      pricingUpdated: validRows.filter(
        r => r.dealerPrice > 0).length,
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
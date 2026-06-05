import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/client'
import { products, branches } from '@/db/schema'
import * as XLSX from 'xlsx'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' }, { status: 401 }
    )
  }

  // Fetch real products and branches for reference sheet
  const productList = await db
    .select({
      product_code: products.product_code,
      model_name: products.model_name,
      brand: products.brand,
      category: products.category,
      hsn_code: products.hsn_code,
      base_price: products.base_price,
      dealer_price: products.dealer_price,
      min_sell_price: products.min_sell_price,
      gst_rate: products.gst_rate,
      max_discount_pct: products.max_discount_pct,
    })
    .from(products)
    .orderBy(products.product_code)

  const branchList = await db
    .select({
      name: branches.name,
      code: branches.code,
    })
    .from(branches)
    .orderBy(branches.name)

  // Create workbook
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Data Entry ─────────────────────────
  const headers = [
    'Product Code (EHA)',
    'Product Name',
    'Brand',
    'Serial Number',
    'Branch Name',
    'Landed Cost (₹)',
    'Selling Price / MRP (₹)',
    'Dealer Price (₹)',
    'Max Discount (%)',
    'Condition Notes',
  ]

  // Title rows
  const titleRows = [
    ['ETHAN HOME APPLIANCES — OPS360 ERP'],
    ['Opening Stock Import Template'],
    [''],
    ['INSTRUCTIONS:'],
    ['1. Fill in one row per inventory unit (each serial number = one row)'],
    ['2. Product Code must match an existing product in the Product Master'],
    ['3. Branch Name must match an existing branch exactly'],
    ['4. Serial Number must be unique globally'],
    ['5. Landed Cost = purchase price + freight per unit'],
    ['6. Selling Price = MRP or intended retail price'],
    ['7. Dealer Price = distributor cost (used for margin calc)'],
    ['8. Max Discount % = cashier auto-approval limit (default 10)'],
    ['9. Condition Notes = optional inspection remarks'],
    [''],
  ]

  const dataSheet = XLSX.utils.aoa_to_sheet([
    ...titleRows,
    headers,
  ])

  // Set column widths
  dataSheet['!cols'] = [
    { wch: 22 },  // Product Code
    { wch: 35 },  // Product Name
    { wch: 18 },  // Brand
    { wch: 25 },  // Serial Number
    { wch: 25 },  // Branch Name
    { wch: 18 },  // Landed Cost
    { wch: 20 },  // Selling Price / MRP
    { wch: 18 },  // Dealer Price
    { wch: 18 },  // Max Discount %
    { wch: 30 },  // Condition Notes
  ]

  // Style the title row (SheetJS CE doesn't support
  // full cell styles, but we can merge cells)
  dataSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // title row
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // subtitle
  ]

  XLSX.utils.book_append_sheet(wb, dataSheet, 'Opening Stock')

  // ── Sheet 2: Products Reference ──────────────────
  const productHeaders = [
    'Product Code', 'Product Name', 'Brand',
    'Category', 'HSN Code', 'MRP (₹)', 'Dealer Price (₹)',
    'Min Sell Price (₹)', 'GST Rate (%)', 'Max Discount (%)'
  ]
  const productData = productList.map(p => [
    p.product_code ?? '',
    p.model_name ?? '',
    p.brand ?? '',
    p.category ?? '',
    p.hsn_code ?? '',
    p.base_price ?? '',
    p.dealer_price ?? '',
    p.min_sell_price ?? '',
    p.gst_rate ?? '18',
    p.max_discount_pct ?? '10',
  ])

  const productSheet = XLSX.utils.aoa_to_sheet([
    ['PRODUCT MASTER REFERENCE'],
    ['Use these exact Product Codes in the Opening Stock sheet'],
    [''],
    productHeaders,
    ...productData,
  ])

  productSheet['!cols'] = [
    { wch: 22 }, { wch: 35 }, { wch: 18 },
    { wch: 20 }, { wch: 15 }, { wch: 15 },
    { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 16 },
  ]

  productSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
  ]

  XLSX.utils.book_append_sheet(wb, productSheet,
    'Products Reference')

  // ── Sheet 3: Branches Reference ──────────────────
  const branchHeaders = ['Branch Name', 'Branch Code']
  const branchData = branchList.map(b => [
    b.name ?? '',
    b.code ?? '',
  ])

  const branchSheet = XLSX.utils.aoa_to_sheet([
    ['BRANCH REFERENCE'],
    ['Use these exact Branch Names in the Opening Stock sheet'],
    [''],
    branchHeaders,
    ...branchData,
  ])

  branchSheet['!cols'] = [{ wch: 30 }, { wch: 15 }]

  branchSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ]

  XLSX.utils.book_append_sheet(wb, branchSheet,
    'Branches Reference')

  // Generate buffer
  const buffer = XLSX.write(wb, {
    type: 'buffer',
    bookType: 'xlsx',
  })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="OPS360_Opening_Stock_Template.xlsx"',
    },
  })
}

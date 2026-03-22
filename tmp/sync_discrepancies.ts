import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role to bypass RLS for migration
const supabase = createClient(supabaseUrl, supabaseKey)

async function syncDiscrepancies() {
  console.log("Syncing discrepancies...")

  // 1. Fetch all POs with bills and items
  const { data: pos, error } = await supabase
    .from('purchase_orders')
    .select(`
      id, po_number, vendor_id, status,
      items:purchase_order_items(quantity, received_quantity, unit_price, tax_rate),
      vendor_bills(bill_amount, bill_number)
    `)

  if (error) {
    console.error("Error fetching POs:", error)
    return
  }

  for (const po of pos) {
    // Calculate Predicted Total
    const poTotal = po.items.reduce((acc: number, item: any) => 
      acc + (item.unit_price * item.quantity * (1 + (item.tax_rate || 18) / 100)), 0
    )

    const totalBilled = po.vendor_bills?.reduce((acc: number, b: any) => acc + Number(b.bill_amount), 0) || 0

    const priceGap = totalBilled - poTotal

    if (Math.abs(priceGap) >= 1) {
      console.log(`Detecting Price Mismatch for ${po.po_number}: Gap ${priceGap}`)
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('discrepancies')
        .select('id')
        .eq('po_id', po.id)
        .eq('discrepancy_type', 'Price Mismatch')
        .single()

      if (!existing) {
        await supabase.from('discrepancies').insert({
          po_id: po.id,
          vendor_id: po.vendor_id,
          discrepancy_type: 'Price Mismatch',
          detected_gap: priceGap,
          status: 'Open',
          admin_comment: `Auto-detected variance during system sync. Expected: ₹${poTotal.toFixed(2)}, Billed: ₹${totalBilled.toFixed(2)}`
        })
        console.log(`Log created for ${po.po_number}`)
      }
    }

    // Quantity mismatch check
    const totalOrderedQty = po.items.reduce((acc: number, item: any) => acc + item.quantity, 0)
    const totalReceivedQty = po.items.reduce((acc: number, item: any) => acc + (item.received_quantity || 0), 0)

    if (totalOrderedQty !== totalReceivedQty && (po.status === 'received' || po.status === 'PARTIALLY_RETURNED')) {
      console.log(`Detecting Quantity Mismatch for ${po.po_number}: Gap ${totalReceivedQty - totalOrderedQty}`)
      
      const { data: existingQty } = await supabase
        .from('discrepancies')
        .select('id')
        .eq('po_id', po.id)
        .eq('discrepancy_type', 'Quantity Mismatch')
        .single()

      if (!existingQty) {
        await supabase.from('discrepancies').insert({
          po_id: po.id,
          vendor_id: po.vendor_id,
          discrepancy_type: 'Quantity Mismatch',
          detected_gap: totalReceivedQty - totalOrderedQty,
          status: 'Open',
          admin_comment: `Auto-detected quantity mismatch. Ordered: ${totalOrderedQty}, Received: ${totalReceivedQty}.`
        })
      }
    }
  }

  console.log("Sync complete.")
}

syncDiscrepancies()

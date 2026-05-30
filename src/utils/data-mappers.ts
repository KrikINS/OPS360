import { Branch, Customer, Product } from "@/context/PosContext"

// Generic mapper helpers
export function asString(val: unknown): string {
    return typeof val === 'string' ? val : String(val || '')
}

export function asNumber(val: unknown): number {
    return typeof val === 'number' ? val : Number(val || 0)
}

export function asBoolean(val: unknown): boolean {
    return Boolean(val)
}

export function mapToBranch(row: unknown): Branch {
    const r = row as Record<string, unknown>
    return {
        id: asString(r?.id),
        name: asString(r?.name),
        full_address: r?.full_address ? asString(r.full_address) : undefined,
        city: r?.city ? asString(r.city) : undefined,
        state: r?.state ? asString(r.state) : undefined,
        pincode: r?.pincode ? asString(r.pincode) : undefined,
        gstin: r?.gstin ? asString(r.gstin) : undefined,
    }
}

export function mapToCustomer(row: unknown): Customer {
    const r = row as Record<string, unknown>
    return {
        id: asString(r?.id),
        name: r?.name ? asString(r.name) : undefined,
        full_name: asString(r?.full_name || r?.name),
        phone_number: asString(r?.phone_number),
        email: r?.email ? asString(r.email) : undefined,
        city: r?.city ? asString(r.city) : undefined,
        gstin: r?.gstin ? asString(r.gstin) : undefined,
    }
}

export function mapToProduct(row: unknown): Product {
    const r = row as Record<string, unknown>
    return {
        id: asString(r?.id),
        model_name: asString(r?.model_name),
        brand: asString(r?.brand),
        category: asString(r?.category),
        hsn_code: asString(r?.hsn_code),
        base_price: asNumber(r?.base_price),
        gst_rate: asNumber(r?.gst_rate),
        current_balance: asNumber(r?.current_balance),
        product_code: asString(r?.product_code),
        tracking_type: r?.tracking_type ? asString(r.tracking_type) : undefined
    }
}

export function mapToInventoryUnit(row: unknown) {
    const r = row as Record<string, unknown>
    return {
        id: asString(r?.id),
        serial_number: asString(r?.serial_number),
        product_id: asString(r?.product_id),
        status: asString(r?.status)
    }
}

export function mapToReturnReasonMaster(row: unknown) {
    const r = row as Record<string, unknown>
    return {
        id: asString(r?.id),
        reason_text: asString(r?.reason_text),
        is_active: asBoolean(r?.is_active)
    }
}

export function mapToPurchaseOrderLite(row: unknown) {
    const r = row as Record<string, unknown>
    return {
        id: asString(r?.id),
        po_number: asString(r?.po_number),
        status: asString(r?.status),
        vendor: r?.vendor,
        branch: r?.branch
    }
}

export function mapToSerialItem(row: unknown) {
    const r = row as Record<string, unknown>
    return {
        id: asString(r?.id),
        serial_number: asString(r?.serial_number),
        landed_cost: asNumber(r?.landed_cost),
        product_id: asString(r?.product_id),
        product: r?.product
    }
}

export function mapToDebitNoteData(row: unknown) {
    const r = row as Record<string, unknown>
    return {
        id: asString(r?.id),
        debit_note_number: asString(r?.debit_note_number),
        po_number: asString(r?.po_number),
        reason: asString(r?.reason),
        amount: asNumber(r?.amount),
        created_at: asString(r?.created_at),
        serial_numbers: Array.isArray(r?.serial_numbers) ? r.serial_numbers.map(String) : [],
        evidence_url: r?.evidence_url ? asString(r.evidence_url) : undefined,
        status: asString(r?.status),
        vendor_name: r?.vendor_name ? asString(r.vendor_name) : undefined,
        item_names: Array.isArray(r?.item_names) ? r.item_names.map(String) : undefined,
        vendor: r?.vendor,
        branch: r?.branch,
        metadata: r?.metadata as { serial_numbers?: string[]; item_names?: string[] } | undefined,
        po: r?.po
    }
}

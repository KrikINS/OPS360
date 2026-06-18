"use server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/db/client"
import { sales_invoices, customers, products, vendors, purchase_orders, service_jobs } from "@/db/schema"
import { or, ilike, inArray, and } from "drizzle-orm"
import { hasCapability, branchFilterFor } from "@/lib/access"
import type { Session } from "next-auth"

export type SearchHit = {
  type: "invoice" | "customer" | "product" | "vendor" | "po" | "job"
  id: string
  title: string
  subtitle?: string
  href: string
}

export async function globalSearchAction(query: string): Promise<{ hits: SearchHit[] }> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { hits: [] }

  const q = query.trim()
  if (q.length < 2) return { hits: [] }

  const like = `%${q}%`
  const hits: SearchHit[] = []
  const LIMIT = 5

  async function branchIds(mod: "sales" | "procurement" | "service") {
    return branchFilterFor(session as Session, mod, "view")
  }

  // INVOICES — sales view, branch-scoped
  if (await hasCapability("sales", "view", session)) {
    const allowed = await branchIds("sales")
    if (allowed === null || allowed.length > 0) {
      const rows = await db
        .select({ id: sales_invoices.id, num: sales_invoices.invoice_number, total: sales_invoices.total_amount })
        .from(sales_invoices)
        .where(
          allowed === null
            ? ilike(sales_invoices.invoice_number, like)
            : and(ilike(sales_invoices.invoice_number, like), inArray(sales_invoices.branch_id, allowed))
        )
        .limit(LIMIT)
      for (const r of rows)
        hits.push({
          type: "invoice",
          id: r.id,
          title: r.num ?? "Invoice",
          subtitle: r.total ? `₹${Number(r.total).toLocaleString("en-IN")}` : undefined,
          href: `/sales/hub?invoice=${r.id}`,
        })
    }
  }

  // CUSTOMERS — sales view, global
  if (await hasCapability("sales", "view", session)) {
    const rows = await db
      .select({ id: customers.id, name: customers.full_name, phone: customers.phone_number, company: customers.company_name })
      .from(customers)
      .where(
        or(
          ilike(customers.full_name, like),
          ilike(customers.phone_number, like),
          ilike(customers.email, like),
          ilike(customers.company_name, like),
          ilike(customers.gstin, like),
        )
      )
      .limit(LIMIT)
    for (const r of rows)
      hits.push({
        type: "customer",
        id: r.id,
        title: r.name ?? r.company ?? "Customer",
        subtitle: r.phone ?? undefined,
        href: `/sales/customers?id=${r.id}`,
      })
  }

  // PRODUCTS — inventory view, global
  if (await hasCapability("inventory", "view", session)) {
    const rows = await db
      .select({ id: products.id, name: products.model_name, brand: products.brand, code: products.product_code })
      .from(products)
      .where(
        or(
          ilike(products.model_name, like),
          ilike(products.brand, like),
          ilike(products.product_code, like),
          ilike(products.hsn_code, like),
        )
      )
      .limit(LIMIT)
    for (const r of rows)
      hits.push({
        type: "product",
        id: r.id,
        title: r.name ?? "Product",
        subtitle: r.brand ?? r.code ?? undefined,
        href: `/products?id=${r.id}`,
      })
  }

  // VENDORS — procurement view, global
  if (await hasCapability("procurement", "view", session)) {
    const rows = await db
      .select({ id: vendors.id, name: vendors.name, gstin: vendors.gstin, contact: vendors.contact_person })
      .from(vendors)
      .where(
        or(
          ilike(vendors.name, like),
          ilike(vendors.trade_name, like),
          ilike(vendors.gstin, like),
          ilike(vendors.contact_person, like),
          ilike(vendors.phone, like),
        )
      )
      .limit(LIMIT)
    for (const r of rows)
      hits.push({
        type: "vendor",
        id: r.id,
        title: r.name ?? "Vendor",
        subtitle: r.gstin ?? r.contact ?? undefined,
        href: `/vendors?id=${r.id}`,
      })
  }

  // PURCHASE ORDERS — procurement view, branch-scoped
  if (await hasCapability("procurement", "view", session)) {
    const allowed = await branchIds("procurement")
    if (allowed === null || allowed.length > 0) {
      const rows = await db
        .select({ id: purchase_orders.id, num: purchase_orders.po_number, total: purchase_orders.total_amount })
        .from(purchase_orders)
        .where(
          allowed === null
            ? ilike(purchase_orders.po_number, like)
            : and(ilike(purchase_orders.po_number, like), inArray(purchase_orders.branch_id, allowed))
        )
        .limit(LIMIT)
      for (const r of rows)
        hits.push({
          type: "po",
          id: r.id,
          title: r.num ?? "PO",
          subtitle: r.total ? `₹${Number(r.total).toLocaleString("en-IN")}` : undefined,
          href: `/procurement/po-registry?po=${r.id}`,
        })
    }
  }

  // SERVICE JOBS — service view, branch-scoped
  if (await hasCapability("service", "view", session)) {
    const allowed = await branchIds("service")
    if (allowed === null || allowed.length > 0) {
      const rows = await db
        .select({ id: service_jobs.id, jid: service_jobs.job_id, title: service_jobs.title, serial: service_jobs.serial_number })
        .from(service_jobs)
        .where(
          allowed === null
            ? or(ilike(service_jobs.job_id, like), ilike(service_jobs.title, like), ilike(service_jobs.serial_number, like))
            : and(
                or(ilike(service_jobs.job_id, like), ilike(service_jobs.title, like), ilike(service_jobs.serial_number, like)),
                inArray(service_jobs.branch_id, allowed),
              )
        )
        .limit(LIMIT)
      for (const r of rows)
        hits.push({
          type: "job",
          id: r.id,
          title: r.jid ?? "Job",
          subtitle: r.title ?? undefined,
          href: `/service?job=${r.id}`,
        })
    }
  }

  return { hits }
}

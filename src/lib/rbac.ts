/**
 * OPS360 Role-Based Access Control — single source of truth.
 *
 * This file defines WHAT each role can do. It contains no I/O and no session logic —
 * it is a pure, testable description of the access model. Server enforcement and client
 * gating both read from here (see src/lib/access.ts).
 *
 * Capability ordering: approve > edit > view. A role granted "approve" on a module
 * implicitly has "edit" and "view"; "edit" implies "view".
 */

export const ROLES = [
  "super_admin",
  "general_manager",
  "branch_manager",
  "sales_associate",
  "finance_manager",
  "technician",
] as const

export type Role = (typeof ROLES)[number]

export const MODULES = [
  "sales",
  "procurement",
  "finance",
  "service",
  "hr",
  "inventory",
  "admin",
] as const

export type Module = (typeof MODULES)[number]

export type Capability = "view" | "edit" | "approve"

const CAP_RANK: Record<Capability, number> = { view: 1, edit: 2, approve: 3 }

/**
 * ROLE_MATRIX — each role maps each module to the HIGHEST capability it is granted.
 * A module absent from a role's entry means NO access to that module.
 *
 * Derived directly from the agreed access model:
 *  - super_admin:     everything, full.
 *  - general_manager: everything except Finance is view-only; full admin console.
 *  - branch_manager:  same as GM but branch-scoped (scope handled in access.ts, not here).
 *  - sales_associate: sales + procurement (create, NO approve) + service + inventory; no finance, no admin.
 *  - finance_manager: full finance; view-only everywhere else; NO admin console.
 *  - technician:      service only. (No inventory — spare parts are a future separate inventory.)
 *
 * Inventory note: every role here has at least "view" EXCEPT technician. The cross-branch
 * nature of inventory VIEW (so any branch can look up stock to request a transfer) is enforced
 * in access.ts via branchFilterFor(), not in this matrix.
 */
export const ROLE_MATRIX: Record<Role, Partial<Record<Module, Capability>>> = {
  super_admin: {
    sales: "approve", procurement: "approve", finance: "edit",
    service: "approve", hr: "edit", inventory: "edit", admin: "edit",
  },
  general_manager: {
    sales: "approve", procurement: "approve", finance: "view",
    service: "approve", hr: "edit", inventory: "edit", admin: "edit",
  },
  branch_manager: {
    sales: "approve", procurement: "approve", finance: "view",
    service: "approve", hr: "edit", inventory: "edit", admin: "edit",
  },
  sales_associate: {
    sales: "edit", procurement: "edit", service: "edit", inventory: "view",
  },
  finance_manager: {
    sales: "view", procurement: "view", finance: "edit",
    service: "view", hr: "view", inventory: "view",
  },
  technician: {
    service: "edit",
  },
}

/**
 * BRANCH_SCOPED — true if the role only sees its allotted branch(es); false if all-branch.
 * Used by access.ts to decide how to filter data queries.
 */
export const BRANCH_SCOPED: Record<Role, boolean> = {
  super_admin: false,
  general_manager: false,
  finance_manager: false,
  branch_manager: true,
  sales_associate: true,
  technician: true,
}

/**
 * ROLE_RANK — hierarchy for privilege escalation guards.
 * A user may not create or manage another user whose role rank is higher than their own.
 */
export const ROLE_RANK: Record<Role, number> = {
  super_admin: 6,
  general_manager: 5,
  finance_manager: 4,
  branch_manager: 3,
  technician: 2,
  sales_associate: 1,
}

/** Display labels for the UI. */
const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  general_manager: "General Manager",
  branch_manager: "Branch Manager",
  sales_associate: "Sales Associate",
  finance_manager: "Finance Manager",
  technician: "Technician",
}

/**
 * Legacy / loose role strings → canonical Role. Used to interpret the existing free-text
 * profiles.role / users.role values during the transition. Extend as needed.
 */
const LEGACY_ALIASES: Record<string, Role> = {
  "admin/owner": "super_admin",
  "admin": "super_admin",
  "owner": "super_admin",
  "super_admin": "super_admin",
  "staff": "sales_associate",
  "sales": "sales_associate",
  "sales_associate": "sales_associate",
  "manager": "general_manager",         // bare "manager" defaults to GM (all-branch); explicit branch_manager set on assignment
  "branch_manager": "branch_manager",
  "general_manager": "general_manager",
  "finance": "finance_manager",
  "finance_manager": "finance_manager",
  "technician": "technician",
}

/** Normalize any stored role string to a canonical Role, or null if unrecognized. */
export function normalizeRole(raw?: string | null): Role | null {
  if (!raw) return null
  const key = raw.toLowerCase().trim()
  return LEGACY_ALIASES[key] ?? (ROLES.includes(key as Role) ? (key as Role) : null)
}

/** True if `role` can perform `need` on `module`. Unknown roles get nothing. */
export function can(role: Role | string | null | undefined, module: Module, need: Capability): boolean {
  const r = typeof role === "string" ? normalizeRole(role) : role
  if (!r) return false
  const granted = ROLE_MATRIX[r]?.[module]
  if (!granted) return false
  return CAP_RANK[granted] >= CAP_RANK[need]
}

/** True if the role is restricted to its allotted branch(es). Unknown roles default to scoped (safest). */
export function isBranchScoped(role: Role | string | null | undefined): boolean {
  const r = typeof role === "string" ? normalizeRole(role) : role
  if (!r) return true
  return BRANCH_SCOPED[r] ?? true
}

/** User-facing display label for a role. Falls back to title-casing unknown strings. */
export function roleLabel(role?: string | null): string {
  const r = normalizeRole(role)
  if (r) return ROLE_LABELS[r]
  if (!role) return "User"
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Modules this role can at least VIEW — convenience for sidebar/nav gating. */
export function visibleModules(role: Role | string | null | undefined): Module[] {
  const r = typeof role === "string" ? normalizeRole(role) : role
  if (!r) return []
  return MODULES.filter((m) => can(r, m, "view"))
}

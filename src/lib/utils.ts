import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)
}

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Maps a stored role string to its user-facing display label.
 * Display-only — does NOT affect access control, which keys off the raw stored role.
 */
export function roleLabel(role?: string | null): string {
  if (!role) return "User"
  const normalized = role.toLowerCase().trim()
  const map: Record<string, string> = {
    "admin/owner": "Super Admin",
    "admin": "Super Admin",
    "owner": "Super Admin",
    "super_admin": "Super Admin",
    "staff": "Sales Associate",
    "sales": "Sales Associate",
  }
  if (map[normalized]) return map[normalized]
  // Fallback: existing behaviour — replace underscores, title-case
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

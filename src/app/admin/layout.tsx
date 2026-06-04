
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { DashboardShell } from "@/components/layout/DashboardShell"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: { user } } = await import("@/app/actions/user").then(m => m.getUserAction())

  if (!user) redirect("/login")

  const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction(user.id))
  const { data: permissionsData } = await import("@/app/actions/user").then(m => m.getUserPermissionsAction(user.id))

  const permissions = Array.isArray(permissionsData)
    ? permissionsData.reduce((acc: Record<string, boolean>, p: typeof import("@/db/schema").user_permissions.$inferSelect) => {
        acc[p.module] = p.enabled || false
        return acc
      }, {})
    : {}

  const rawProfile = profile || { id: user.id, full_name: user.email?.split("@")[0] || "User", email: user.email, role: "", branch_id: "" }
  const normalizedRole = (rawProfile as typeof import("@/db/schema").profiles.$inferSelect)?.role?.toLowerCase().trim() || ""
  const isAdmin = normalizedRole === "admin/owner" || normalizedRole === "admin" || normalizedRole === "owner" || normalizedRole === "super_admin"

  if (!isAdmin && user?.role !== "SUPER_ADMIN") redirect("/unauthorized")

  const { data: all_b } = await import("@/app/actions/generics").then(m => m.fetchData("branches"))

  let typedBranchAccess: { branch_id: string; is_primary: boolean; branches: { name: string } | { name: string }[] }[] = []

  if (isAdmin && Array.isArray(all_b)) {
    typedBranchAccess = (all_b as unknown as typeof import("@/db/schema").branches.$inferSelect[]).map((b) => ({
      branch_id: b.id,
      is_primary: false,
      branches: { name: b.name },
    }))
    typedBranchAccess.unshift({
      branch_id: "ALL_000",
      is_primary: false,
      branches: { name: "Global Overview (All Branches)" },
    })
  }

  const cookieStore = await cookies()
  const activeBranchIdFromCookie = cookieStore.get("active_branch_id")?.value
  const hasAccessToCookieBranch = typedBranchAccess.some((ba) => ba.branch_id === activeBranchIdFromCookie)
  const activeAccess = hasAccessToCookieBranch
    ? typedBranchAccess.find((ba) => ba.branch_id === activeBranchIdFromCookie)
    : typedBranchAccess[0]

  const branchId = activeAccess?.branch_id || (rawProfile as typeof import("@/db/schema").profiles.$inferSelect).branch_id || ""
  let branchName = ""
  if (activeAccess?.branches) {
    branchName = Array.isArray(activeAccess.branches) ? activeAccess.branches[0]?.name : activeAccess.branches.name
  } else {
    branchName = "Global Access"
  }

  const profileWithBranchName = {
    id: (rawProfile as typeof import("@/db/schema").profiles.$inferSelect).id || user.id,
    full_name: (rawProfile as typeof import("@/db/schema").profiles.$inferSelect).full_name || "",
    role: (rawProfile as typeof import("@/db/schema").profiles.$inferSelect).role || "",
    email: (rawProfile as typeof import("@/db/schema").profiles.$inferSelect).email || user.email || "",
    branch_id: branchId,
    branch_name: branchName,
    all_branches: typedBranchAccess.map((ba) => {
      const bName = Array.isArray(ba.branches) ? ba.branches[0]?.name : ba.branches?.name
      return { id: ba.branch_id, name: bName || "", is_primary: ba.is_primary }
    }),
  }

  return (
    <DashboardShell profile={profileWithBranchName} permissions={permissions}>
      {children}
    </DashboardShell>
  )
}

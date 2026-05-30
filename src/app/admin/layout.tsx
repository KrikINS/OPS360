
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { UserNav } from "@/components/user-nav"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const session = await getServerSession(authOptions)
  const user = session?.user;

  if (!user) redirect("/login")

  const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction(user.id))

  type ProfileType = typeof import("@/db/schema").profiles.$inferSelect
  type BranchType = typeof import("@/db/schema").branches.$inferSelect
  type PermissionType = typeof import("@/db/schema").user_permissions.$inferSelect
  const genericData = await import("@/app/actions/generics").then(m => m.fetchData("user_permissions"))
  const allPerms = genericData.data && Array.isArray(genericData.data) ? (genericData.data as PermissionType[]).filter((p) => p.user_id === user.id) : []

  const permissionsMap = allPerms.reduce((acc: Record<string, boolean>, p: PermissionType) => {
    acc[p.module] = p.enabled || false
    return acc
  }, {})

  const profileRole = (profile as ProfileType)?.role ?? ""
  const isAdminRole = profileRole === "Admin/Owner" || profileRole === "SUPER_ADMIN" || session?.user?.role === "SUPER_ADMIN"
  if (!isAdminRole) redirect("/unauthorized")

  const cookieStore = await cookies()
  const activeBranchId = cookieStore.get("active_branch_id")?.value || (profile as ProfileType)?.branch_id || ""

  let branchName = ""
  if (activeBranchId) {
    const { data: bList } = await import("@/app/actions/generics").then(m => m.fetchData("branches"))
    const b = Array.isArray(bList) ? (bList as BranchType[]).find((br) => br.id === activeBranchId) : null
    if (b) branchName = b.name as string
  } else if (isAdminRole) {
    branchName = "Global Access"
  }

  // Load all branches for switching if Admin
  let allBranches: { id: string; name: string; is_primary: boolean }[] | undefined = []
  if (isAdminRole) {
    const { data: b_list } = await import("@/app/actions/generics").then(m => m.fetchData("branches"))
    if (b_list && Array.isArray(b_list)) {
      allBranches = b_list.map((b: BranchType) => ({ id: b.id, name: b.name, is_primary: b.id === activeBranchId }))
    }
  }

  const profileWithBranch = {
    id: (profile as ProfileType)?.id || user.id,
    full_name: (profile as ProfileType)?.full_name || "",
    role: (profile as ProfileType)?.role || "",
    branch_id: activeBranchId,
    branch_name: branchName,
    all_branches: allBranches,
    email: user.email ?? (profile as ProfileType)?.email ?? "",
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      {/* Admin-only sidebar — no AppSidebar here */}
      <AdminSidebar profile={profileWithBranch} permissions={permissionsMap} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Admin Top Header */}
        <header className="h-14 flex items-center justify-between px-5 bg-white border-b shadow-sm shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-[#7FD1E3] animate-pulse" />
            <span className="text-sm font-semibold text-[#001529]">Admin Control Center</span>
            <span className="text-xs text-muted-foreground font-normal">— Administration Portal</span>
          </div>
          <UserNav profile={profileWithBranch} />
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

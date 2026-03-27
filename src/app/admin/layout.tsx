import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { UserNav } from "@/components/user-nav"
import { cookies } from "next/headers"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()
    
  // Fetch Module Permissions
  const { data: permissionsData } = await supabase
    .from("user_permissions")
    .select("module, enabled")
    .eq("user_id", user.id)

  const permissionsMap = (permissionsData || []).reduce((acc, p) => {
    acc[p.module] = p.enabled
    return acc
  }, {} as Record<string, boolean>)

  if (profile?.role !== "Admin/Owner") redirect("/unauthorized")

  const cookieStore = await cookies()
  const activeBranchId = cookieStore.get("active_branch_id")?.value || profile?.branch_id || ""

  let branchName = ""
  if (activeBranchId) {
    const { data: b } = await supabase.from("branches").select("name").eq("id", activeBranchId).single()
    if (b) branchName = b.name
  } else if (profile?.role === "Admin/Owner") {
    branchName = "Global Access"
  }

  // Load all branches for switching if Admin
  let allBranches: { id: string; name: string; is_primary: boolean }[] | undefined = undefined
  if (profile?.role === "Admin/Owner") {
    const { data: b_list } = await supabase.from("branches").select("id, name").order("name")
    if (b_list) {
      allBranches = b_list.map(b => ({ id: b.id, name: b.name, is_primary: b.id === activeBranchId }))
    }
  }

  const profileWithBranch = {
    ...profile,
    branch_id: activeBranchId,
    branch_name: branchName,
    all_branches: allBranches,
    email: user.email ?? profile?.email ?? "",
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

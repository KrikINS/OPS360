import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { UserNav } from "@/components/user-nav"

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

  if (profile?.role !== "admin") redirect("/unauthorized")

  let branchName = ""
  if (profile?.branch_id) {
    const { data: b } = await supabase.from("branches").select("name").eq("id", profile.branch_id).single()
    if (b) branchName = b.name
  }

  const profileWithBranch = {
    ...profile,
    branch_name: branchName,
    email: user.email ?? profile?.email ?? "",
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      {/* Admin-only sidebar — no AppSidebar here */}
      <AdminSidebar />
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

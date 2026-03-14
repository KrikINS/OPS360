import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { UserNav } from "@/components/user-nav"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { HelpCircle } from "lucide-react"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // Fetch HR metadata
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // Graceful fallback and Branch retrieval map
  const rawProfile = profile || { id: user.id, full_name: "Unknown User", email: user.email, role: "sales", branch_id: "" }
  let branchName = ""

  if (rawProfile.branch_id) {
     const { data: branchData } = await supabase.from("branches").select("name").eq("id", rawProfile.branch_id).single()
     if (branchData) branchName = branchData.name
  }

  const profileWithBranchName = {
     ...rawProfile,
     branch_name: branchName
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-hidden h-screen flex flex-col">
        <header className="h-14 flex items-center justify-between px-5 border-b bg-white shadow-sm gap-4 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-slate-500 hover:text-primary transition-colors" />
            <div className="h-5 w-[1px] bg-border" />
            <div className="font-semibold text-sm text-foreground tracking-tight">
              Ops360 <span className="text-muted-foreground font-normal">- {rawProfile.role.charAt(0).toUpperCase() + rawProfile.role.slice(1)} Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/docs" 
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-[#001529] transition-all"
              title="Help & Documentation"
            >
              <HelpCircle className="h-5 w-5" />
            </Link>
            <UserNav profile={profileWithBranchName} />
          </div>
        </header>
        <div className="flex-1 overflow-auto" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}

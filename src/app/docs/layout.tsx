import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { UserNav } from "@/components/user-nav"
import { DocsSidebar } from "@/components/docs/sidebar"
import Link from "next/link"
import { BookOpen, Home } from "lucide-react"

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }

  // Fetch HR metadata for UserNav
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const rawProfile = profile || { id: user.id, full_name: "User", email: user.email, role: "sales", branch_id: "" }
  
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
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Docs Header */}
      <header className="h-14 flex items-center justify-between px-5 border-b bg-[#001529] text-white gap-4 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Home className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-widest opacity-70">Back to App</span>
          </Link>
          <div className="h-4 w-[1px] bg-white/20" />
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#7FD1E3]" />
            <span className="font-bold tracking-tight text-white">Ops360 <span className="text-[#7FD1E3]">Knowledge Base</span></span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <UserNav profile={profileWithBranchName} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <DocsSidebar />
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-4xl mx-auto py-10 px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

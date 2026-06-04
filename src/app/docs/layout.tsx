
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
  
  const { data: { user } } = await import("@/app/actions/user").then(m => m.getUserAction());
  
  if (!user) {
    redirect("/login")
  }

  // Fetch HR metadata for UserNav
  const { data: profile } = await import("@/app/actions/user").then(m => m.getUserProfileAction(user.id))

  type ProfileType = typeof import("@/db/schema").profiles.$inferSelect
  type BranchType = typeof import("@/db/schema").branches.$inferSelect

  const rawProfile = profile || { id: user.id, full_name: "User", email: user.email, role: "sales", branch_id: "" }
  
  let branchName = ""
  if ((rawProfile as ProfileType).branch_id) {
     const { data: branchDataList } = await import("@/app/actions/generics").then(m => m.fetchData("branches"))
     const branchData = Array.isArray(branchDataList) ? (branchDataList as BranchType[]).find((b) => b.id === (rawProfile as ProfileType).branch_id) : null
     if (branchData) branchName = branchData.name as string
  }

  const profileWithBranchName = {
     id: (rawProfile as ProfileType).id || user.id,
     full_name: (rawProfile as ProfileType).full_name || "",
     email: (rawProfile as ProfileType).email || "",
     role: (rawProfile as ProfileType).role || "",
     branch_id: (rawProfile as ProfileType).branch_id || "",
     branch_name: branchName
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Docs Header */}
      <header className="h-14 flex items-center justify-between px-5 border-b bg-[#001529] text-white gap-4 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/launchpad" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
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

import { DashboardShell } from "@/components/layout/DashboardShell"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

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
    <DashboardShell profile={profileWithBranchName}>
      {children}
    </DashboardShell>
  )
}

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

  // Fetch Profile & Primary Branch Access
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // Fetch All Assigned Branches from user_branch_access
  const { data: branchAccess } = await supabase
    .from("user_branch_access")
    .select(`
      branch_id,
      is_primary,
      branches (
        name
      )
    `)
    .eq("user_id", user.id)

  const rawProfile = profile || { id: user.id, full_name: "Unknown User", email: user.email, role: "sales", assigned_branch_id: "" }
  
  // Determine Primary Branch
  const typedBranchAccess = (branchAccess || []) as unknown as Array<{
    branch_id: string;
    is_primary: boolean;
    branches: { name: string } | { name: string }[] | null;
  }>;

  const primaryAccess = typedBranchAccess.find(ba => ba.is_primary) || typedBranchAccess[0]
  const branchId = primaryAccess?.branch_id || (rawProfile as { assigned_branch_id?: string }).assigned_branch_id || ""
  
  // Normalized branch name extraction
  let branchName = ""
  if (primaryAccess?.branches) {
    branchName = Array.isArray(primaryAccess.branches) 
      ? primaryAccess.branches[0]?.name 
      : primaryAccess.branches.name;
  }

  const profileWithBranchName = {
     ...rawProfile,
     branch_id: branchId,
     branch_name: branchName,
     all_branches: typedBranchAccess.map(ba => {
       const bName = Array.isArray(ba.branches) 
         ? ba.branches[0]?.name 
         : ba.branches?.name;
       return {
         id: ba.branch_id,
         name: bName || "",
         is_primary: ba.is_primary
       };
     })
  }

  return (
    <DashboardShell profile={profileWithBranchName}>
      {children}
    </DashboardShell>
  )
}

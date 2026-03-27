import { DashboardShell } from "@/components/layout/DashboardShell"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

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
  
  // Identify branch access for switching
  let typedBranchAccess = (branchAccess || []) as unknown as Array<{
    branch_id: string;
    is_primary: boolean;
    branches: { name: string } | { name: string }[] | null;
  }>;

  // For Admins without explicit access entries, allow switching to ALL branches
  if (rawProfile.role === "Admin/Owner" && typedBranchAccess.length === 0) {
    const { data: all_b } = await supabase.from("branches").select("id, name")
    if (all_b) {
      typedBranchAccess = all_b.map(b => ({
        branch_id: b.id,
        is_primary: false,
        branches: { name: b.name }
      }))
    }
  }

  // Determine Active Branch (Cookie > Primary > First Allotted)
  const cookieStore = await cookies()
  const activeBranchIdFromCookie = cookieStore.get("active_branch_id")?.value

  // Verify if the cookie branch is actually one the user has access to
  const hasAccessToCookieBranch = typedBranchAccess.some((ba) => ba.branch_id === activeBranchIdFromCookie)

  const activeAccess = hasAccessToCookieBranch
    ? typedBranchAccess.find((ba) => ba.branch_id === activeBranchIdFromCookie)
    : typedBranchAccess.find((ba) => ba.is_primary) || typedBranchAccess[0]

  const branchId = activeAccess?.branch_id || (rawProfile as { assigned_branch_id?: string }).assigned_branch_id || ""

  // Normalized branch name extraction
  let branchName = ""
  if (activeAccess?.branches) {
    branchName = Array.isArray(activeAccess.branches) ? activeAccess.branches[0]?.name : activeAccess.branches.name
  } else if (rawProfile.role === "Admin/Owner") {
    branchName = "Global Access"
  }

  const profileWithBranchName = {
    ...rawProfile,
    branch_id: branchId,
    branch_name: branchName,
    all_branches: typedBranchAccess.map((ba) => {
      const bName = Array.isArray(ba.branches) ? ba.branches[0]?.name : ba.branches?.name
      return {
        id: ba.branch_id,
        name: bName || "",
        is_primary: ba.is_primary,
      }
    }),
  }

  return (
    <DashboardShell profile={profileWithBranchName}>
      {children}
    </DashboardShell>
  )
}

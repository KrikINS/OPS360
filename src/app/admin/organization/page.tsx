"use client"

import { OrganizationTab } from "@/components/admin/tabs/organization-tab"
import { Building2 } from "lucide-react"

export default function OrganizationPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organization Registry</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage branches, distribution centers, and office locations.</p>
        </div>
      </div>
      <OrganizationTab />
    </div>
  )
}

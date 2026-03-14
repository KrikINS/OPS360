"use client"

import { GlobalMastersTab } from "@/components/admin/tabs/global-masters-tab"
import { FolderTree } from "lucide-react"

export default function GlobalMastersPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
          <FolderTree className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Global Masters</h1>
          <p className="text-muted-foreground text-sm mt-1">Centralized management of brands and product categories.</p>
        </div>
      </div>
      <GlobalMastersTab />
    </div>
  )
}

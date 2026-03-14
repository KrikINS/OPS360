"use client"

import { BrandingTab } from "@/components/admin/tabs/branding-tab"
import { Palette } from "lucide-react"

export default function BrandingPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
          <Palette className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Company Branding</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure system theme, logo, and organization name.</p>
        </div>
      </div>
      <BrandingTab />
    </div>
  )
}

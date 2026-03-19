"use client"

import { GlobalMastersTab } from "@/components/admin/tabs/global-masters-tab"
import { HSNLookupTool } from "@/components/admin/hsn-lookup-tool"
import { FolderTree, Search, Tag } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function GlobalMastersPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <FolderTree className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Global Masters</h1>
            <p className="text-muted-foreground text-sm mt-1">Centralized management of brands, categories, and tax protocols.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="entities" className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1 border border-slate-200">
          <TabsTrigger value="entities" className="text-xs font-bold gap-2 px-6 data-[state=active]:bg-[#001529] data-[state=active]:text-white">
            <Tag className="h-3.5 w-3.5" /> Entity Masters
          </TabsTrigger>
          <TabsTrigger value="hsn" className="text-xs font-bold gap-2 px-6 data-[state=active]:bg-[#001529] data-[state=active]:text-white">
            <Search className="h-3.5 w-3.5" /> Global HSN Lookup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="mt-0">
          <GlobalMastersTab />
        </TabsContent>

        <TabsContent value="hsn" className="mt-0">
          <HSNLookupTool />
        </TabsContent>
      </Tabs>
    </div>
  )
}

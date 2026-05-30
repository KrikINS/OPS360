"use client"

import { GlobalMastersTab } from "@/components/admin/tabs/global-masters-tab"
import { HSNLookupTool } from "@/components/admin/hsn-lookup-tool"
import { OrganizationTab } from "@/components/admin/tabs/organization-tab"
import { FolderTree, Search, Building2, Palette, MapPin } from "lucide-react"
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

      <Tabs defaultValue="branches" className="w-full">
        <div className="flex items-center justify-between mb-8 overflow-x-auto scrollbar-hide pb-2">
          <TabsList className="bg-[#001529] p-1.5 rounded-2xl h-14 shrink-0 inline-flex shadow-xl border border-[#002b4d] gap-2">
            <TabsTrigger 
              value="branches" 
              className="text-[10px] font-black uppercase tracking-widest gap-2 px-8 h-11 rounded-xl transition-all duration-300 data-[state=active]:bg-[#001529] data-[state=active]:text-white data-[state=active]:ring-1 data-[state=active]:ring-[#7FD1E3]/50 data-[state=active]:shadow-[0_0_15px_rgba(127,209,227,0.3)] text-white/40 hover:text-white hover:bg-[#002a52] active:scale-95"
            >
              <MapPin className="h-3.5 w-3.5" /> Branch Master
            </TabsTrigger>
            <TabsTrigger 
              value="entities" 
              className="text-[10px] font-black uppercase tracking-widest gap-2 px-8 h-11 rounded-xl transition-all duration-300 data-[state=active]:bg-[#001529] data-[state=active]:text-white data-[state=active]:ring-1 data-[state=active]:ring-[#7FD1E3]/50 data-[state=active]:shadow-[0_0_15px_rgba(127,209,227,0.3)] text-white/40 hover:text-white hover:bg-[#002a52] active:scale-95"
            >
              <Building2 className="h-3.5 w-3.5" /> Entity Master
            </TabsTrigger>
            <TabsTrigger 
              value="hsn" 
              className="text-[10px] font-black uppercase tracking-widest gap-2 px-8 h-11 rounded-xl transition-all duration-300 data-[state=active]:bg-[#001529] data-[state=active]:text-white data-[state=active]:ring-1 data-[state=active]:ring-[#7FD1E3]/50 data-[state=active]:shadow-[0_0_15px_rgba(127,209,227,0.3)] text-white/40 hover:text-white hover:bg-[#002a52] active:scale-95"
            >
              <Search className="h-3.5 w-3.5" /> HSN Discovery
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="branches" className="mt-0">
          <OrganizationTab />
        </TabsContent>

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

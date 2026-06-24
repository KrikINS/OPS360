"use client"

import { GlobalMastersTab } from "@/components/admin/tabs/global-masters-tab"
import { HSNLookupTool } from "@/components/admin/hsn-lookup-tool"
import { OrganizationTab } from "@/components/admin/tabs/organization-tab"
import { FolderTree, Search, Building2, MapPin } from "lucide-react"
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
        <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-hide border-b border-slate-200/60 bg-slate-50/50 p-1 mb-8">
          <TabsList className="h-auto p-0 bg-transparent flex w-max min-w-full rounded-none border-none gap-1">
            <TabsTrigger 
              value="branches" 
              className="data-[state=active]:bg-[#001529] data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 transition-all duration-300 gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-tight group border border-slate-200 data-[state=active]:border-transparent hover:bg-white hover:text-[#001529] shadow-sm bg-slate-100/80"
            >
              <MapPin className="h-3.5 w-3.5 group-data-[state=active]:text-[#7FD1E3] transition-colors" /> Branch Master
            </TabsTrigger>
            <TabsTrigger 
              value="entities" 
              className="data-[state=active]:bg-[#001529] data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 transition-all duration-300 gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-tight group border border-slate-200 data-[state=active]:border-transparent hover:bg-white hover:text-[#001529] shadow-sm bg-slate-100/80"
            >
              <Building2 className="h-3.5 w-3.5 group-data-[state=active]:text-[#7FD1E3] transition-colors" /> Entity Master
            </TabsTrigger>
            <TabsTrigger 
              value="hsn" 
              className="data-[state=active]:bg-[#001529] data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 transition-all duration-300 gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-tight group border border-slate-200 data-[state=active]:border-transparent hover:bg-white hover:text-[#001529] shadow-sm bg-slate-100/80"
            >
              <Search className="h-3.5 w-3.5 group-data-[state=active]:text-[#7FD1E3] transition-colors" /> HSN Discovery
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

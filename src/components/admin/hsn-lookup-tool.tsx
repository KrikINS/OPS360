"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Calculator, ShieldCheck, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface HSNResult {
  hsn_code: string
  description: string
  gst_rate: number
}

export function HSNLookupTool() {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<HSNResult[]>([])
  const [loading, setLoading] = useState(false)
  const [paddingInput, setPaddingInput] = useState("")
  
  const paddedHSN = paddingInput.length > 0 && paddingInput.length < 8 
    ? paddingInput.padEnd(8, '0') 
    : paddingInput

  const fetchResults = useCallback(async (query: string) => {
    if (!query) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/hsn-lookup?query=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (data.data) setResults(data.data)
    } catch (error) {
      console.error("Fetch error:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, fetchResults])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Global HSN Search */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-[#001529] text-white">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Search className="h-4 w-4 text-[#7FD1E3]" /> Global HSN Lookup
            </CardTitle>
            <CardDescription className="text-white/60 text-xs">Search by code prefix or product keywords.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search AC, TV, 8415..." 
                className="pl-10 h-10 border-slate-200 focus-visible:ring-[#001529]"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="border rounded-xl divide-y overflow-hidden h-[300px] overflow-y-auto bg-slate-50/30">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Searching Master Database...</div>
              ) : results.length > 0 ? (
                results.map(r => (
                  <div key={r.hsn_code} className="p-4 flex items-center justify-between group hover:bg-white transition-colors border-l-4 border-transparent hover:border-l-[#001529]">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase text-[#001529] tracking-widest">{r.hsn_code}</p>
                      <p className="text-sm font-semibold text-slate-600 truncate">{r.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100 italic">
                         {r.gst_rate}% GST
                       </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-300 text-xs italic">
                  {search ? "No direct matches found." : "Type to begin HSN discovery."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Paisa-Perfect Padding Tool */}
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-slate-50/10">
          <CardHeader className="bg-white border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
              <Calculator className="h-4 w-4 text-emerald-600" /> Paisa-Perfect Padding
            </CardTitle>
            <CardDescription className="text-xs">Standardize short HSN codes to compliant 8-digit strings.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 px-8 space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Input Code</label>
              <Input 
                placeholder="e.g. 8415 (4 digits)" 
                className="h-14 text-2xl font-black text-[#001529] tracking-[0.2em] border-slate-200 focus-visible:ring-emerald-500 text-center"
                value={paddingInput}
                onChange={e => setPaddingInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
              />
            </div>

            <div className="flex items-center justify-center">
               <ArrowRight className="h-6 w-6 text-slate-200 animate-in slide-in-from-left-2" />
            </div>

            <div className={cn(
              "p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all",
              paddingInput.length > 0 ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100 grayscale opacity-50"
            )}>
              <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600">Corrected 8-Digit HSN</span>
              <div className="text-4xl font-black text-[#001529] tracking-[0.2em]">
                {paddedHSN || "00000000"}
              </div>
              {paddingInput.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white px-3 py-1 rounded-full shadow-sm border border-emerald-100 animate-in fade-in zoom-in">
                  <ShieldCheck className="h-3 w-3" /> Protocol Compliant
                </div>
              )}
            </div>

            <div className="pt-4 text-center">
              <p className="text-[10px] text-slate-400 font-medium italic">
                Note: Standardizing to 8-digits ensures compatibility with international shipping & Indian GST protocols.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

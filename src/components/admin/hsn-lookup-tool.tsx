"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Calculator, ShieldCheck, ArrowRight, ArrowUpRight, CheckCircle2, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface HSNResult {
  hsn_code: string
  description: string
  gst_rate: number
}

interface Product {
  id: string
  model_name: string
  brand: string
  hsn_code: string
}

export function HSNLookupTool() {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<HSNResult[]>([])
  const [loading, setLoading] = useState(false)
  const [paddingInput, setPaddingInput] = useState("")
  
  // Push to Product State
  const [pushHSN, setPushHSN] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [isPushing, setIsPushing] = useState(false)
  const [pushSuccess, setPushSuccess] = useState<string | null>(null)

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

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error("Fetch products error:", error)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, fetchResults])

  useEffect(() => {
    if (pushHSN) fetchProducts()
  }, [pushHSN, fetchProducts])

  const handlePush = async (productId: string) => {
    if (!pushHSN) return
    setIsPushing(true)
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hsn_code: pushHSN })
      })
      if (res.ok) {
        setPushSuccess(productId)
        setTimeout(() => {
          setPushSuccess(null)
          setPushHSN(null)
        }, 1500)
      }
    } catch (error) {
      console.error("Push error:", error)
    } finally {
      setIsPushing(false)
    }
  }

  const filteredProducts = products.filter(p => 
    p.model_name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.brand.toLowerCase().includes(productSearch.toLowerCase())
  )

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
                    <div className="flex flex-col items-end gap-1.5">
                       <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100 italic">
                         {r.gst_rate}% GST
                       </span>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="h-7 text-[10px] font-black uppercase text-slate-400 hover:text-[#001529] hover:bg-slate-100 gap-1 opacity-0 group-hover:opacity-100 transition-all px-2"
                         onClick={() => setPushHSN(r.hsn_code)}
                       >
                         Push to Product <ArrowUpRight className="h-3 w-3" />
                       </Button>
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
              "p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden group",
              paddingInput.length > 0 ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100 grayscale opacity-50"
            )}>
              <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600">Corrected 8-Digit HSN</span>
              <div className="text-4xl font-black text-[#001529] tracking-[0.2em]">
                {paddedHSN || "00000000"}
              </div>
              {paddingInput.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white px-3 py-1 rounded-full shadow-sm border border-emerald-100 animate-in fade-in zoom-in">
                    <ShieldCheck className="h-3 w-3" /> Protocol Compliant
                  </div>
                  <Button 
                    variant="outline"
                    className="mt-2 text-[10px] font-black uppercase text-emerald-700 border-emerald-200 hover:bg-emerald-100 h-8 opacity-0 group-hover:opacity-100 transition-all rounded-full"
                    onClick={() => setPushHSN(paddedHSN)}
                  >
                    Port to Registry <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Button>
                </>
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

      {/* Push to Product Dialog */}
      <Dialog open={!!pushHSN} onOpenChange={(open) => !open && setPushHSN(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#001529]" /> Push HSN to Product
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecting a product will update its record with HSN: <span className="font-black text-[#001529] underline">{pushHSN}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Find product by model or brand..." 
                className="pl-10 h-10"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto border rounded-lg divide-y bg-slate-50/50">
              {filteredProducts.map(p => (
                <div key={p.id} className="p-3 flex items-center justify-between hover:bg-white transition-all cursor-pointer group" onClick={() => !isPushing && handlePush(p.id)}>
                   <div className="min-w-0">
                     <p className="text-xs font-black text-[#001529] uppercase">{p.model_name}</p>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{p.brand} • {p.hsn_code || 'NO HSN'}</p>
                   </div>
                   <Button 
                     size="sm" 
                     className={cn(
                       "h-7 text-[10px] font-black uppercase transition-all",
                       pushSuccess === p.id ? "bg-emerald-500 hover:bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-[#001529] hover:text-white"
                     )}
                     disabled={isPushing}
                   >
                     {pushSuccess === p.id ? (
                       <><CheckCircle2 className="h-3 w-3 mr-1" /> Pushed</>
                     ) : isPushing ? (
                       "Pushing..."
                     ) : (
                       "Port HSN"
                     )}
                   </Button>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 italic">No products matched your search.</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

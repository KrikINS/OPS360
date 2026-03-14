"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRightLeft, Send, Search, CheckCircle2, Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type Branch = {
  id: string
  name: string
  code: string
}

export default function InterBranchTransferPage() {
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  
  const [sourceBranch, setSourceBranch] = useState<string>("")
  const [destBranch, setDestBranch] = useState<string>("")

  useEffect(() => {
    async function fetchBranches() {
      const supabase = createClient()
      const { data } = await supabase.from('branches').select('id, name, code')
      if (data) setBranches(data)
      setLoadingBranches(false)
    }
    fetchBranches()
  }, [])

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sourceBranch || !destBranch) {
      alert("Please select both source and destination branches.")
      return
    }
    if (sourceBranch === destBranch) {
      alert("Source and Destination branches cannot be the same.")
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    }, 1200)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ArrowRightLeft className="h-8 w-8 text-primary" />
          Inter-Branch Stock Transfer
        </h1>
        <p className="text-muted-foreground mt-1">Initiate and track serialized inventory movements across geographical branches.</p>
      </div>

      {success && (
        <div className="p-4 bg-green-50/50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-5 w-5" />
          <div className="font-medium">Transfer successfully initiated! Stock marked as In-Transit and Waybill generated.</div>
        </div>
      )}

      <Card className="shadow-md">
        <form onSubmit={handleTransfer}>
          <CardHeader>
            <CardTitle>Transfer Setup</CardTitle>
            <CardDescription>Select source and destination branches, then scan items.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Origin */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground">Source Warehouse</h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Branch:</label>
                  <Select value={sourceBranch} onValueChange={(val) => setSourceBranch(val || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingBranches ? "Loading..." : "Select Source"} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>{branch.name} ({branch.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Destination */}
              <div className="space-y-3 p-4 border rounded-lg bg-primary/5 border-primary/20">
                <h3 className="text-sm font-semibold uppercase text-primary">Destination Branch</h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Branch:</label>
                  <Select value={destBranch} onValueChange={(val) => setDestBranch(val || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingBranches ? "Loading..." : "Select Destination"} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>{branch.name} ({branch.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <label className="text-sm font-semibold">Scan Serial Number (<span className="text-muted-foreground">Serialized Tracking</span>)</label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="e.g. SN-AC-2026-991823" className="pl-9 font-mono" required />
                </div>
                <Button type="button" variant="outline">Verify Stock</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1 italic">Note: Only available stock can be transferred. E-Way Bill requirement applies to shipments &gt; ₹50,000.</p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold">E-Way Bill Remarks / Reason</label>
              <Input placeholder="E.g. Relocation due to excess demand in Bangalore." />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t p-6 flex justify-between items-center">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Send className="h-3 w-3" /> System will auto-generate Waybill upon submission.
            </div>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Initiate Transfer
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

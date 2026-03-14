"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Package, TrendingUp, AlertCircle, Loader2 } from "lucide-react"

type Branch = {
  id: string
  name: string
  location: string
  type: string
}

type InventoryItem = {
  id: string
  serial_number: string
  hsn_code: string
  status: string
  branch_id: string
  price: number
}

export default function InventoryDashboard() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch initial data
    const fetchData = async () => {
      setLoading(true)
      
      // Fetch Branches
      const { data: dbBranches, error: branchErr } = await supabase.from("branches").select("*")
      if (!branchErr && dbBranches) {
        setBranches(dbBranches)
      }

      // Fetch Inventory
      let query = supabase.from("inventory").select("*")
      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch)
      }
      
      const { data: dbInventory, error: invErr } = await query
      if (!invErr && dbInventory) {
        setInventory(dbInventory)
      } else {
        // Fallback or empty state handled below
        setInventory([])
      }
      
      setLoading(false)
    }

    fetchData()

    // Real-time subscription for inventory changes
    const channel = supabase
      .channel('inventory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        // Refetch inventory on any change for simplicity in this demo
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedBranch])

  const availableStock = inventory.filter(i => i.status === "Available").length
  const inTransit = inventory.filter(i => i.status === "In-Transit").length
  const soldStock = inventory.filter(i => i.status === "Sold").length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Inventory Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time stock monitoring across all Ops360 branches.</p>
        </div>

        <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg border shadow-sm">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Branch:</span>
          <Select value={selectedBranch} onValueChange={(val) => { if (val) setSelectedBranch(val) }}>
            <SelectTrigger className="w-[200px] border-none shadow-none focus:ring-0 text-sm">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Global (All Branches)</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name} — {b.location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Available */}
        <Card className="card-elevated card-hover border-t-4 border-t-[#7FD1E3]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Stock</CardTitle>
            <div className="h-8 w-8 rounded-full bg-[#e8f9fc] flex items-center justify-center">
              <Package className="h-4 w-4 text-[#7FD1E3]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? <Loader2 className="animate-spin mt-2 h-6 w-6 text-muted-foreground" /> : availableStock}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Units ready for sale or transfer</p>
          </CardContent>
        </Card>

        {/* In-Transit */}
        <Card className="card-elevated card-hover border-t-4 border-t-[#D4860A]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In-Transit</CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-[#D4860A]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? <Loader2 className="animate-spin mt-2 h-6 w-6 text-muted-foreground" /> : inTransit}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently moving between branches</p>
          </CardContent>
        </Card>

        {/* Sold */}
        <Card className="card-elevated card-hover border-t-4 border-t-[#5A9E78]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sold</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-[#5A9E78]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? <Loader2 className="animate-spin mt-2 h-6 w-6 text-muted-foreground" /> : soldStock}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Completed transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Inventory Table ── */}
      <Card className="card-elevated shadow-sm">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Inventory Register</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {inventory.length} item{inventory.length !== 1 ? "s" : ""} found
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#5A9E78] font-medium bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5A9E78] animate-pulse" />
              Live
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#7FD1E3]" />
            </div>
          ) : inventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
              <h3 className="text-base font-medium">No inventory found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No items match the current filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-striped">
                <TableHeader>
                  <TableRow className="bg-[#001529] hover:bg-[#001529]">
                    <TableHead className="text-white font-semibold text-xs uppercase tracking-wider">Serial No.</TableHead>
                    <TableHead className="text-white font-semibold text-xs uppercase tracking-wider">HSN Code</TableHead>
                    <TableHead className="text-white font-semibold text-xs uppercase tracking-wider">Price (₹)</TableHead>
                    <TableHead className="text-white font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-white font-semibold text-xs uppercase tracking-wider">Branch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id} className="border-b border-border/50 transition-colors">
                      <TableCell className="font-mono text-sm font-medium text-foreground">{item.serial_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.hsn_code}</TableCell>
                      <TableCell className="text-sm font-medium">₹{item.price.toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <span className={
                          item.status === "Available"
                            ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-[#5A9E78] border border-green-100"
                            : item.status === "In-Transit"
                            ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-[#D4860A] border border-amber-100"
                            : "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-[#C0392B] border border-red-100"
                        }>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {branches.find(b => b.id === item.branch_id)?.name || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

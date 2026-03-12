"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventory Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time stock monitoring and branch management.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-card p-2 rounded-lg border shadow-sm">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap px-2">Select Branch:</span>
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[200px] border-none shadow-none focus:ring-0">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Global (All Branches)</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name} - {b.location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-t-4 border-t-chart-2 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available Stock</CardTitle>
            <Package className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? <Loader2 className="animate-spin mt-2" /> : availableStock}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for sale or transfer</p>
          </CardContent>
        </Card>
        
        <Card className="border-t-4 border-t-chart-4 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In-Transit</CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? <Loader2 className="animate-spin mt-2" /> : inTransit}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently moving between branches</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-chart-5 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sold</CardTitle>
            <AlertCircle className="h-4 w-4 text-chart-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? <Loader2 className="animate-spin mt-2" /> : soldStock}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed transactions</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Inventory List</CardTitle>
          <CardDescription>Detailed view of all appliances and their current status.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : inventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/20 rounded-lg border border-dashed">
              <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No inventory found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                No items match the selected branch criteria, or you do not have permission to view them.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Serial Number</TableHead>
                    <TableHead>HSN Code</TableHead>
                    <TableHead>Price (₹)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Branch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-medium">{item.serial_number}</TableCell>
                      <TableCell>{item.hsn_code}</TableCell>
                      <TableCell>₹{item.price.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.status === "Available" ? "default" : item.status === "In-Transit" ? "secondary" : "destructive"}
                          className="font-medium"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {branches.find(b => b.id === item.branch_id)?.name || item.branch_id}
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

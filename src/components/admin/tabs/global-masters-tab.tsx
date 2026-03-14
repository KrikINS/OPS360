"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Loader2, FolderTree, Tag, LayoutGrid } from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"

interface MasterItem {
  id: string
  name: string
  created_at: string
}

export function GlobalMastersTab() {
  const [brands, setBrands] = useState<MasterItem[]>([])
  const [categories, setCategories] = useState<MasterItem[]>([])
  const [loading, setLoading] = useState(false)
  const [newBrand, setNewBrand] = useState("")
  const [newCategory, setNewCategory] = useState("")

  useEffect(() => {
    fetchMasters()
  }, [])

  const fetchMasters = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: b } = await supabase.from("brands").select("*").order("name")
    const { data: c } = await supabase.from("categories").select("*").order("name")
    if (b) setBrands(b)
    if (c) setCategories(c)
    setLoading(false)
  }

  const addMaster = async (table: "brands" | "categories", name: string, setter: (val: string) => void) => {
    if (!name.trim()) return
    const supabase = createClient()
    const { error } = await supabase.from(table).insert({ name }).select()
    if (error) alert(error.message)
    else {
      setter("")
      fetchMasters()
    }
  }

  const deleteMaster = async (table: "brands" | "categories", id: string) => {
    if (!confirm("Are you sure? This may affect existing products.")) return
    const supabase = createClient()
    const { error } = await supabase.from(table).delete().eq("id", id)
    if (error) alert("Referential Integrity: " + error.message)
    else fetchMasters()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card className="card-elevated">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#C0392B]" /> Brand Master
          </CardTitle>
          <CardDescription className="text-xs">Manage standardized product brands.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Enter new brand..." 
              value={newBrand} 
              onChange={e => setNewBrand(e.target.value)} 
              onKeyDown={e => e.key === "Enter" && addMaster("brands", newBrand, setNewBrand)}
            />
            <Button onClick={() => addMaster("brands", newBrand, setNewBrand)} className="bg-[#001529] font-bold">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
            {brands.map(b => (
              <div key={b.id} className="p-3 flex items-center justify-between group hover:bg-slate-50">
                <span className="text-sm font-semibold text-slate-700">{b.name}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteMaster("brands", b.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-[#5A9E78]" /> Category Master
          </CardTitle>
          <CardDescription className="text-xs">Manage standardized product categories.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Enter new category..." 
              value={newCategory} 
              onChange={e => setNewCategory(e.target.value)} 
              onKeyDown={e => e.key === "Enter" && addMaster("categories", newCategory, setNewCategory)}
            />
            <Button onClick={() => addMaster("categories", newCategory, setNewCategory)} className="bg-[#001529] font-bold">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
            {categories.map(c => (
              <div key={c.id} className="p-3 flex items-center justify-between group hover:bg-slate-50">
                <span className="text-sm font-semibold text-slate-700">{c.name}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteMaster("categories", c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

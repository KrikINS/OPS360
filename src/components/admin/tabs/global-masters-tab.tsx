"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Tag, LayoutGrid, FileText, CheckCircle2, Pencil, Save } from "lucide-react"
import { useState, useEffect, useCallback } from "react"

import { cn } from "@/lib/utils"
import { ModernOrbitSpinner } from "@/components/ui/ModernOrbitSpinner"

interface MasterItem {
  id: string
  name: string
  created_at?: string | Date | null
}

interface TermsTemplate {
  id: string
  name: string
  content: string
  is_default: boolean | null
  created_at?: string | Date | null
}

interface ReturnReasonMaster {
  id: string
  reason_text: string
  is_active: boolean | null
  created_at?: string | Date | null
}

export function GlobalMastersTab() {
  const [brands, setBrands] = useState<MasterItem[]>([])
  const [categories, setCategories] = useState<MasterItem[]>([])
  const [terms, setTerms] = useState<TermsTemplate[]>([])
  const [returnReasons, setReturnReasons] = useState<ReturnReasonMaster[]>([])
  
  const [newBrand, setNewBrand] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [newReturnReason, setNewReturnReason] = useState("")
  
  const [newTermName, setNewTermName] = useState("")
  const [newTermContent, setNewTermContent] = useState("")
  const [isDefaultTerm, setIsDefaultTerm] = useState(false)
  const [editingTermId, setEditingTermId] = useState<string | null>(null)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [success, setSuccess] = useState<Record<string, boolean>>({})

  const setTableLoading = (table: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [table]: isLoading }))
  }

  const setTableSuccess = (table: string, isSuccess: boolean) => {
    setSuccess(prev => ({ ...prev, [table]: isSuccess }))
    if (isSuccess) {
      setTimeout(() => setSuccess(prev => ({ ...prev, [table]: false })), 3000)
    }
  }

  const fetchMasters = useCallback(async () => {
    const { fetchData } = await import("@/app/actions/generics")
    
    const [
      { data: b },
      { data: c },
      { data: t },
      { data: rr }
    ] = await Promise.all([
      fetchData("brands"),
      fetchData("categories"),
      fetchData("po_terms_templates"),
      fetchData("return_reason_master")
    ])

    if (b) setBrands(b as typeof import("@/db/schema").brands.$inferSelect[])
    if (c) setCategories(c as typeof import("@/db/schema").categories.$inferSelect[])
    if (t) setTerms(t as typeof import("@/db/schema").po_terms_templates.$inferSelect[])
    if (rr) setReturnReasons(rr as typeof import("@/db/schema").return_reason_master.$inferSelect[])
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMasters();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMasters])

  const addMaster = async (table: string, data: Record<string, string | boolean>) => {
    setTableLoading(table, true)
    
    const { insertData } = await import("@/app/actions/generics")
    const { error } = await insertData(table as 'brands' | 'categories' | 'po_terms_templates' | 'return_reason_master', [data])
    if (error) {
      alert(`Master Update Failed: ${error.message}`)
      setTableLoading(table, false)
    }
    else {
      if (table === "brands") setNewBrand("")
      if (table === "categories") setNewCategory("")
      if (table === "return_reason_master") setNewReturnReason("")
      if (table === "po_terms_templates") {
        setNewTermName("")
        setNewTermContent("")
        setIsDefaultTerm(false)
      }
      fetchMasters()
      setTableLoading(table, false)
      setTableSuccess(table, true)
    }
  }

  const updateTermTemplate = async () => {
    if (!editingTermId || !newTermName.trim() || !newTermContent.trim()) return;
    
    const { updateData } = await import("@/app/actions/generics")
    const { error } = await updateData("po_terms_templates", {
      id: editingTermId,
      name: newTermName.trim(),
      content: newTermContent.trim(),
      is_default: isDefaultTerm
    })
    
    if (error) alert("Error updating: " + error.message)
    else {
      cancelEditingTerm()
      fetchMasters()
    }
  }

  const startEditingTerm = (term: TermsTemplate) => {
    setEditingTermId(term.id)
    setNewTermName(term.name)
    setNewTermContent(term.content)
    setIsDefaultTerm(term.is_default ?? false)
  }

  const cancelEditingTerm = () => {
    setEditingTermId(null)
    setNewTermName("")
    setNewTermContent("")
    setIsDefaultTerm(false)
  }

  const toggleReasonStatus = async (id: string, currentStatus: boolean) => {
    const { updateData } = await import("@/app/actions/generics")
    const { error } = await updateData("return_reason_master", { id, is_active: !currentStatus })
    if (error) alert(error.message)
    else fetchMasters()
  }

  const deleteMaster = async (table: string, id: string) => {
    if (!confirm("Are you sure? This action cannot be undone.")) return
    
    const { deleteData } = await import("@/app/actions/generics")
    const { error } = await deleteData(table as 'brands' | 'categories' | 'po_terms_templates' | 'return_reason_master', id)
    if (error) alert("Error deleting: " + error.message)
    else fetchMasters()
  }

  const toggleDefaultTerm = async (id: string, currentStatus: boolean) => {
    if (currentStatus) return // Already default
    
    const { updateData, fetchData } = await import("@/app/actions/generics")
    
    // Unset current default
    const { data: allTerms } = await fetchData("po_terms_templates")
    if (allTerms) {
      const defaultTerms = (allTerms as typeof import("@/db/schema").po_terms_templates.$inferSelect[]).filter(t => t.is_default)
      for (const t of defaultTerms) {
        await updateData("po_terms_templates", { id: t.id, is_default: false })
      }
    }
    
    // Set new default
    const { error } = await updateData("po_terms_templates", { id, is_default: true })
    
    if (error) alert(error.message)
    else fetchMasters()
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Brand Master */}
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
                onKeyDown={e => e.key === "Enter" && newBrand.trim() && addMaster("brands", { name: newBrand.trim() })}
              />
              <Button 
                onClick={() => newBrand.trim() && addMaster("brands", { name: newBrand.trim() })} 
                disabled={!newBrand.trim() || loading['brands']}
                className={cn(
                  "font-bold shadow-soft h-10 min-w-[44px] transition-all duration-300",
                  success['brands'] ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#001529]"
                )}
              >
                {loading['brands'] ? (
                  <ModernOrbitSpinner size="sm" />
                ) : success['brands'] ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="border rounded-xl divide-y overflow-hidden h-[250px] overflow-y-auto bg-white/50">
              {brands.map(b => (
                <div key={b.id} className="p-3 flex items-center justify-between group hover:bg-white transition-colors">
                  <span className="text-sm font-semibold text-slate-700">{b.name}</span>
                  <Button variant="ghost" size="icon" className="text-slate-300 hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteMaster("brands", b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {brands.length === 0 && <div className="p-8 text-center text-slate-400 text-xs italic">No brands defined.</div>}
            </div>
          </CardContent>
        </Card>

        {/* Category Master */}
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
                onKeyDown={e => e.key === "Enter" && newCategory.trim() && addMaster("categories", { name: newCategory.trim() })}
              />
              <Button 
                onClick={() => newCategory.trim() && addMaster("categories", { name: newCategory.trim() })} 
                disabled={!newCategory.trim() || loading['categories']}
                className={cn(
                  "font-bold shadow-soft h-10 min-w-[44px] transition-all duration-300",
                  success['categories'] ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#001529]"
                )}
              >
                {loading['categories'] ? (
                  <ModernOrbitSpinner size="sm" />
                ) : success['categories'] ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="border rounded-xl divide-y overflow-hidden h-[250px] overflow-y-auto bg-white/50">
              {categories.map(c => (
                <div key={c.id} className="p-3 flex items-center justify-between group hover:bg-white transition-colors">
                  <span className="text-sm font-semibold text-slate-700">{c.name}</span>
                  <Button variant="ghost" size="icon" className="text-slate-300 hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteMaster("categories", c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {categories.length === 0 && <div className="p-8 text-center text-slate-400 text-xs italic">No categories defined.</div>}
            </div>
          </CardContent>
        </Card>

        {/* Return Reason Master */}
        <Card className="card-elevated">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Return Reason Master
            </CardTitle>
            <CardDescription className="text-xs">Manage standardized reasons for product returns.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Enter new return reason..." 
                value={newReturnReason} 
                onChange={e => setNewReturnReason(e.target.value)} 
                onKeyDown={e => e.key === "Enter" && newReturnReason.trim() && addMaster("return_reason_master", { reason_text: newReturnReason.trim() })}
              />
              <Button 
                onClick={() => newReturnReason.trim() && addMaster("return_reason_master", { reason_text: newReturnReason.trim() })} 
                disabled={!newReturnReason.trim() || loading['return_reason_master']}
                className={cn(
                  "font-bold shadow-soft h-10 min-w-[44px] transition-all duration-300",
                  success['return_reason_master'] ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#001529]"
                )}
              >
                {loading['return_reason_master'] ? (
                  <ModernOrbitSpinner size="sm" />
                ) : success['return_reason_master'] ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="border rounded-xl divide-y overflow-hidden h-[250px] overflow-y-auto bg-white/50">
              {returnReasons.map(r => (
                <div key={r.id} className="p-3 flex items-center justify-between group hover:bg-white transition-colors">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={r.is_active ?? false}
                      onCheckedChange={() => toggleReasonStatus(r.id, r.is_active ?? false)}
                      className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <span className={cn("text-sm font-semibold text-slate-700", !r.is_active && "text-slate-400 line-through")}>{r.reason_text}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-300 hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteMaster("return_reason_master", r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {returnReasons.length === 0 && <div className="p-8 text-center text-slate-400 text-xs italic">No reasons defined.</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PO Terms Master */}
      <Card className="card-elevated">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#2E86C1]" /> Procurement Terms & Conditions
          </CardTitle>
          <CardDescription className="text-xs">Create and manage reusable T&C templates for Purchase Orders.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-1 space-y-4 p-4 rounded-xl border ${editingTermId ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/30'}`}>
              <div className="flex justify-between items-center">
                <p className={`text-xs font-black uppercase tracking-wider ${editingTermId ? 'text-amber-600' : 'text-slate-400'}`}>
                  {editingTermId ? 'Edit Template' : 'Add New Template'}
                </p>
                {editingTermId && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-slate-400 hover:text-slate-700" onClick={cancelEditingTerm}>
                    Cancel
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Template Name</Label>
                  <Input 
                    placeholder="e.g., Standard Service Terms" 
                    value={newTermName} 
                    onChange={e => setNewTermName(e.target.value)} 
                    className="bg-white border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Terms Content</Label>
                  <Textarea 
                    placeholder="Enter the full terms text..." 
                    rows={6}
                    value={newTermContent} 
                    onChange={e => setNewTermContent(e.target.value)}
                    className="bg-white border-slate-200 text-sm font-medium leading-relaxed"
                  />
                </div>
                <div className="flex items-center space-x-2 py-2">
                  <Checkbox 
                    id="default-term" 
                    checked={isDefaultTerm} 
                    onCheckedChange={(checked: boolean) => setIsDefaultTerm(checked)} 
                  />
                  <Label htmlFor="default-term" className="text-xs font-semibold cursor-pointer">Set as default for new POs</Label>
                </div>
                {editingTermId ? (
                  <Button 
                    onClick={updateTermTemplate} 
                    disabled={!newTermName.trim() || !newTermContent.trim()}
                    className="w-full bg-amber-600 hover:bg-amber-700 font-black uppercase tracking-widest text-[10px]"
                  >
                    <Save className="h-3 w-3 mr-2" /> Update Template
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      if (newTermName.trim() && newTermContent.trim()) {
                        addMaster("po_terms_templates", { 
                          name: newTermName.trim(), 
                          content: newTermContent.trim(), 
                          is_default: isDefaultTerm 
                        })
                      }
                    }} 
                    disabled={!newTermName.trim() || !newTermContent.trim() || loading['po_terms_templates']}
                    className={cn(
                      "w-full font-black uppercase tracking-widest text-[10px] transition-all duration-300",
                      success['po_terms_templates'] ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#001529]"
                    )}
                  >
                    {loading['po_terms_templates'] ? (
                      <ModernOrbitSpinner size="sm" />
                    ) : success['po_terms_templates'] ? (
                      <><CheckCircle2 className="h-3 w-3 mr-2" /> Template Saved</>
                    ) : (
                      <><Plus className="h-3 w-3 mr-2" /> Save Template</>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="border rounded-xl bg-white overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b">
                    <tr className="text-[10px] uppercase font-black tracking-[0.1em] text-slate-400">
                      <th className="px-4 py-3">Template Name</th>
                      <th className="px-4 py-3">Default</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {terms.map(item => (
                      <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4">
                          <p className="text-sm font-extrabold text-[#001529]">{item.name}</p>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 italic">{item.content}</p>
                        </td>
                        <td className="px-4 py-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`h-9 px-3 gap-1.5 rounded-full border ${item.is_default ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'text-slate-300 border-slate-100 hover:bg-slate-100'}`}
                            onClick={() => toggleDefaultTerm(item.id, item.is_default ?? false)}
                          >
                            <CheckCircle2 className={`h-3 w-3 ${item.is_default ? 'fill-emerald-600 text-white' : ''}`} />
                            <span className="text-[9px] font-black uppercase tracking-tighter">{item.is_default ? 'Default' : 'Set Default'}</span>
                          </Button>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-slate-400 hover:text-[#001529] hover:bg-slate-100" 
                              onClick={() => startEditingTerm(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-slate-400 hover:text-destructive hover:bg-red-50" 
                              onClick={() => deleteMaster("po_terms_templates", item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {terms.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-12 text-center text-slate-400 text-xs italic">
                          No terms templates defined. Add one to pre-fill POs.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

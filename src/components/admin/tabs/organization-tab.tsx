"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MapPin, Plus, Trash2, Phone, Mail, User, CreditCard, Edit2, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"

interface Branch {
  id: string
  name: string
  code: string
  full_address: string
  city: string
  state: string
  state_code: string
  pincode: string
  manager_name: string
  phone: string
  email: string
  gstin: string
}

const KERALA_DEFAULTS = {
  state: "Kerala",
  state_code: "32"
}

export function OrganizationTab() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [isAddingBranch, setIsAddingBranch] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    full_address: "",
    city: "",
    state: KERALA_DEFAULTS.state,
    state_code: KERALA_DEFAULTS.state_code,
    pincode: "",
    manager_name: "",
    phone: "",
    email: "",
    gstin: ""
  })

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    setLoadingBranches(true)
    
    const { data } = await import("@/app/actions/generics").then(m => m.fetchData("branches"))
    if (data && Array.isArray(data)) {
      const { mapToBranch } = await import("@/utils/data-mappers")
      setBranches(data.map(mapToBranch) as Branch[])
    }
    setLoadingBranches(false)
  }

  const handleSaveBranch = async () => {
    if (!formData.name) {
      alert("Branch Name is required.")
      return
    }
    
    setLoadingBranches(true)
    try {
      
      
      if (editingId) {
        const result = await import("@/app/actions/masters").then(m => m.updateBranchAction(editingId, {
          ...formData,
          location: formData.city || "Kerala",
        }))
        const { error: updateErr } = result as { error?: { message: string } | string; success?: boolean }
        if (updateErr) throw new Error(typeof updateErr === 'string' ? updateErr : (updateErr as {message: string}).message || 'Update failed')
      } else {
        const result = await import("@/app/actions/masters").then(m => m.addBranchAction({
            ...formData,
            location: formData.city || "Kerala",
            type: "Main"
        }))
        const { error: insertErr } = result as { error?: { message: string } | string; success?: boolean }
        if (insertErr) throw new Error(typeof insertErr === 'string' ? insertErr : (insertErr as {message: string}).message || 'Insert failed')
      }
      
      await fetchBranches()
      setIsAddingBranch(false)
      setEditingId(null)
      setFormData({
        name: "",
        code: "",
        full_address: "",
        city: "",
        state: KERALA_DEFAULTS.state,
        state_code: KERALA_DEFAULTS.state_code,
        pincode: "",
        manager_name: "",
        phone: "",
        email: "",
        gstin: ""
      })
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoadingBranches(false)
    }
  }

  const deleteBranch = async (id: string) => {
    if (!confirm("Are you sure you want to delete this branch?")) return
    
    const { error } = await import("@/app/actions/generics").then(m => m.deleteData("branches", id))
    if (error) alert("Failed: " + error.message)
    else setBranches(prev => prev.filter(b => b.id !== id))
  }

  return (
    <Card className="card-elevated animate-in fade-in slide-in-from-bottom-2 duration-500">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b bg-slate-50/50">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Branch Registry
          </CardTitle>
          <CardDescription className="text-xs">
            Centralized registry for all regional branches.
          </CardDescription>
        </div>
        
        <Dialog open={isAddingBranch} onOpenChange={setIsAddingBranch}>
          <DialogTrigger render={
            <Button size="sm" className="bg-[#001529] hover:bg-[#002a52] gap-1.5 font-bold shadow-md" />
          }>
            <Plus className="h-4 w-4" /> New Branch
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Branch" : "Add New Branch"}</DialogTitle>
              <DialogDescription>{editingId ? "Update branch legal and contact details." : "Enter legal and contact details for the new branch."}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Branch Name*</Label>
                  <Input placeholder="e.g., Ernakulam Main" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Branch Code</Label>
                  <Input 
                    value={editingId ? formData.code : "Auto-generated"} 
                    disabled 
                    className="bg-muted text-muted-foreground font-medium"
                  />
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Full Address</Label>
                <Input placeholder="Building name, Street..." value={formData.full_address} onChange={e => setFormData({...formData, full_address: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input placeholder="e.g., Kochi" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input placeholder="682001" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={formData.state} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>State Code</Label>
                <Input value={formData.state_code} disabled className="bg-muted" />
              </div>
              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="text-sm font-semibold mb-3">Contact & Legal</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><User className="h-3 w-3" /> Manager Name</Label>
                    <Input value={formData.manager_name} onChange={e => setFormData({...formData, manager_name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><CreditCard className="h-3 w-3" /> GSTIN</Label>
                    <Input placeholder="32AAAAA0000A1Z5" value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Phone className="h-3 w-3" /> Phone</Label>
                    <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Mail className="h-3 w-3" /> Email</Label>
                    <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingBranch(false)}>Cancel</Button>
              <Button onClick={handleSaveBranch} className="bg-[#001529] font-bold">
                {loadingBranches ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingId ? "Save Changes" : "Create Branch"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-3xl border-none shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl">
            {selectedBranch && (
              <div className="flex flex-col">
                <div className="p-8 bg-[#001529] text-white space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-200">Branch Details</span>
                      </div>
                      <h2 className="text-3xl font-black tracking-tight">{selectedBranch.name}</h2>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold tracking-wider border border-white/20">{selectedBranch.code}</span>
                        <span className="text-white/60 text-xs font-medium">{selectedBranch.city}, {selectedBranch.state}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <MapPin className="h-3 w-3" /> Location & Address
                      </h4>
                      <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Full Address</p>
                          <p className="text-sm font-semibold text-slate-900 leading-relaxed">{selectedBranch.full_address || 'N/A'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">City</p>
                            <p className="text-sm font-semibold text-slate-900 break-words">{selectedBranch.city || 'N/A'}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Pincode</p>
                            <p className="text-sm font-semibold text-slate-900 break-words">{selectedBranch.pincode || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">State</p>
                            <p className="text-sm font-semibold text-slate-900 break-words">{selectedBranch.state}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">State Code</p>
                            <p className="text-sm font-semibold text-slate-900 break-words">{selectedBranch.state_code}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <User className="h-3 w-3" /> Contact & Legal
                      </h4>
                      <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Manager</p>
                          <p className="text-sm font-semibold text-slate-900">{selectedBranch.manager_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">GSTIN</p>
                          <p className="text-sm font-semibold text-slate-900">{selectedBranch.gstin || 'No GST Record'}</p>
                        </div>
                        <div className="pt-2 flex flex-col gap-2">
                          <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                            <Phone className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-bold text-slate-700">{selectedBranch.phone || 'No Phone'}</span>
                          </div>
                          <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                            <Mail className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-bold text-slate-700">{selectedBranch.email || 'No Email'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="px-8 py-4 bg-slate-50 border-t flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    className="font-bold text-xs px-6"
                    onClick={() => {
                      setIsViewOpen(false)
                      setEditingId(selectedBranch.id)
                      setFormData({...selectedBranch})
                      setIsAddingBranch(true)
                    }}
                  >
                    Edit Branch
                  </Button>
                  <Button 
                    className="bg-[#001529] font-bold text-xs px-6"
                    onClick={() => setIsViewOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y overflow-hidden">
          {loadingBranches ? (
            <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground opacity-50" /></div>
          ) : branches.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground font-medium">No branches found. Click &apos;New Branch&apos; to begin.</div>
          ) : (
            <div className="grid grid-cols-1 divide-y">
              {branches.map(branch => (
                <div 
                  key={branch.id} 
                  className="p-5 flex items-center justify-between group hover:bg-slate-50 transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-[#001529]"
                  onClick={() => {
                    setSelectedBranch(branch)
                    setIsViewOpen(true)
                  }}
                >
                  <div className="flex items-start gap-4 pointer-events-none">
                    <div className="p-2.5 rounded-lg bg-[#001529] text-white shadow-sm transition-transform group-hover:scale-110">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 group-hover:text-[#001529] transition-colors">{branch.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-black border border-blue-100 uppercase tracking-wider">{branch.code}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 font-medium">
                        {branch.city}, {branch.state} <span className="text-slate-200">|</span> {branch.gstin || 'No GST'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 md:opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:shadow-md"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(branch.id)
                        setFormData({...branch})
                        setIsAddingBranch(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-slate-400 hover:text-destructive hover:bg-red-50 md:opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:shadow-md"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteBranch(branch.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

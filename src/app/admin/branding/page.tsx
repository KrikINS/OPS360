"use client"; // Standardized for client use

import { LogoUploader } from "@/components/logo-uploader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Type, Loader2, CheckCircle2, MapPin, Plus, Trash2, Building2, Phone, Mail, User, CreditCard, Edit2 } from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
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

export default function BrandingPage() {
  const [companyName, setCompanyName] = useState("Ops360 Systems")
  const [savingName, setSavingName]   = useState(false)
  const [nameSaved, setNameSaved]     = useState(false)
  const [currentLogo, setCurrentLogo] = useState("/ethan-logo.png")
  
  // Branch Management State
  const [branches, setBranches] = useState<Branch[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [isAddingBranch, setIsAddingBranch] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form State
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


  const handleSaveBranch = async () => {
    if (!formData.name || !formData.code) {
      alert("Branch Name and Code are required.")
      return
    }
    
    setLoadingBranches(true)
    try {
      console.log(`Attempting to ${editingId ? 'update' : 'insert'} branch:`, formData)
      const supabase = createClient()
      
      let res;
      if (editingId) {
        res = await supabase.from("branches").update({
          ...formData,
          location: formData.city || "Kerala", // Required by schema
        }).eq("id", editingId).select()
      } else {
        res = await supabase.from("branches").insert({
            ...formData,
            location: formData.city || "Kerala", // Required by schema
            type: "Main" // Default for now
        }).select()
      }

      const { data, error } = res;
      console.log("Supabase response:", { data, error })

      if (error) {
        alert(`Failed to ${editingId ? 'update' : 'add'} branch: ` + error.message)
      } else if (data && data.length > 0) {
        if (editingId) {
            setBranches(prev => prev.map(b => b.id === editingId ? data[0] : b).sort((a,b) => a.name.localeCompare(b.name)))
        } else {
            setBranches(prev => [...prev, data[0]].sort((a,b) => a.name.localeCompare(b.name)))
        }
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
      } else {
        alert("Action completed, but no data was returned. Refresh to see changes.")
      }
    } catch (err) {
      console.error(err)
      alert("Unexpected error: " + (err instanceof Error ? err.message : "Unknown error"))
    } finally {
      setLoadingBranches(false)
    }
  }

  const openEditModal = (branch: Branch) => {
    setEditingId(branch.id)
    setFormData({
        name: branch.name || "",
        code: branch.code || "",
        full_address: branch.full_address || "",
        city: branch.city || "",
        state: branch.state || KERALA_DEFAULTS.state,
        state_code: branch.state_code || KERALA_DEFAULTS.state_code,
        pincode: branch.pincode || "",
        manager_name: branch.manager_name || "",
        phone: branch.phone || "",
        email: branch.email || "",
        gstin: branch.gstin || ""
    })
    setIsAddingBranch(true)
  }

  const openAddModal = () => {
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
    setIsAddingBranch(true)
  }


  const deleteBranch = async (id: string) => {
    if (!confirm("Are you sure you want to delete this branch?")) return
    const supabase = createClient()
    const { error } = await supabase.from("branches").delete().eq("id", id)
    if (error) alert("Failed: " + error.message)
    else setBranches(prev => prev.filter(b => b.id !== id))
  }

  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true)
      const supabase = createClient()
      const { data } = await supabase.from("branches").select("*").order("name")
      if (data) setBranches(data)
      setLoadingBranches(false)
    }

    const init = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("app_settings").select("key, value").in("key", ["logo_url", "company_name"])
      data?.forEach(row => {
        if (row.key === "logo_url" && row.value) setCurrentLogo(row.value)
        if (row.key === "company_name" && row.value) setCompanyName(row.value)
      })
      await fetchBranches()
    }
    init()
  }, [])

  const saveCompanyName = async () => {

    setSavingName(true)
    const supabase = createClient()
    await supabase.from("app_settings").upsert({ key: "company_name", value: companyName, updated_at: new Date().toISOString() })
    setNameSaved(true)
    setSavingName(false)
    setTimeout(() => setNameSaved(false), 3000)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#001529]">Admin Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure company branding and regional branch registry.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          {/* Company Name */}
          <Card className="card-elevated border-l-4 border-l-[#7FD1E3]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#7FD1E3]" /> Company Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Display Name</Label>
                <Input
                  value={companyName}
                  onChange={e => { setCompanyName(e.target.value); setNameSaved(false) }}
                />
              </div>
              <Button
                onClick={saveCompanyName}
                disabled={savingName}
                className="w-full bg-[#001529] hover:bg-[#002a52] text-white gap-1.5"
              >
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : nameSaved ? <CheckCircle2 className="h-4 w-4" /> : <Type className="h-4 w-4" />}
                {nameSaved ? "Saved!" : "Save Name"}
              </Button>
            </CardContent>
          </Card>

          {/* Logo Uploader */}
          <LogoUploader currentLogoUrl={currentLogo} onSuccess={setCurrentLogo} />
        </div>

        <div className="md:col-span-2">
          {/* Branch Management */}
          <Card className="card-elevated">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Branch Registry
                </CardTitle>
                <CardDescription className="text-xs">
                  Centralized registry for all Kerala branches.
                </CardDescription>
              </div>
              
              <Dialog open={isAddingBranch} onOpenChange={setIsAddingBranch}>
                <DialogTrigger render={<Button size="sm" className="bg-primary gap-1.5" onClick={openAddModal} />}>
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
                        <Label>Branch Code*</Label>
                        <Input placeholder="e.g., BR001" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
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
                    <Button variant="outline" onClick={() => setIsAddingBranch(false)} disabled={loadingBranches}>Cancel</Button>
                    <Button onClick={handleSaveBranch} disabled={loadingBranches}>
                      {loadingBranches ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : editingId ? "Save Changes" : "Create Branch"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md divide-y overflow-hidden bg-white">
                {loadingBranches ? (
                  <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
                ) : branches.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No branches found. Click &apos;New Branch&apos; to begin.</div>
                ) : (
                  <div className="grid grid-cols-1 divide-y">
                    {branches.map(branch => (
                      <div key={branch.id} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded bg-slate-100 text-[#001529]">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{branch.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono">{branch.code}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {branch.city}, {branch.state} • {branch.gstin || 'No GST'}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-blue-600 opacity-0 group-hover:opacity-100"
                            onClick={() => openEditModal(branch)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                            onClick={() => deleteBranch(branch.id)}
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
        </div>
      </div>
    </div>
  )
}

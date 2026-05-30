"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building2, Save, Loader2, CheckCircle2, Paintbrush } from "lucide-react"
import { useState, useEffect } from "react"
import { getCompanySettings, updateCompanySettings } from "@/app/actions/settings"

export function BrandingTab() {
  const [formData, setFormData] = useState({
    company_name: "",
    logo_url: "",
    primary_color: "#001529",
    support_email: "",
    billing_address: ""
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { success, data } = await getCompanySettings()
        if (success && data) {
          setFormData({
            company_name: data.company_name || "",
            logo_url: data.logo_url || "",
            primary_color: data.primary_color || "#001529",
            support_email: data.support_email || "",
            billing_address: data.billing_address || ""
          })
        }
      } catch (error) {
        console.error("Failed to load settings:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setSaveSuccess(false)
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, primary_color: e.target.value }))
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const res = await updateCompanySettings(formData)
      if (res.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        alert(res.error || "Failed to save settings.")
      }
    } catch (error) {
      console.error(error)
      alert("An unexpected error occurred.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Brand Identity Form */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-slate-50/10 transition-all duration-300">
        <CardHeader className="bg-white border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
            <Building2 className="h-4 w-4 text-[#001529]" /> Company Identity
          </CardTitle>
          <CardDescription className="text-xs">Configure the core business details.</CardDescription>
        </CardHeader>
        <CardContent className="pt-8 px-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase font-black tracking-widest text-slate-400">Company Name</Label>
            <Input
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              placeholder="e.g. Acme Corp"
              className="h-12 border-slate-200 focus-visible:ring-[#001529] font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase font-black tracking-widest text-slate-400">Support Email</Label>
            <Input
              name="support_email"
              type="email"
              value={formData.support_email}
              onChange={handleChange}
              placeholder="support@example.com"
              className="h-12 border-slate-200 focus-visible:ring-[#001529] font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase font-black tracking-widest text-slate-400">Billing Address</Label>
            <Textarea
              name="billing_address"
              value={formData.billing_address}
              onChange={handleChange}
              placeholder="123 Business Rd..."
              className="min-h-[100px] border-slate-200 focus-visible:ring-[#001529] font-medium resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Visual Identity Form */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-slate-50/10 transition-all duration-300 flex flex-col">
        <CardHeader className="bg-white border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
            <Paintbrush className="h-4 w-4 text-emerald-600" /> Visual Assets
          </CardTitle>
          <CardDescription className="text-xs">Manage logos and brand colors.</CardDescription>
        </CardHeader>
        <CardContent className="pt-8 px-8 space-y-6 flex-1 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-black tracking-widest text-slate-400">Logo URL</Label>
              <Input
                name="logo_url"
                value={formData.logo_url}
                onChange={handleChange}
                placeholder="https://.../logo.png"
                className="h-12 border-slate-200 focus-visible:ring-[#001529] font-medium"
              />
              {formData.logo_url && (
                <div className="mt-4 p-4 border rounded-xl flex items-center justify-center bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.logo_url} alt="Logo Preview" className="max-h-20 object-contain" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase font-black tracking-widest text-slate-400">Primary Brand Color</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 shadow-sm shrink-0 cursor-pointer border-slate-200">
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleColorChange}
                    className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer"
                  />
                </div>
                <Input
                  name="primary_color"
                  value={formData.primary_color}
                  onChange={handleChange}
                  className="h-12 font-mono uppercase font-bold text-slate-600 border-slate-200 focus-visible:ring-[#001529]"
                />
              </div>
            </div>
          </div>
          
          <div className="pt-6 pb-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.company_name}
              className="w-full bg-[#001529] hover:bg-[#002a52] text-white gap-2 font-bold h-12 rounded-xl shadow-md transition-all duration-300"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveSuccess ? "Settings Saved" : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
    </div>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building2, Save, Loader2, CheckCircle2, Paintbrush, Upload, ImageIcon, X } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { getCompanySettings, updateCompanySettings } from "@/app/actions/settings"
import { uploadLogo } from "@/actions/branding"
import { useBranding } from "@/providers/GlobalBrandingProvider"
import Image from "next/image"

export function BrandingTab() {
  const { logoUrl: contextLogoUrl } = useBranding()

  const [formData, setFormData] = useState({
    company_name: "",
    primary_color: "#001529",
    support_email: "",
    billing_address: ""
  })
  
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>("")
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isLogoUploading, setIsLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoSuccess, setLogoSuccess] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { success, data } = await getCompanySettings()
        if (success && data) {
          setFormData({
            company_name: data.company_name || "",
            primary_color: data.primary_color || "#001529",
            support_email: data.support_email || "",
            billing_address: data.billing_address || ""
          })
          setCurrentLogoUrl(data.logo_url || "")
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

  const handleFileSelect = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setLogoError("Only image files are supported.")
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setLogoError("File must be under 5MB.")
      return
    }
    setLogoFile(f)
    setLogoError(null)
    setLogoSuccess(false)
    const reader = new FileReader()
    reader.onload = (e) => setLogoPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [])

  const handleLogoUpload = async () => {
    if (!logoFile) return
    setIsLogoUploading(true)
    setLogoError(null)
    setLogoSuccess(false)
    try {
      const fd = new FormData()
      fd.append("logo", logoFile)
      const result = await uploadLogo(fd)
      setCurrentLogoUrl(result.url)
      setLogoPreview(null)
      setLogoFile(null)
      setLogoSuccess(true)
      setTimeout(() => setLogoSuccess(false), 3000)
    } catch (err) {
      setLogoError((err as Error).message || "Upload failed. Please try again.")
    } finally {
      setIsLogoUploading(false)
    }
  }

  const displayLogo = logoPreview || currentLogoUrl || contextLogoUrl || ""

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

          <div className="pt-2">
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

      {/* Visual Identity — Logo Upload + Brand Color */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-slate-50/10 transition-all duration-300 flex flex-col">
        <CardHeader className="bg-white border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
            <Paintbrush className="h-4 w-4 text-emerald-600" /> Visual Assets
          </CardTitle>
          <CardDescription className="text-xs">Upload your logo and set the brand color.</CardDescription>
        </CardHeader>
        <CardContent className="pt-8 px-8 space-y-6 flex-1 flex flex-col justify-between">
          <div className="space-y-6">

            {/* ── Logo Upload ── */}
            <div className="space-y-3">
              <Label className="text-xs uppercase font-black tracking-widest text-slate-400">Company Logo</Label>

              {/* Current logo preview + click-to-upload */}
              <div
                className="relative group flex items-center gap-4 p-4 bg-[#001529] rounded-xl border border-[#002a52] cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <div className="relative h-16 w-16 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:ring-2 group-hover:ring-[#7FD1E3] transition-all">
                  {displayLogo ? (
                    <Image src={displayLogo} alt="Logo" fill className="object-contain p-1" key={displayLogo} />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  )}
                  {isLogoUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">
                    {isLogoUploading ? "Uploading…" : "Click to change logo"}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">PNG, JPG, SVG, WebP · max 5 MB</p>
                  {logoPreview && !isLogoUploading && (
                    <span className="text-xs text-amber-400 mt-1 block">Preview — not yet saved</span>
                  )}
                </div>
              </div>

              {/* Drag & Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all py-6 px-4 text-center ${
                  isDragging ? "border-[#7FD1E3] bg-[#7FD1E3]/5" : "border-slate-200 hover:border-[#7FD1E3] hover:bg-slate-50"
                }`}
              >
                <Upload className="h-5 w-5 text-slate-400" />
                <p className="text-xs font-medium text-slate-600">Drag & drop or click to browse</p>
                {logoFile && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {logoFile.name}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null) }}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Upload company logo"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
              />

              {/* Error / Success feedback */}
              {logoError && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{logoError}</p>
              )}
              {logoSuccess && (
                <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Logo updated successfully!
                </p>
              )}

              {/* Upload button — only shown when a file is staged */}
              {logoFile && (
                <Button
                  onClick={handleLogoUpload}
                  disabled={isLogoUploading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold h-11 rounded-xl transition-all"
                >
                  {isLogoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {isLogoUploading ? "Uploading to Cloud…" : "Upload Logo"}
                </Button>
              )}
            </div>

            {/* ── Primary Brand Color ── */}
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
        </CardContent>
      </Card>
      
    </div>
  )
}


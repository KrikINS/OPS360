"use client"

import { LogoUploader } from "@/components/logo-uploader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Type, Loader2, CheckCircle2 } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function BrandingPage() {
  const [companyName, setCompanyName] = useState("Ethan Home Appliances")
  const [savingName, setSavingName]   = useState(false)
  const [nameSaved, setNameSaved]     = useState(false)
  const [currentLogo, setCurrentLogo] = useState("/ethan-logo.png")

  useEffect(() => {
    supabase.from("app_settings").select("key, value").in("key", ["logo_url", "company_name"])
      .then(({ data }) => {
        data?.forEach(row => {
          if (row.key === "logo_url" && row.value) setCurrentLogo(row.value)
          if (row.key === "company_name" && row.value) setCompanyName(row.value)
        })
      })
  }, [])

  const saveCompanyName = async () => {
    setSavingName(true)
    await supabase.from("app_settings").upsert({ key: "company_name", value: companyName, updated_at: new Date().toISOString() })
    setNameSaved(true)
    setSavingName(false)
    setTimeout(() => setNameSaved(false), 3000)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Company Branding</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your company logo and name displayed across the ERP.</p>
      </div>

      {/* Company Name */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Type className="h-4 w-4 text-[#7FD1E3]" /> Company Name
          </CardTitle>
          <CardDescription className="text-xs">
            Displayed in the sidebar and page headers across the ERP.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Input
            value={companyName}
            onChange={e => { setCompanyName(e.target.value); setNameSaved(false) }}
            className="max-w-xs"
          />
          <Button
            onClick={saveCompanyName}
            disabled={savingName}
            className="bg-[#001529] hover:bg-[#002a52] text-white gap-1.5 shrink-0"
          >
            {savingName
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : nameSaved
              ? <CheckCircle2 className="h-4 w-4" />
              : <Type className="h-4 w-4" />
            }
            {nameSaved ? "Saved!" : "Save Name"}
          </Button>
        </CardContent>
      </Card>

      {/* Logo Uploader — LogoUploader already has its own Card with title */}
      <LogoUploader currentLogoUrl={currentLogo} onSuccess={setCurrentLogo} />
    </div>
  )
}

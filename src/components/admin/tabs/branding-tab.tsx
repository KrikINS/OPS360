"use client"

import { LogoUploader } from "@/components/logo-uploader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Type, Loader2, CheckCircle2, Building2 } from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"

export function BrandingTab() {
  const [companyName, setCompanyName] = useState("Ops360 Systems")
  const [savingName, setSavingName]   = useState(false)
  const [nameSaved, setNameSaved]     = useState(false)
  const [currentLogo, setCurrentLogo] = useState("/ethan-logo.png")

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("app_settings").select("key, value").in("key", ["logo_url", "company_name"])
      data?.forEach(row => {
        if (row.key === "logo_url" && row.value) setCurrentLogo(row.value)
        if (row.key === "company_name" && row.value) setCompanyName(row.value)
      })
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card className="card-elevated border-l-4 border-l-[#7FD1E3]">
        <CardHeader className="pb-3 text-center md:text-left">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#7FD1E3]" /> Company Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Display Name</Label>
            <Input
              value={companyName}
              onChange={e => { setCompanyName(e.target.value); setNameSaved(false) }}
              className="h-10"
            />
          </div>
          <Button
            onClick={saveCompanyName}
            disabled={savingName}
            className="w-full bg-[#001529] hover:bg-[#002a52] text-white gap-1.5 font-bold h-10 shadow-sm"
          >
            {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : nameSaved ? <CheckCircle2 className="h-4 w-4" /> : <Type className="h-4 w-4" />}
            {nameSaved ? "Saved!" : "Save Name"}
          </Button>
        </CardContent>
      </Card>

      <LogoUploader currentLogoUrl={currentLogo} onSuccess={setCurrentLogo} />
    </div>
  )
}

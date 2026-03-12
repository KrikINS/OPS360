"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Upload, CheckCircle2, ImageIcon, X } from "lucide-react"
import Image from "next/image"

interface LogoUploaderProps {
  currentLogoUrl?: string
  onSuccess?: (newUrl: string) => void
}

export function LogoUploader({ currentLogoUrl, onSuccess }: LogoUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Only image files are supported.")
      return
    }
    setFile(f)
    setError(null)
    setSuccess(false)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.append("logo", file)

    try {
      const res = await fetch("/api/admin/logo", { method: "POST", body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Upload failed")
      setSuccess(true)
      setPreview(null)
      setFile(null)
      onSuccess?.(json.url)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const displayLogo = preview || currentLogoUrl || "/ethan-logo.png"

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-[#7FD1E3]" />
          Company Logo
        </CardTitle>
        <CardDescription className="text-xs">
          Upload a new logo. It will immediately appear in the sidebar for all users. Recommended: PNG or SVG, minimum 128×128px.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current / Preview */}
        <div className="flex items-center gap-4 p-4 bg-[#001529] rounded-lg border border-[#002a52]">
          <div className="relative h-16 w-16 bg-white rounded-lg flex items-center justify-center shadow-sm overflow-hidden shrink-0">
            <Image
              src={displayLogo}
              alt="Company logo"
              fill
              className="object-contain p-1"
              key={displayLogo}
            />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Ethan Home Appliances</p>
            <p className="text-[#7FD1E3] text-xs font-medium uppercase tracking-widest">Ops360 ERP</p>
            {preview && (
              <span className="text-xs text-amber-400 mt-1 block">Preview — not yet saved</span>
            )}
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-all py-8 px-4 text-center
            ${dragging ? "border-[#7FD1E3] bg-[#e8f9fc]" : "border-border hover:border-[#7FD1E3] hover:bg-accent/30"}`}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Click to upload or drag & drop</p>
            <p className="text-xs text-muted-foreground">PNG, JPG, SVG, WebP — max 5MB</p>
          </div>
          {file && (
            <div className="flex items-center gap-2 text-xs text-[#5A9E78] font-medium mt-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {file.name}
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null) }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
        )}

        {success && (
          <p className="text-xs text-[#5A9E78] bg-green-50 px-3 py-2 rounded-md flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Logo updated successfully! Refresh the page to see it in the sidebar.
          </p>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full bg-[#001529] hover:bg-[#002a52] text-white"
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload New Logo"}
        </Button>
      </CardContent>
    </Card>
  )
}

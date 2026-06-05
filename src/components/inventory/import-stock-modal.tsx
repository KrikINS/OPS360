"use client"

import { useState, useRef } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download, Upload, FileSpreadsheet, CheckCircle2,
  AlertCircle, Loader2
} from 'lucide-react'

interface ImportStockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ImportStockModal({
  open, onOpenChange, onSuccess
}: ImportStockModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    imported?: number
    errors?: string[]
    errorCount?: number
    totalLandedCost?: number
    pricingUpdated?: number
    error?: string
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setResult(null)
    }
  }

  async function handleDownloadTemplate() {
    const res = await fetch('/api/inventory/template')
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'OPS360_Opening_Stock_Template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  async function handleUpload() {
    if (!file) return
    setIsUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/inventory/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      setResult(data)

      if (data.success && onSuccess) {
        onSuccess()
      }
    } catch {
      setResult({
        success: false,
        error: 'An unexpected error occurred',
      })
    } finally {
      setIsUploading(false)
    }
  }

  function handleClose() {
    setFile(null)
    setResult(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5
              text-green-600" />
            Import Opening Stock
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* Step 1: Download template */}
          <div className="p-4 bg-blue-50 border
            border-blue-200 rounded-xl space-y-2">
            <p className="text-sm font-semibold
              text-blue-800">
              Step 1: Download the template
            </p>
            <p className="text-xs text-blue-600">
              The template includes your current Product
              Master and Branch list as reference sheets.
              Fill in one row per inventory unit.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-2 text-blue-700
                border-blue-300 hover:bg-blue-100"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* Step 2: Upload filled template */}
          <div className="p-4 bg-slate-50 border
            border-slate-200 rounded-xl space-y-3">
            <p className="text-sm font-semibold
              text-slate-800">
              Step 2: Upload your completed file
            </p>
            <p className="text-xs text-slate-500">
              Accepts .xlsx and .csv files. Each row
              creates one inventory unit with the
              specified serial number.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Choose File
              </Button>
              {file && (
                <span className="text-sm text-slate-600">
                  {file.name}
                  <Badge variant="outline"
                    className="ml-2 text-xs">
                    {(file.size / 1024).toFixed(1)} KB
                  </Badge>
                </span>
              )}
            </div>
          </div>

          {/* Upload result */}
          {result && (
            <div className={`p-4 rounded-xl border ${
              result.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              {result.success ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2
                    text-green-800">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      Successfully imported{' '}
                      {result.imported} units
                    </span>
                  </div>
                  {result.totalLandedCost && (
                    <p className="text-xs text-green-700">
                      Total inventory value:{' '}
                      ₹{Number(result.totalLandedCost)
                        .toLocaleString('en-IN')}
                    </p>
                  )}
                  <p className="text-xs text-green-600">
                    Opening balance journal entries
                    have been posted automatically.
                  </p>
                  {result.pricingUpdated !== undefined && result.pricingUpdated > 0 && (
                    <p className="text-xs text-green-600">
                      {result.pricingUpdated} product(s) had dealer
                      pricing updated from import data.
                    </p>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50
                      border border-yellow-200 rounded
                      text-xs text-yellow-800">
                      <p className="font-semibold mb-1">
                        {result.errorCount} rows skipped:
                      </p>
                      <ul className="list-disc pl-4
                        space-y-0.5 max-h-32 overflow-y-auto">
                        {result.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2
                    text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      {result.error ?? 'Import failed'}
                    </span>
                  </div>
                  {result.errors && (
                    <ul className="list-disc pl-4
                      text-xs text-red-700 space-y-0.5
                      max-h-40 overflow-y-auto">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result?.success ? 'Done' : 'Cancel'}
          </Button>
          {!result?.success && (
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="bg-[#001529] hover:bg-[#002a52]
                text-white gap-2"
            >
              {isUploading
                ? <><Loader2 className="h-4 w-4
                    animate-spin" />Importing...</>
                : <><Upload className="h-4 w-4" />
                    Import Stock</>
              }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

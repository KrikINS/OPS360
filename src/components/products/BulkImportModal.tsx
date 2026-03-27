"use client"

import React, { useState, useRef } from "react"
import { 
  CloudUpload, 
  FileDown, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Table as TableIcon
} from "lucide-react"
import * as XLSX from "xlsx"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface BulkImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface ImportRow {
  Brand: string
  Category: string
  Model_Name: string
  EHA_Code: string
  Purchase_Price: number
  Selling_Price: number
  Description: string
  [key: string]: string | number | boolean | null | undefined
}

export function BulkImportModal({ open, onOpenChange, onSuccess }: BulkImportModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [data, setData] = useState<ImportRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const [results, setResults] = useState<{
    added: number;
    updated: number;
    failed: number;
    errors: { row: number; code: string; error: string }[];
  } | null>(null)

  const downloadTemplate = () => {
    const headers = ["Brand", "Category", "Model_Name", "EHA_Code", "Purchase_Price", "Selling_Price", "Description"]
    const csvContent = headers.join(",")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `EHA_Product_Import_Template.csv`)
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadErrorReport = () => {
    if (!results || results.errors.length === 0) return
    const ws = XLSX.utils.json_to_sheet(results.errors)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Import_Errors")
    XLSX.writeFile(wb, `EHA_Import_Errors_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".xlsx")) {
      setError("Please upload a .csv or .xlsx file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result
        const wb = XLSX.read(bstr, { type: "binary" })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const json = XLSX.utils.sheet_to_json(ws) as ImportRow[]
        
        if (json.length === 0) {
          setError("The file appears to be empty")
          return
        }

        // Sanitize data: Trim external spaces from all text fields
        const sanitizedData = json.map(row => {
          const newRow = { ...row }
          Object.keys(newRow).forEach(key => {
            if (typeof newRow[key] === 'string') {
              newRow[key] = (newRow[key] as string).trim()
            }
          })
          return newRow
        })

        setData(sanitizedData)
        setError(null)
      } catch (err) {
        console.error(err)
        setError("Failed to parse file. Ensure it follows the template.")
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleConfirmImport = async () => {
    setProcessing(true)
    try {
      const { data: result, error } = await supabase.rpc("import_products_bulk", {
        p_items: data,
        p_filename: `EHA_Bulk_Upload_${new Date().toISOString().split('T')[0]}.csv`
      })

      if (error) throw error
      
      const summary = result.summary || { added: 0, updated: 0, failed: 0 }
      const serverErrors = result.errors || []
      
      setResults({
        added: summary.added,
        updated: summary.updated,
        failed: summary.failed,
        errors: serverErrors
      })

      if (summary.failed === 0) {
        setTimeout(() => {
          onSuccess()
          onOpenChange(false)
          setData([])
          setResults(null)
        }, 1500)
      }
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : "Bulk import failed. Check console for details."
      setError(message)
    } finally {
      setProcessing(false)
    }
  }

  const isValidRow = (row: ImportRow) => {
    return row.Brand && row.Category && row.Model_Name && row.EHA_Code
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-none shadow-2xl rounded-2xl overflow-hidden p-0">
        <div className="bg-[#001529] p-6 text-white">
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <CloudUpload className="h-6 w-6 text-[#7FD1E3]" />
            Bulk Asset Onboarding
          </DialogTitle>
          <DialogDescription className="text-white/60 text-sm font-medium mt-1">
            Import multiple products directly into the Global Matrix Registry.
          </DialogDescription>
        </div>

        <div className="p-8 space-y-6">
          {results ? (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="text-center space-y-2">
                <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-100 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-black text-[#001529]">Import Protocol Complete</h3>
                <p className="text-slate-500 text-sm font-medium">The Global Registry has been synchronized with your data.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Added</p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">{results.added}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Updated</p>
                  <p className="text-3xl font-black text-blue-600 mt-1">{results.updated}</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Failed</p>
                  <p className="text-3xl font-black text-rose-600 mt-1">{results.failed}</p>
                </div>
              </div>

              {results.failed > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3 text-amber-800">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-xs font-black uppercase tracking-tight text-center">
                      Attention: {results.failed} rows failed due to data inconsistencies.
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={downloadErrorReport}
                    className="w-full border-amber-300 text-amber-900 hover:bg-amber-100 gap-2 font-black h-12 rounded-xl shadow-sm transition-all"
                  >
                    <FileDown className="h-5 w-5" />
                    DOWNLOAD DETAILED ERROR LOG
                  </Button>
                </div>
              )}

              {results.failed > 0 && (
                <Button 
                  onClick={() => {
                    setResults(null)
                    setData([])
                  }}
                  className="w-full bg-[#001529] hover:bg-[#002a52] text-white font-black h-12 rounded-xl shadow-xl transition-all"
                >
                  START NEW PROTOCOL
                </Button>
              )}
            </div>
          ) : data.length === 0 ? (
            <div className="space-y-4">
              <div 
                className={cn(
                  "border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-4 transition-all duration-300",
                  dragActive ? "border-[#001529] bg-slate-50 scale-[1.01]" : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <CloudUpload className="h-10 w-10 text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-slate-900 font-black text-lg">Drop your file here</p>
                  <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest">Supports .CSV, .XLSX</p>
                </div>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#001529] hover:bg-[#002a52] font-black h-12 px-8 rounded-xl shadow-xl mt-2"
                >
                  SELECT FILE FROM SYSTEM
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  title="Select File"
                  placeholder="Select File"
                  onChange={(e) => e.target.files && processFile(e.target.files[0])}
                  accept=".csv, .xlsx"
                />
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <TableIcon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Need the structure?</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Download the standard EHA Template</p>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  onClick={downloadTemplate}
                  className="border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 gap-2 font-black h-10 px-4 text-xs transition-all shadow-sm rounded-xl"
                >
                  <FileDown className="h-4 w-4" />
                  DOWNLOAD CSV TEMPLATE
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Data Staging: {data.length} Entries found
                </p>
                <Button 
                  variant="ghost" 
                  onClick={() => setData([])}
                  className="text-[10px] font-black uppercase text-slate-400 hover:text-rose-500 transition-colors"
                >
                  Clear & Re-upload
                </Button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-left font-black text-slate-400 tracking-wider text-[9px] uppercase border-r">Status</th>
                      <th className="py-3 px-4 text-left font-black text-slate-400 tracking-wider text-[9px] uppercase border-r">Model Name</th>
                      <th className="py-3 px-4 text-left font-black text-slate-400 tracking-wider text-[9px] uppercase border-r">Brand</th>
                      <th className="py-3 px-4 text-left font-black text-slate-400 tracking-wider text-[9px] uppercase">EHA Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.slice(0, 5).map((row, i) => {
                      const valid = isValidRow(row)
                      return (
                        <tr key={i} className={cn("transition-colors", !valid ? "bg-rose-50" : "bg-white")}>
                          <td className="py-2.5 px-4 font-bold">
                            {valid ? (
                              <span className="text-emerald-600 uppercase tracking-widest text-[8px]">Ready</span>
                            ) : (
                              <span className="text-rose-600 uppercase tracking-widest text-[8px] flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Missing Info
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 border-r">{row.Model_Name || row.model_name || "---"}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-600 border-r">{row.Brand || row.brand || "---"}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-500">{row.EHA_Code || row.eha_code || "---"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {data.length > 5 && (
                  <div className="bg-slate-50 p-2 text-center text-[10px] font-black text-slate-400 border-t border-slate-200 uppercase tracking-widest">
                    + {data.length - 5} additional rows in buffer
                  </div>
                )}
              </div>

              {data.some(r => !isValidRow(r)) && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-[10px] font-black uppercase tracking-tight">Warning: Detected incomplete records. These will cause database rejection.</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 animate-in shake-in duration-300">
              <AlertCircle className="h-5 w-5" />
              <p className="text-xs font-bold leading-tight">{error}</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto hover:bg-rose-100"
                onClick={() => setError(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {!results && (
          <DialogFooter className="bg-slate-50/50 p-6 border-t border-slate-100">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="font-black text-slate-500 uppercase tracking-widest h-12"
            >
              Cancel Protocol
            </Button>
            <Button 
              disabled={data.length === 0 || data.some(r => !isValidRow(r)) || processing}
              onClick={handleConfirmImport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 px-10 rounded-xl shadow-xl shadow-emerald-200 min-w-[200px]"
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  INITIATING UPSERT...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CloudUpload className="h-5 w-5" />
                  CONFIRM DEPLOYMENT ({data.length})
                </span>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
